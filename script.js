import JSZip from 'jszip';
import saveAs from 'file-saver';

const downloadBtn = document.getElementById('downloadBtn');

downloadBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    const projectFolderName = "websim-downloader-packager";
    const projectFolder = zip.folder(projectFolderName);

    // Add README.md
    projectFolder.file("README.md", `
# Websim Downloader & Packager

This Node.js Electron application allows you to fetch the client-side source code (HTML, CSS, JavaScript, assets referenced in the HTML) of any public 'websim' URL and package it into a standalone executable (.exe for Windows).

**Disclaimer:** Please ensure you have the necessary permissions to download and package the content from the target URL. Respect copyright and terms of service. This tool is for educational or legitimate archival purposes only.

## Features

*   Fetches HTML, CSS, JavaScript, and assets linked within the HTML.
*   Packages the downloaded client-side code into an Electron application.
*   Uses Electron Packager to create a distributable executable (.exe).

## Prerequisites

*   [Node.js](https://nodejs.org/) (version 16+ recommended, includes npm)
*   [Git](https://git-scm.com/) (optional, but recommended)

## Setup

1.  **Extract the zip file:** Unzip the downloaded \`${projectFolderName}.zip\` file.

2.  **Navigate to the project directory:**
    \`\`\`bash
    cd ${projectFolderName}
    \`\`\`

3.  **Install dependencies:** This command installs Electron, Electron Packager, and other necessary libraries.
    \`\`\`bash
    npm install
    \`\`\`
    *Note: This might take a few minutes, especially the first time.*

4.  **(Windows Only) Prepare Icon:** The packager needs an \`.ico\` file for the executable icon.
    *   An \`icon.svg\` is provided in the \`assets\` folder.
    *   **You must convert \`assets/icon.svg\` to \`assets/icon.ico\`**. You can use online converters (search for "svg to ico converter") or image editing software.
    *   Place the resulting \`icon.ico\` file inside the \`assets\` folder. If you skip this, packaging might fail or use a default icon.

## Usage

1.  **Run the Electron application:**
    \`\`\`bash
    npm start
    \`\`\`
    This will open the application window.

2.  **Enter the Websim URL:** In the application window, enter the full URL of the websim you want to download (e.g., \`https://example.com/my-websim/\`). Make sure it's a publicly accessible URL.

3.  **Choose an Output Directory:** Click the "Browse..." button and select a folder where the final packaged application (the folder containing the \`.exe\`) will be saved.

4.  **Click "Download & Package":** The application will now perform the following steps (status updates will appear in the app window):
    *   Fetch the HTML content from the URL.
    *   Parse the HTML to find links to CSS, JavaScript, images, etc.
    *   Download these assets.
    *   Modify the HTML to point to the downloaded local assets.
    *   Create a temporary Electron project structure.
    *   Inject the downloaded content and the modified HTML into this structure.
    *   Install Electron within the temporary structure (required by the packager).
    *   Use \`electron-packager\` to build the final executable for Windows (x64).

5.  **Find the Executable:** Once the process completes successfully, navigate to the output directory you selected in step 3. Inside, you should find a folder named something like \`packaged-websim-win32-x64\`. This folder contains your standalone \`.exe\` file and other necessary resources. Double-click the \`.exe\` to run the packaged websim.

## How it Works

1.  **Fetching (main.js):** Uses the \`axios\` library to download the initial HTML from the target URL. It then uses \`cheerio\` (a server-side jQuery-like library) to parse the HTML structure. It identifies \`<link href="...">\`, \`<script src="...">\`, and \`<img src="...">\` tags (and potentially others). For each asset found, it resolves its full URL (handling relative paths like \`/css/style.css\` or \`../images/logo.png\`) and downloads it using \`axios\`.
2.  **Local Path Rewriting (main.js):** As assets are downloaded, the corresponding \`href\` or \`src\` attributes in the HTML are modified to point to the local file path within the package (e.g., \`downloaded_assets/style.css\`).
3.  **Temporary Electron Project Creation (main.js):** A temporary folder is created. Inside it, a basic Electron project is scaffolded:
    *   The modified HTML is saved as \`index.html\`.
    *   Downloaded assets are placed in a \`downloaded_assets\` subfolder.
    *   A minimal \`main.js\` (the Electron main process script for the *packaged* app) is created. This script simply creates a browser window and loads the local \`index.html\`.
    *   A minimal \`package.json\` defining the packaged app's structure and Electron dependency is created.
4.  **Dependency Installation for Package (main.js):** Critically, \`npm install\` is run *inside the temporary project directory*. This installs Electron there, which \`electron-packager\` needs to bundle.
5.  **Packaging (main.js):** The Node.js \`child_process.exec\` function is used to run the \`electron-packager\` command. This command takes the temporary project directory as input and builds the distributable application (including the Node.js runtime, Electron framework, and all the downloaded websim code/assets) into the specified output directory.
6.  **Interface (index.html, renderer.js, preload.js):** The user interface you interact with is also an Electron app.
    *   \`index.html\`: Defines the layout (URL input, directory selection, button, status area).
    *   \`renderer.js\`: Handles button clicks, calls backend functions via the preload script, and updates the status area.
    *   \`preload.js\`: Securely exposes specific Node.js/Electron functions (defined in \`main.js\` via \`ipcMain.handle\`) to the renderer process (\`renderer.js\`) using \`contextBridge\`. This is the secure way to communicate between the frontend UI and the backend Node.js capabilities in modern Electron.

## Important Considerations & Limitations

*   **Dynamic Content:** This tool primarily captures the *static* client-side code as served by the web server *at the time of download*. It might not capture content loaded dynamically via JavaScript after the initial page load, especially if that content relies on complex API interactions or server-side logic that cannot be replicated offline. The packaged app runs the downloaded JavaScript, but if that JS tries to fetch data from its original server, it will likely fail.
*   **Complex SPAs:** Single Page Applications (SPAs) built with frameworks like React, Angular, or Vue might be difficult to package correctly. Their routing, state management, and build processes often rely on server interaction or specific configurations not easily replicated by simple asset downloading.
*   **Server-Side Dependencies:** The packaged application will *only* contain the client-side code. Any functionality that requires communication with the original web server (e.g., fetching data from an API, user authentication, database interactions) will **not** work in the offline packaged version unless the original websim was designed to be fully functional offline.
*   **Path Issues:** While the tool attempts to handle relative paths for common assets (CSS, JS, images), complex cases (e.g., paths generated dynamically in JS, paths within CSS \`url()\`) might not be rewritten correctly, leading to broken styles or images in the packaged app.
*   **Asset Discovery:** The current implementation only looks for assets in specific tags (\`link[rel=stylesheet]\`, \`script[src]\`, \`img[src]\`). Assets loaded via other means (e.g., JavaScript fetch, CSS \`@import\`, inline styles with \`url()\`) might not be downloaded.
*   **Cross-Origin Resources:** The Node.js backend fetch can download resources from different domains, bypassing browser CORS limitations that would apply if fetching directly from the renderer.
*   **Build Size:** Including all assets can significantly increase the size of the final executable. Electron itself adds a considerable base size (~100MB+).
*   **Security (\`webSecurity: false\`):** The packaged app's \`main.js\` includes \`webSecurity: false\`. This is often necessary to allow the local \`index.html\` file to load other local resources (\`file://...\`) like the downloaded assets. However, **disabling web security can have security implications** if the downloaded code itself contains vulnerabilities or attempts malicious actions. Use with caution and only package trusted content.

## Development (Contributing)

1.  Fork the repository.
2.  Create a new branch (\`git checkout -b feature/your-feature\`).
3.  Make your changes.
4.  Install development dependencies if needed (\`npm install --save-dev <package>\`).
5.  Test thoroughly (\`npm start\` to run the downloader app).
6.  Commit your changes (\`git commit -am 'Add some feature'\`).
7.  Push to the branch (\`git push origin feature/your-feature\`).
8.  Create a new Pull Request.

## License

MIT License (See LICENSE file)
    `);

    // Add LICENSE file (MIT License example)
    projectFolder.file("LICENSE", `
MIT License

Copyright (c) ${new Date().getFullYear()} AI Project Generator

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`);

    // Add package.json
    projectFolder.file("package.json", `{
  "name": "websim-downloader-packager",
  "version": "1.0.0",
  "description": "Fetches and packages websim client code into an Electron executable.",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "package-win": "electron-packager . packaged-websim --platform=win32 --arch=x64 --out=dist/ --overwrite --icon=assets/icon.ico --ignore=\\"^/dist$\\" --ignore=\\"^/temp-.*\\" --ignore=\\"^/node_modules/.*/(test|example|demo|benchmark)\\" --ignore=\\"^/\\\\.git$\\"",
    "postinstall": "electron-builder install-app-deps"
  },
  "keywords": [
    "electron",
    "websim",
    "downloader",
    "packager",
    "archive"
  ],
  "author": "AI Generated",
  "license": "MIT",
  "devDependencies": {
    "electron": "^28.2.3",
    "electron-builder": "^24.9.1",
    "electron-packager": "^17.1.2"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "cheerio": "^1.0.0-rc.12",
    "fs-extra": "^11.2.0"
  }
}`);

    // Add main.js (Electron main process)
    projectFolder.file("main.js", `
const { app, BrowserWindow, ipcMain, dialog } = require('electron'); 
const path = require('path');
const fs = require('fs-extra'); 
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url'); 
const { exec } = require('child_process'); 

let mainWindow;

const PACKAGED_APP_NAME = 'packaged-websim'; 
const PACKAGED_ASSETS_DIR = 'downloaded_assets'; 

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 850, 
        height: 650, 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, 
            nodeIntegration: false, 
            spellcheck: false, 
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

function sendStatus(window, message) {
    if (window && !window.isDestroyed() && window.webContents) {
       try {
           console.log(\`[Status] \${message}\`); 
           window.webContents.send('status-update', message);
       } catch (e) {
          console.error("Failed to send status update:", e);
       }
    }
}

async function downloadAsset(assetUrl, localPath) {
    try {
        const response = await axios.get(assetUrl.href, {
            responseType: 'arraybuffer',
            timeout: 15000, 
             headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36' 
            }
        });
        await fs.writeFile(localPath, Buffer.from(response.data));
        return true; 
    } catch (err) {
        console.error(\`Failed to download asset: \${assetUrl.href} - \${err.message}\`); 
        sendStatus(mainWindow, \`Warning: Failed to download \${path.basename(assetUrl.pathname)} (\${err.code || err.message})\`); 
        return false; 
    }
}

ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Output Directory for Packaged App',
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        sendStatus(mainWindow, 'Directory selection cancelled.');
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('download-and-package', async (event, targetUrl, outputDirUserSelected) => {
    if (!targetUrl || !outputDirUserSelected) {
        throw new Error("Missing URL or Output Directory.");
    }
    let tempBuildDir; 

    try {
        tempBuildDir = path.join(app.getPath('temp'), \`websim-build-\${Date.now()}\`); 
        const appContentDir = path.join(tempBuildDir, 'app'); 
        const assetsDownloadDir = path.join(appContentDir, PACKAGED_ASSETS_DIR);

        sendStatus(mainWindow, \`Using temporary build directory: \${tempBuildDir}\`); 
        await fs.ensureDir(appContentDir);
        await fs.ensureDir(assetsDownloadDir);

        sendStatus(mainWindow, \`Fetching HTML from: \${targetUrl}\`); 
        let response;
        try {
             response = await axios.get(targetUrl, {
                responseType: 'text',
                timeout: 20000, 
                 headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36' }
             });
        } catch(htmlError) {
             throw new Error(\`Failed to fetch base HTML: \${htmlError.message}\`); 
        }

        const htmlContent = response.data;
        const baseUrl = new URL(targetUrl); 

        sendStatus(mainWindow, 'Parsing HTML and identifying assets...');
        const $ = cheerio.load(htmlContent);
        const downloadTasks = [];
        const assetMap = new Map(); 
        let assetCounter = 0;

        $('link[rel="stylesheet"][href], script[src], img[src], source[src], track[src], video[poster]').each((index, element) => {
            const $el = $(element);
            let srcAttr = 'href'; 
            if ($el.is('script') || $el.is('img') || $el.is('source') || $el.is('track') ) {
                srcAttr = 'src';
            } else if ($el.is('video[poster]')) {
                 srcAttr = 'poster';
            }

            const originalUrlStr = $el.attr(srcAttr);
            if (!originalUrlStr || originalUrlStr.startsWith('data:')) { 
                 return;
            }

            try {
                const assetUrl = new URL(originalUrlStr, baseUrl.href); 

                let filename = path.basename(assetUrl.pathname);
                 filename = filename.split('?')[0].split('#')[0];
                 filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || \`asset_\${assetCounter++}\${path.extname(assetUrl.pathname) || '.dat'}\`; 


                const localPath = path.join(assetsDownloadDir, filename);
                const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\\\/g, '/'); 

                if (!assetMap.has(assetUrl.href)) {
                     assetMap.set(assetUrl.href, relativePathForHtml); 
                     sendStatus(mainWindow, \`Queueing download: \${filename} (from \${assetUrl.origin})\`); 
                    downloadTasks.push(
                         downloadAsset(assetUrl, localPath).then(success => {
                             if (success) {
                                 $el.attr(srcAttr, relativePathForHtml);
                             } else {
                                $el.remove(); 
                             }
                         })
                    );
                } else {
                     $el.attr(srcAttr, assetMap.get(assetUrl.href));
                }

            } catch (urlError) {
               console.error(\`Skipping invalid URL: '\${originalUrlStr}' - \${urlError.message}\`); 
               sendStatus(mainWindow, \`Warning: Skipping invalid URL '\${originalUrlStr}'\`); 
            }
        });

        sendStatus(mainWindow, \`Found \${assetMap.size} unique assets to download. Starting downloads...\`); 
        await Promise.all(downloadTasks); 
        sendStatus(mainWindow, 'Asset download process finished.');

        const finalHtmlContent = $.html();
        await fs.writeFile(path.join(appContentDir, 'index.html'), finalHtmlContent);
        sendStatus(mainWindow, 'Modified HTML saved.');

        sendStatus(mainWindow, 'Creating boilerplate for packaged app...');
        const packageMainJsContent = \`
            const { app, BrowserWindow } = require('electron');
            const path = require('path');

            function createWindow () {
                const mainWindow = new BrowserWindow({
                    width: 1280, 
                    height: 800,
                    webPreferences: {
                        nodeIntegration: false, 
                        contextIsolation: true, 
                        webSecurity: false, // Note: Security implications
                    },
                    autoHideMenuBar: true,
                });

                mainWindow.loadFile(path.join(__dirname, 'index.html'));

            }

            app.whenReady().then(createWindow);

            app.on('window-all-closed', () => {
                if (process.platform !== 'darwin') {
                    app.quit();
                }
            });

            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    createWindow();
                }
            });
        \`;
        await fs.writeFile(path.join(appContentDir, 'main.js'), packageMainJsContent);

        // Get electron version from the *downloader's* package.json
        let electronVersion;
        try {
            const ownPackageJson = require('./package.json');
            electronVersion = ownPackageJson.devDependencies.electron;
            if (!electronVersion) throw new Error('Electron version not found in devDependencies.');
             sendStatus(mainWindow, \`Using Electron version: \${electronVersion}\`); 
        } catch (e) {
            console.error("Failed to read own package.json for Electron version:", e);
            sendStatus(mainWindow, "Warning: Could not determine Electron version. Using default 'latest'.");
            electronVersion = "latest"; 
        }


        const packageJsonContent = JSON.stringify({
            name: PACKAGED_APP_NAME.toLowerCase().replace(/\\s+/g, '-'), 
            version: "1.0.0",
            description: \`Packaged version of \${baseUrl.host}\`, 
            main: "main.js",
            author: "Websim Packager",
            license: "UNLICENSED", 
            dependencies: {
                "electron": electronVersion
            },
            devDependencies: {
            }
        }, null, 2); 
        await fs.writeFile(path.join(appContentDir, 'package.json'), packageJsonContent);


        sendStatus(mainWindow, 'Installing dependencies for the packaged app (this may take a moment)...');
        await new Promise((resolve, reject) => {
            const installCommand = 'npm install --omit=dev --ignore-scripts --prefer-offline --no-audit --progress=false'; 
            exec(installCommand, { cwd: appContentDir, timeout: 180000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error(\`Packaged app 'npm install' error: \${error.message}\`); 
                    console.error(\`stderr: \${stderr}\`); 
                    sendStatus(mainWindow, \`Error installing dependencies for package: \${stderr || error.message}\`); 
                    return reject(new Error(\`npm install failed in temp directory: \${stderr || error.message}\`)); 
                }
                 // Log warnings from stderr as well
                 if (stderr) {
                     console.warn(\`Packaged app 'npm install' stderr (warnings):\\n\${stderr}\`); 
                     sendStatus(mainWindow, \`Dependency installation completed with warnings (see console).\`); 
                 } else {
                    sendStatus(mainWindow, 'Packaged app dependencies installed successfully.');
                 }
                resolve();
            });
        });

        sendStatus(mainWindow, 'Starting application packaging (electron-packager)...');
        await fs.ensureDir(outputDirUserSelected);

        const iconPath = path.resolve(__dirname, 'assets', 'icon.ico'); 

        const ignoreArgs = [
             "--ignore='/node_modules/electron($|/)'", 
             "--ignore='/node_modules/electron-packager($|/)'", 
             "--ignore='/\\.git($|/)'", 
             "--ignore='/dist($|/)'", 
             "--ignore=/temp-build-.*"
        ];
        const ignoreString = ignoreArgs.join(" "); 


        let iconArg = '';
        try {
            const iconExists = await fs.pathExists(iconPath);
            if (iconExists) {
                 iconArg = \`--icon="\${iconPath.replace(/\\\\/g, '/')}"\`; 
                 sendStatus(mainWindow, \`Using icon: \${iconPath}\`); 
             } else {
                  sendStatus(mainWindow, \`Warning: Icon file not found at \${iconPath}. Using default icon.\`); 
             }
        } catch(iconError) {
             sendStatus(mainWindow, \`Warning: Error checking for icon file: \${iconError.message}\`); 
        }


        const finalAppName = PACKAGED_APP_NAME;
        const finalOutputDir = outputDirUserSelected.replace(/\\/g, '/'); 
        const packagerCommand = `npx electron-packager . "${finalAppName}" --platform=win32 --arch=x64 --out="${finalOutputDir}" --overwrite ${iconArg} ${ignoreString}`; 
        sendStatus(mainWindow, `Executing: ${packagerCommand}`); 

        await new Promise((resolve, reject) => {
            exec(packagerCommand, { cwd: appContentDir, timeout: 600000 }, (error, stdout, stderr) => { 
                if (error) {
                    console.error(\`electron-packager execution error: \${error.message}\`); 
                    console.error(\`stderr: \${stderr}\`); 
                    let errorDetail = stderr || error.message;
                    if (errorDetail.includes("EACCES")) {
                        errorDetail = "Permission denied. Try running the command with sudo or check file/folder permissions.";
                    } else if (errorDetail.includes("ENOENT")) {
                         errorDetail = "Command not found (ENOENT). Ensure npx and electron-packager are correctly installed/accessible.";
                    } else if (errorDetail.includes("Syntax error")) {
                         errorDetail = \`Shell syntax error during packaging: \${errorDetail}\`;
                    }
                    sendStatus(mainWindow, \`Packaging failed: \${errorDetail}\`); 
                    return reject(new Error(\`electron-packager command failed: \${errorDetail}\`)); 
                }
                console.log(\`electron-packager stdout: \${stdout}\`); 
                 if (stderr) {
                     console.warn(\`electron-packager stderr (warnings):\\n\${stderr}\`); 
                     sendStatus(mainWindow, \`Packaging finished with warnings (see console for details).\`); 
                 } else {
                    sendStatus(mainWindow, 'Application packaging successful!');
                 }
                resolve();
            });
        });

        const finalOutputPath = path.join(outputDirUserSelected, \`\${PACKAGED_APP_NAME}-win32-x64\`); 
        sendStatus(mainWindow, \`Packaging complete. Application saved to: \${finalOutputPath}\`); 
        return { success: true, outputDir: finalOutputPath };

    } catch (error) {
        console.error("Error during download/packaging process:", error);
        const errorMessage = error.message || "An unknown error occurred.";
        sendStatus(mainWindow, \`ERROR: \${errorMessage}\`); 
        console.error(error.stack);
        return { success: false, error: errorMessage }; 
    } finally {
        if (tempBuildDir) {
            try {
                 sendStatus(mainWindow, \`Cleaning up temporary directory: \${tempBuildDir}\`); 
                 await fs.remove(tempBuildDir);
                 sendStatus(mainWindow, 'Temporary directory cleaned up.');
            } catch (cleanupError) {
                console.error(\`Failed to clean up temporary directory \${tempBuildDir}: \${cleanupError.message}\`); 
                sendStatus(mainWindow, \`Warning: Could not fully clean up temporary directory: \${cleanupError.message}\`); 
            }
        }
        sendStatus(mainWindow, 'Process finished.');
    }
});

    `);

    // Add preload.js (Electron preload script)
    projectFolder.file("preload.js", `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('select-output-directory'),

    startPackaging: (url, outputDir) => ipcRenderer.invoke('download-and-package', url, outputDir),

    onStatusUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('status-update', subscription);
        // Return a function to unsubscribe
        return () => ipcRenderer.removeListener('status-update', subscription);
    },
});
    `);

    // Add index.html (Electron renderer process UI)
    projectFolder.file("index.html", `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <!-- Relax CSP slightly to allow inline styles and scripts for simplicity in this context -->
    <!-- A real-world app might use nonces or hashes -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
    <title>Websim Downloader & Packager</title>
    <style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --light-gray: #f8f9fa;
            --medium-gray: #e9ecef;
            --dark-gray: #343a40;
            --border-color: #ced4da;
            --success-color: #28a745;
            --error-color: #dc3545;
            --warning-color: #ffc107; 
            --info-color: #17a2b8; 
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            padding: 20px;
            background-color: var(--light-gray);
            margin: 0;
            font-size: 16px;
            line-height: 1.5;
            color: var(--dark-gray);
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
            overflow: hidden; 
        }
        .container {
            background-color: #fff;
            padding: 25px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            flex-shrink: 0; 
            margin-bottom: 20px;
        }
        h1 {
            color: var(--dark-gray);
            margin-top: 0;
            margin-bottom: 25px;
            font-size: 1.75rem;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
        }
        label {
            display: block;
            margin-bottom: 6px;
            color: #555;
            font-weight: 600;
        }
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 18px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box; 
            transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        input[type="url"]:focus, input[type="text"]:focus {
            border-color: var(--primary-color);
            outline: 0;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
         input[readonly] {
            background-color: var(--medium-gray);
            cursor: default;
         }
        button {
            padding: 10px 20px;
            margin-right: 10px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button#selectDirBtn {
            background-color: var(--secondary-color);
            color: white;
        }
        button#selectDirBtn:hover:not(:disabled) { 
            background-color: #5a6268;
            box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
        button#packageBtn {
            background-color: var(--primary-color);
            color: white;
        }
        button#packageBtn:hover:not(:disabled) { 
            background-color: #0056b3;
            box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
        button:disabled {
            background-color: #cccccc !important; 
            color: #666 !important;
            cursor: not-allowed;
            box-shadow: none !important;
            opacity: 0.65; 
        }
        .dir-selection {
            display: flex;
            align-items: center; 
            margin-bottom: 20px; 
        }
        .dir-selection input[type="text"] {
            flex-grow: 1; 
            margin: 0 10px 0 0; 
        }
        .status-container {
             flex-grow: 1; 
             display: flex; 
             flex-direction: column;
             min-height: 150px; 
        }
        #status {
            margin-top: 10px;
            padding: 15px;
            background-color: var(--medium-gray);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; 
            font-size: 0.875rem; 
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-y: auto; 
             flex-grow: 1; 
             border-top: 3px solid var(--secondary-color);
             line-height: 1.4;
             color: #333;
             max-height: 50vh; 
        }
         .status-label {
            font-weight: 600;
            color: #555;
            margin-bottom: 5px; 
            flex-shrink: 0; 
         }
        .status-line {
            margin-bottom: 3px; 
            padding: 2px 4px; 
            border-radius: 3px; 
        }
        .status-line.error {
            color: var(--error-color);
            font-weight: bold;
            background-color: #f8d7da; 
            border-left: 3px solid var(--error-color);
        }
        .status-line.warning {
            color: #856404; 
            background-color: #fff3cd; 
            border-left: 3px solid var(--warning-color); 
        }
        .status-line.success {
            color: var(--success-color);
            font-weight: bold;
            background-color: #d4edda; 
            border-left: 3px solid var(--success-color);
        }
         .status-line.info { 
             border-left: 3px solid var(--info-color);
             color: #0c5460; 
             background-color: #d1ecf1; 
         }
    </style>
</head>
<body>
    <div class="container">
        <h1>Websim Downloader & Packager</h1>

        <label for="urlInput">Websim URL:</label>
        <input type="url" id="urlInput" placeholder="https://example.com/my-simulation/" required>

        <label for="outputDirInput">Output Directory:</label>
        <div class="dir-selection">
            <input type="text" id="outputDirInput" placeholder="Click 'Browse...' to select save location" readonly required>
            <button id="selectDirBtn">Browse...</button>
        </div>

        <button id="packageBtn" disabled>Download & Package</button>
    </div>

    <div class="status-container">
         <label class="status-label" for="status">Status Log:</label>
        <div id="status">Enter a valid URL (e.g., https://...) and select an output directory.</div>
    </div>

    <script src="./renderer.js"></script>
</body>
</html>
    `);

    // Add renderer.js (Electron renderer process logic)
    projectFolder.file("renderer.js", `
if (!window.electronAPI) {
    console.error("FATAL: electronAPI not found on window. Preload script likely failed to execute or contextBridge is not working.");
    alert("Error: Cannot communicate with the backend process. The application might not work correctly. Check the console (View -> Toggle Developer Tools) for more details.");
} else {
    console.log('[Renderer] electronAPI found. Script loaded successfully.');
}

const urlInput = document.getElementById('urlInput');
const outputDirInput = document.getElementById('outputDirInput');
const selectDirBtn = document.getElementById('selectDirBtn');
const packageBtn = document.getElementById('packageBtn');
const statusDiv = document.getElementById('status');

let isProcessing = false;
let removeStatusListener = null; 

function addStatus(message, type = 'info') {
    console.log(\`[Status-\${type}] \${message}\`); 

    const line = document.createElement('div');
    line.classList.add('status-line');
    line.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`; 

    line.classList.add(type); 
    statusDiv.appendChild(line);
    statusDiv.scrollTop = statusDiv.scrollHeight; 
}

function clearStatus() {
    statusDiv.innerHTML = ''; 
    addStatus("Log cleared."); 
}

function setControlsEnabled(enabled) {
    isProcessing = !enabled;
    urlInput.disabled = !enabled;
    selectDirBtn.disabled = !enabled;
    packageBtn.disabled = !enabled || !isFormValid();

    if (isProcessing) {
        packageBtn.textContent = 'Processing...';
    } else {
        packageBtn.textContent = 'Download & Package';
    }
}

function isFormValid() {
    let isValid = true;
    const urlValue = urlInput.value.trim();
    const dirValue = outputDirInput.value.trim();

    if (!urlValue || !urlInput.checkValidity() || !urlValue.toLowerCase().startsWith('http')) {
         isValid = false;
    }

    if (!dirValue) {
        isValid = false;
    }

    return isValid;
}

selectDirBtn.addEventListener('click', async () => {
    if (!window.electronAPI?.selectDirectory) {
        addStatus("Error: Directory selection feature not available.", 'error');
        return;
    }
    addStatus('Opening directory selector...');
    setControlsEnabled(false); 
    try {
        const directoryPath = await window.electronAPI.selectDirectory();
        if (directoryPath) {
            outputDirInput.value = directoryPath; 
            addStatus(\`Output directory selected: \${directoryPath}\`, 'info');
            if (isFormValid()) {
                packageBtn.disabled = isProcessing;
            }
        } else {
             addStatus('Directory selection cancelled.', 'warning');
        }
    } catch (error) {
        console.error('Error selecting directory via IPC:', error);
        addStatus(\`Error selecting directory: \${error.message || 'Unknown error'}\`, 'error');
    } finally {
         setControlsEnabled(true); 
    }
});

packageBtn.addEventListener('click', async () => {
    if (!isFormValid() || isProcessing) {
        addStatus("Please ensure a valid URL (starting with http/https) is entered and an output directory is selected.", "warning");
        return; 
    }
    if (!window.electronAPI?.startPackaging) {
         addStatus("Error: Packaging feature not available.", 'error');
         return;
    }

    const targetUrl = urlInput.value.trim();
    const outputDir = outputDirInput.value.trim();

    clearStatus(); 
    addStatus(\`Starting download and packaging for: \${targetUrl}\`, 'info');
    setControlsEnabled(false); 

    try {
        const result = await window.electronAPI.startPackaging(targetUrl, outputDir);

        if (result && result.success) {
            addStatus(\`------------------------------------------\`, 'success');
            addStatus(\`SUCCESS! Application packaged successfully.\`, 'success');
            addStatus(\`Output Location: \${result.outputDir}\`, 'success');
            addStatus(\`------------------------------------------\`, 'success');
        } else {
             addStatus(\`------------------------------------------\`, 'error');
             addStatus(\`FAILURE: Process encountered an error.\`, 'error');
             addStatus(\`Error details: \${result?.error || 'Unknown error during packaging.'}\`, 'error');
             addStatus(\`------------------------------------------\`, 'error');
        }
    } catch (error) {
        console.error('IPC invocation error (startPackaging):', error);
        addStatus(\`------------------------------------------\`, 'error');
        addStatus(\`CRITICAL RENDERER ERROR: Failed to communicate with backend: \${error.message || 'Unknown IPC error'}\`, 'error');
        addStatus(\`------------------------------------------\`, 'error');
    } finally {
        setControlsEnabled(true); 
    }
});

urlInput.addEventListener('input', () => {
    packageBtn.disabled = !isFormValid() || isProcessing;
});
urlInput.addEventListener('blur', () => {
    packageBtn.disabled = !isFormValid() || isProcessing;
}); 

if (window.electronAPI && typeof window.electronAPI.onStatusUpdate === 'function') {
    try {
        removeStatusListener = window.electronAPI.onStatusUpdate((message) => {
             let type = 'info'; 
             message = String(message || ''); 

             if (message.startsWith('ERROR:')) {
                 type = 'error';
                 message = message.substring(6).trim(); 
             } else if (message.startsWith('Warning:')) {
                 type = 'warning';
                 message = message.substring(8).trim(); 
             } else if (message.includes('successful!') || message.includes('SUCCESS') || message.includes('complete.')) {
                 type = 'success';
              } else if (message.includes('failed') || message.includes('FAILURE')) {
                  type = 'error';
              }
              addStatus(message, type);
        });
        console.log("[Renderer] Status update listener registered successfully.");

        window.addEventListener('beforeunload', () => {
            if (removeStatusListener) {
                console.log("[Renderer] Cleaning up status update listener.");
                removeStatusListener(); 
                removeStatusListener = null; 
            }
        });

    } catch (error) {
         console.error("[Renderer] Error setting up status update listener:", error);
         addStatus("Error: Failed to set up status updates from backend.", 'error');
    }
} else {
    console.error("[Renderer] ERROR: window.electronAPI.onStatusUpdate is not available. Status updates will not be received.");
    addStatus("Error: Cannot receive status updates from backend (API not found).", 'error');
}

packageBtn.disabled = true;
    `);

    // --- Assets ---
    const assetsFolder = projectFolder.folder("assets");

    const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007bff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="18" ry="18" fill="url(#grad1)"/>
  <path d="M 25,75 V 35 Q 25,25 35,25 H 65 Q 75,25 75,35 V 50 H 60 V 35 Q 60,30 55,30 H 40 Q 35,30 35,35 V 75 H 25 Z M 45,75 V 50 H 75 V 65 Q 75,70 70,70 H 55 Q 45,70 45,75 Z" fill="#ffffff"/>
</svg>`;
    assetsFolder.file("icon.svg", svgIcon);

    projectFolder.file(".gitignore", `# Node.js Modules
node_modules/

# Packaged Application Output (electron-packager / electron-builder)
dist/
out/
release/
build/
*.exe
*.dmg
*.pkg
*.app
*.deb
*.rpm
*.snap
*.AppImage
*-win32-x64/
*-darwin-x64/
*-linux-x64/

# Build Artifacts & Temporary Files
*.o
*.obj
*.dylib
*.dll
*.so
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.npm/
*.zip
*.tar.gz
*.tgz

# Temporary Directories Used by This App
temp-*
websim-build-*

# OS Generated Files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE / Editor Specific
.idea/
.vscode/
*.swp
*~
`);

    downloadBtn.textContent = 'Generating Zip...';
    downloadBtn.disabled = true;

    try {
        const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9 
            },
            comment: `Generated Electron project for websim downloading/packaging on ${new Date().toISOString()}`
        });
        saveAs(content, `${projectFolderName}.zip`);
        downloadBtn.textContent = 'Download Project (.zip)';
        downloadBtn.disabled = false;
    } catch(err) {
        console.error("Error generating zip file:", err);
        alert("Failed to generate the project zip file. See console for details.");
        downloadBtn.textContent = 'Error - Try Again?';
        downloadBtn.disabled = false;
    }
});