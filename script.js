import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const downloadBtn = document.getElementById('downloadBtn');

downloadBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    const projectFolderName = "websim-downloader-packager";
    const projectFolder = zip.folder(projectFolderName);

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
*   **Asset Discovery:** The current implementation only looks for assets in specific tags (\`link[rel=stylesheet]\`, \`script[src]\`, \`img[src]\`, \`source[src]\`, \`track[src]\`, \`video[poster]\`). Assets loaded via other means (e.g., JavaScript fetch, CSS \`@import\`, inline styles with \`url()\`) might not be downloaded.
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

    const ignorePatterns = [
        "^/dist",                  // Output directory for packaging
        "^/temp-.*",               // Temporary build directories used by this app
        "^/node_modules/\\.cache", // Ignore npm cache within node_modules
        "^/node_modules/.*(/test|/example|/demo|/benchmark)", // Ignore specific subdirs
        "^/\\.git",                // Ignore git directory
        "^/\\.vscode",             // Ignore vscode config
        "README\\.md",             // Ignore README
        "LICENSE",                 // Ignore LICENSE
        ".*\\.log",                 // Ignore log files
        "^/out",                   // Common build output directory
        "^/build",                 // Common build output directory
        "^/release",               // Common build output directory
        // OS generated files
        "\\.DS_Store",
        "\\.DS_Store\\?",
        "\\._\\*",
        "\\.Spotlight-V100",
        "\\.Trashes",
        "ehthumbs\\.db",
        "Thumbs\\.db",
        // Editor directories
        "\\.idea/",
        "*.swp",
        "*~",
        // Env files
        "\\.env",
        "\\.env\\.*",
        // Temp / Archive files
        "*.zip",
        "*.tar.gz",
        "*.tgz",
        "*.rar"
    ];
    const ignoreArgsString = ignorePatterns.map(p => `--ignore=${JSON.stringify(p)}`).join(" ");

    const packageJsonContent = JSON.stringify({
        name: "websim-downloader-packager",
        version: "1.0.0",
        description: "Fetches and packages websim client code into an Electron executable.",
        main: "main.js",
        scripts: {
            "start": "electron .",
            "package-win": `npx electron-packager . packaged-websim --platform=win32 --arch=x64 --out=dist/ --overwrite --icon=assets/icon.ico ${ignoreArgsString}`
        },
        keywords: [
            "electron",
            "websim",
            "downloader",
            "packager",
            "archive"
        ],
        author: "AI Generated",
        license: "MIT",
        devDependencies: {
            "electron": "^28.0.0",
            "electron-packager": "^17.1.2"
        },
        dependencies: {
            "axios": "^1.6.7",
            "cheerio": "^1.0.0-rc.12",
            "fs-extra": "^11.2.0"
        }
    }, null, 2);

    projectFolder.file("package.json", packageJsonContent);

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
    if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
       try {
           console.log(\`[Status] \${message}\`);
           window.webContents.send('status-update', message);
       } catch (e) {
          console.error("Failed to send status update:", e);
       }
    } else {
        console.log(\`[Status - Window Unavailable] \${message}\`);
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
        await fs.ensureDir(path.dirname(localPath));
        await fs.writeFile(localPath, Buffer.from(response.data));
        return true;
    } catch (err) {
        console.error(\`Failed to download asset: \${assetUrl.href} - \${err.message}\`);
        sendStatus(mainWindow, \`Warning: Failed to download \${path.basename(assetUrl.pathname)} (\${err.code || err.message})\`);
        return false;
    }
}

ipcMain.handle('select-output-directory', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
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
    let tempBuildDir = null;

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
             sendStatus(mainWindow, \`ERROR: Failed to fetch base HTML: \${htmlError.message}\`);
             throw new Error(\`Failed to fetch base HTML: \${htmlError.message}\`);
        }

        const htmlContent = response.data;
        const baseUrl = new URL(targetUrl);

        sendStatus(mainWindow, 'Parsing HTML and identifying assets...');
        const $ = cheerio.load(htmlContent);
        const downloadTasks = [];
        const assetMap = new Map();
        let assetCounter = 0;

        const assetSelectors = [
            'link[rel="stylesheet"][href]',
            'script[src]',
            'img[src]',
            'img[srcset]',
            'source[src]',
            'source[srcset]',
            'track[src]',
            'video[poster]',
            'audio[src]',
            'object[data]',
            'embed[src]',
            'link[rel="icon"][href]',
            'link[rel="apple-touch-icon"][href]',
            'link[rel="manifest"][href]'
            ];

        $(assetSelectors.join(', ')).each((index, element) => {
            const $el = $(element);
            let originalUrlStr = null;
            let attrToUpdate = null;

            if ($el.is('link[href]')) { originalUrlStr = $el.attr('href'); attrToUpdate = 'href'; }
            else if ($el.is('script[src]')) { originalUrlStr = $el.attr('src'); attrToUpdate = 'src'; }
            else if ($el.is('img[src]')) { originalUrlStr = $el.attr('src'); attrToUpdate = 'src'; }
            else if ($el.is('img[srcset]')) { originalUrlStr = $el.attr('srcset'); attrToUpdate = 'srcset'; } 
            else if ($el.is('source[src]')) { originalUrlStr = $el.attr('src'); attrToUpdate = 'src'; }
            else if ($el.is('source[srcset]')) { originalUrlStr = $el.attr('srcset'); attrToUpdate = 'srcset'; } 
            else if ($el.is('track[src]')) { originalUrlStr = $el.attr('src'); attrToUpdate = 'src'; }
            else if ($el.is('video[poster]')) { originalUrlStr = $el.attr('poster'); attrToUpdate = 'poster'; }
            else if ($el.is('audio[src]')) { originalUrlStr = $el.attr('src'); attrToUpdate = 'src'; }
            else if ($el.is('object[data]')) { originalUrlStr = $el.attr('data'); attrToUpdate = 'data'; }
            else if ($el.is('embed[src]')) { originalUrlStr = $el.attr('src'); attrToUpdate = 'src'; }

            if (!originalUrlStr || originalUrlStr.startsWith('data:') || originalUrlStr.startsWith('blob:')) {
                 return; 
            }

            if (attrToUpdate === 'srcset') {
                const updatedSrcsetEntries = [];
                const srcsetEntries = originalUrlStr.split(',').map(entry => entry.trim());

                srcsetEntries.forEach(entry => {
                    const parts = entry.split(/\s+/);
                    const urlPart = parts[0];
                    const descriptor = parts.length > 1 ? parts.slice(1).join(' ') : '';

                    if (!urlPart) return;

                     try {
                        const assetUrl = new URL(urlPart, baseUrl.href);
                        let filename = path.basename(assetUrl.pathname);
                        filename = filename.split('?')[0].split('#')[0] || \`asset_\${assetCounter++}.dat\`;
                        filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_'); 

                        const localPath = path.join(assetsDownloadDir, filename);
                        const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\\\/g, '/');

                        if (!assetMap.has(assetUrl.href)) {
                             assetMap.set(assetUrl.href, relativePathForHtml);
                             sendStatus(mainWindow, \`Queueing download (srcset): \${filename} (from \${assetUrl.origin})\`);
                            downloadTasks.push(downloadAsset(assetUrl, localPath));
                        }
                        updatedSrcsetEntries.push(\`\${assetMap.get(assetUrl.href)} \${descriptor}\`.trim());

                    } catch (urlError) {
                       console.error(\`Skipping invalid srcset URL: '\${urlPart}' - \${urlError.message}\`);
                       sendStatus(mainWindow, \`Warning: Skipping invalid srcset URL '\${urlPart}'\`);
                    }
                });
                 $el.attr(attrToUpdate, updatedSrcsetEntries.join(', '));

            } else { 
                 try {
                    const assetUrl = new URL(originalUrlStr, baseUrl.href);

                    let filename = path.basename(assetUrl.pathname);
                     filename = filename.split('?')[0].split('#')[0] || \`asset_\${assetCounter++}.dat\`; 
                     filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_'); 

                    const localPath = path.join(assetsDownloadDir, filename);
                    const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\\\/g, '/'); 

                    if (!assetMap.has(assetUrl.href)) {
                         assetMap.set(assetUrl.href, relativePathForHtml);
                         sendStatus(mainWindow, \`Queueing download: \${filename} (from \${assetUrl.origin})\`);
                        downloadTasks.push(
                             downloadAsset(assetUrl, localPath).then(success => {
                                 if(!success) {
                                     sendStatus(mainWindow, \`Failed download will result in broken link for: \${filename}\`);
                                 }
                             })
                        );
                    }
                     $el.attr(attrToUpdate, assetMap.get(assetUrl.href));

                } catch (urlError) {
                   console.error(\`Skipping invalid URL: '\${originalUrlStr}' - \${urlError.message}\`);
                   sendStatus(mainWindow, \`Warning: Skipping invalid URL '\${originalUrlStr}'\`);
                }
            }
        });

        sendStatus(mainWindow, \`Found \${assetMap.size} unique assets to download. Starting downloads...\`);
        const downloadResults = await Promise.allSettled(downloadTasks);
        const failedDownloads = downloadResults.filter(r => r.status === 'rejected').length;
        if (failedDownloads > 0) {
            sendStatus(mainWindow, \`Warning: \${failedDownloads} asset(s) failed to download. Check console for details.\`);
        }
        sendStatus(mainWindow, 'Asset download process finished.');

        if (!$('base[href]').length) {
            $('head').prepend(\`<base href="\${targetUrl}">\`);
             sendStatus(mainWindow, 'Added <base> tag to preserve relative links within content.');
        }


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
                        sandbox: false, 
                        webSecurity: false, 
                        spellcheck: false,
                        preload: path.join(__dirname, 'preload-packaged.js') 
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

        const packagePreloadJsContent = \`
            // Preload script for the packaged application (preload-packaged.js)
            // const { contextBridge, ipcRenderer } = require('electron');
            // console.log('Packaged app preload script loaded.');
        \`;
        await fs.writeFile(path.join(appContentDir, 'preload-packaged.js'), packagePreloadJsContent);


        let electronVersion;
        try {
            const ownPackageJsonPath = path.join(__dirname, 'package.json');
            const ownPackageJson = JSON.parse(await fs.readFile(ownPackageJsonPath, 'utf8'));
            electronVersion = ownPackageJson.devDependencies.electron;
            if (!electronVersion) throw new Error('Electron version not found in downloader project devDependencies.');
             sendStatus(mainWindow, \`Using Electron version: \${electronVersion} for packaging.\`);
        } catch (e) {
            console.error("Failed to read downloader package.json for Electron version:", e);
            sendStatus(mainWindow, "Warning: Could not determine Electron version. Using default '^28.0.0'.");
            electronVersion = "^28.0.0"; 
        }

        const packageJsonContentPackaged = JSON.stringify({
            name: PACKAGED_APP_NAME.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            version: "1.0.0",
            description: \`Packaged version of \${baseUrl.host}\`,
            main: "main.js",
            author: "Websim Packager",
            license: "UNLICENSED", 
            dependencies: {
            },
            devDependencies: {
                 "electron": electronVersion 
            }
        }, null, 2);
        await fs.writeFile(path.join(appContentDir, 'package.json'), packageJsonContentPackaged);

        sendStatus(mainWindow, 'Installing Electron dependency for the packaged app (this may take a moment)...');
        await new Promise((resolve, reject) => {
            const installCommand = 'npm install --omit=dev --no-save --ignore-scripts --prefer-offline --no-audit --progress=false';
             exec(installCommand, { cwd: appContentDir, timeout: 300000 }, (error, stdout, stderr) => { 
                if (error) {
                    console.error(\`Packaged app 'npm install' error: \${error.message}\`);
                    console.error(\`stderr: \${stderr}\`);
                    const errMsg = \`Error installing Electron dependency for package: \${stderr || error.message}\`;
                    sendStatus(mainWindow, \`ERROR: \${errMsg}\`);
                    return reject(new Error(errMsg));
                }
                 if (stderr) {
                     console.warn(\`Packaged app 'npm install' stderr (warnings):\\n\${stderr}\`);
                     sendStatus(mainWindow, \`Electron installation completed with warnings (check console).\`);
                 } else {
                     console.log(\`Packaged app 'npm install' stdout: \${stdout}\`);
                     sendStatus(mainWindow, 'Packaged app Electron dependency installed successfully.');
                 }
                resolve();
            });
        });

        sendStatus(mainWindow, 'Starting application packaging (electron-packager)...');
        await fs.ensureDir(outputDirUserSelected); 

        let iconArg = '';
        const iconSourcePath = path.resolve(__dirname, 'assets', 'icon.ico'); 
        try {
            if (await fs.pathExists(iconSourcePath)) {
                 const iconDestPath = path.join(appContentDir, 'icon.ico');
                 await fs.copy(iconSourcePath, iconDestPath);
                 iconArg = \`--icon=icon.ico\`;
                 sendStatus(mainWindow, \`Using icon: \${iconSourcePath}\`);
             } else {
                  sendStatus(mainWindow, \`Warning: Icon file not found at \${iconSourcePath}. Using default icon. Ensure assets/icon.ico exists.\`);
             }
        } catch(iconError) {
             sendStatus(mainWindow, \`Warning: Error checking/copying icon file: \${iconError.message}\`);
        }

        let commandIgnoreArgs = '';
        try {
            const ownPackageJsonPath = path.join(__dirname, 'package.json');
            const ownPackageJson = JSON.parse(await fs.readFile(ownPackageJsonPath, 'utf8'));
            const packageWinScript = ownPackageJson.scripts['package-win'];
            if (packageWinScript) {
                const ignoreFlags = packageWinScript.match(/--ignore=[^\s"]+|--ignore="[^"]*"/g);
                if (ignoreFlags) {
                    commandIgnoreArgs = ignoreFlags.join(' ');
                    sendStatus(mainWindow, \`Using ignore arguments from project config: \${commandIgnoreArgs}\`);
                } else {
                     sendStatus(mainWindow, 'No --ignore arguments found in project package.json script.');
                }
            }
        } catch (pkgReadError) {
             console.error("Could not read project package.json to extract ignore patterns:", pkgReadError);
             sendStatus(mainWindow, 'Warning: Failed to extract ignore patterns from project config.');
             commandIgnoreArgs = '--ignore="^/dist" --ignore="^/temp-.*" --ignore="^/node_modules/\\.cache" --ignore="/\\.git"';
        }

        const quotedOutputDir = JSON.stringify(outputDirUserSelected);
        const finalAppName = PACKAGED_APP_NAME; 

        const packagerCommand = \`npx electron-packager . "\${finalAppName}" --platform=win32 --arch=x64 --out=\${quotedOutputDir} --overwrite \${iconArg} \${commandIgnoreArgs}\`;
        sendStatus(mainWindow, \`Executing: \${packagerCommand}\`);

        await new Promise((resolve, reject) => {
            exec(packagerCommand, { cwd: appContentDir, timeout: 600000 }, (error, stdout, stderr) => { 
                if (error) {
                    console.error(\`electron-packager execution error: \${error.message}\`);
                    console.error(\`stdout: \${stdout}\`);
                    console.error(\`stderr: \${stderr}\`);
                    const errMsg = \`Packaging failed: \${stderr || error.message}\`;
                    sendStatus(mainWindow, \`ERROR: \${errMsg}\`);
                    return reject(new Error(errMsg));
                }
                console.log(\`electron-packager stdout: \${stdout}\`);
                 if (stderr) {
                     console.warn(\`electron-packager stderr (warnings):\\n\${stderr}\`);
                     sendStatus(mainWindow, \`Packaging finished with warnings (check console).\`);
                 } else {
                    sendStatus(mainWindow, 'Application packaging successful!');
                 }
                resolve();
            });
        });

        const finalOutputPath = path.join(outputDirUserSelected, \`\${finalAppName}-win32-x64\`);
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
    }
});

    projectFolder.file("preload.js", `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('select-output-directory'),

    startPackaging: (url, outputDir) => ipcRenderer.invoke('download-and-package', url, outputDir),

    onStatusUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('status-update', subscription);
        return () => ipcRenderer.removeListener('status-update', subscription);
    },
});
    `);

    projectFolder.file("index.html", `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
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
            --monospace-font: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
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
            cursor: not-allowed;
         }
         /* Input validation styles */
        input:invalid {
            border-color: var(--error-color);
        }
        input:focus:invalid {
             box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
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
            flex-shrink: 0; 
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
            margin-top: 5px;
            padding: 15px;
            background-color: var(--medium-gray);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: var(--monospace-font);
            font-size: 0.875rem;
            white-space: pre-wrap; 
            word-wrap: break-word; 
            overflow-y: auto; 
             flex-grow: 1; 
             border-top: 3px solid var(--secondary-color);
             line-height: 1.4;
             color: #333;
        }
         .status-label {
            font-weight: 600;
            color: #555;
            margin-bottom: 0; 
            flex-shrink: 0; 
         }
         /* Status line styling */
         .status-line {
            display: block; 
            margin-bottom: 3px;
            padding: 3px 6px; 
            border-radius: 3px;
            border-left: 3px solid transparent; 
        }
        /* Specific status types */
        .status-line.error {
            color: var(--error-color);
            font-weight: bold;
            background-color: #f8d7da;
            border-left-color: var(--error-color);
        }
        .status-line.warning {
            color: #856404; 
            background-color: #fff3cd;
            border-left-color: var(--warning-color);
        }
        .status-line.success {
            color: var(--success-color);
            font-weight: bold;
            background-color: #d4edda;
            border-left-color: var(--success-color);
        }
         .status-line.info {
             color: #0c5460; 
             background-color: #d1ecf1;
             border-left-color: var(--info-color);
         }
          .status-line.initial {
             color: var(--secondary-color);
             font-style: italic;
             background-color: transparent; 
             border-left-color: var(--secondary-color);
         }

        /* Fade-in animation */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
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
        <div id="status">
             <!-- Status messages will be added by renderer.js -->
        </div>
    </div>

    <script src="./renderer.js"></script>
</body>
</html>
    `);

    projectFolder.file("renderer.js", `
// Ensure electronAPI is available from preload script
if (!window.electronAPI) {
    const errorMsg = "FATAL: electronAPI not found. Preload script likely failed. Check console (Ctrl+Shift+I or Cmd+Option+I).";
    console.error(errorMsg);
    document.body.innerHTML = \`<div style="color: red; padding: 20px; font-size: 1.2em;">\${errorMsg}</div>\`;
    throw new Error("electronAPI not available");
} else {
    console.log('[Renderer] electronAPI bridge confirmed.');
}

const urlInput = document.getElementById('urlInput');
const outputDirInput = document.getElementById('outputDirInput');
const selectDirBtn = document.getElementById('selectDirBtn');
const packageBtn = document.getElementById('packageBtn');
const statusDiv = document.getElementById('status');

let isProcessing = false;       
let removeStatusListener = null; 

function addStatus(message, type = 'info') {
    const textContent = String(message || '').trim();
    if (!textContent) {
        console.warn("[addStatus] Attempted to add empty status.");
        return;
    }
    console.log(\`[Status-\${type}] \${textContent}\`); 

    const line = document.createElement('div');
    line.classList.add('status-line', type); 
    line.textContent = \`[\${new Date().toLocaleTimeString([], { hour12: false })}] \${textContent}\`;

    const initialMessage = statusDiv.querySelector('.status-line.initial');
    if (initialMessage) {
        initialMessage.remove();
    }

    statusDiv.appendChild(line);
    statusDiv.scrollTop = statusDiv.scrollHeight;
}

function clearStatus() {
    statusDiv.innerHTML = ''; 
    addStatus("Log cleared.", 'info'); 
}

function setControlsEnabled(enabled) {
    isProcessing = !enabled;
    urlInput.disabled = !enabled;
    selectDirBtn.disabled = !enabled;
    packageBtn.disabled = !enabled || !isFormValid();

    packageBtn.textContent = isProcessing ? 'Processing...' : 'Download & Package';
}

function isFormValid() {
    let isValid = true;
    const urlValue = urlInput.value.trim();
    const dirValue = outputDirInput.value.trim();

    if (!urlValue || !urlInput.checkValidity() || !(urlValue.toLowerCase().startsWith('http://') || urlValue.toLowerCase().startsWith('https://'))) {
         isValid = false;
    }

    if (!dirValue) {
        isValid = false;
    }

    return isValid;
}

function checkFormValidityAndUpdateButton() {
    packageBtn.disabled = isProcessing || !isFormValid();
}

selectDirBtn.addEventListener('click', async () => {
    if (!window.electronAPI?.selectDirectory) {
        addStatus("Error: Directory selection feature is unavailable.", 'error');
        return;
    }

    addStatus('Opening directory selector...', 'info');
    setControlsEnabled(false); 

    try {
        const directoryPath = await window.electronAPI.selectDirectory();
        if (directoryPath) {
            outputDirInput.value = directoryPath; 
            addStatus(\`Output directory selected: \${directoryPath}\`, 'info');
        } else {
             addStatus('Directory selection cancelled.', 'warning');
        }
    } catch (error) {
        console.error('Error selecting directory via IPC:', error);
        addStatus(\`Error selecting directory: \${error.message || 'Unknown error'}\`, 'error');
    } finally {
         setControlsEnabled(true);
         checkFormValidityAndUpdateButton();
    }
});

packageBtn.addEventListener('click', async () => {
    if (!isFormValid() || isProcessing) {
        addStatus("Please ensure a valid URL (starting with http:// or https://) is entered and an output directory is selected.", "warning");
        checkFormValidityAndUpdateButton(); 
        return;
    }
     if (!window.electronAPI?.startPackaging) {
         addStatus("Error: Packaging feature is unavailable.", 'error');
         return;
    }

    const targetUrl = urlInput.value.trim();
    const outputDir = outputDirInput.value.trim();

    clearStatus(); 
    addStatus(\`Starting download and packaging for: \${targetUrl}\`, 'info');
    setControlsEnabled(false); 

    try {
        const result = await window.electronAPI.startPackaging(targetUrl, outputDir);

        if (result?.success) {
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
        addStatus(\`CRITICAL RENDERER ERROR: Failed to execute packaging task: \${error.message || 'Unknown IPC error'}\`, 'error');
        addStatus(\`Check main process logs for more details.\`, 'error');
        addStatus(\`------------------------------------------\`, 'error');
    } finally {
        setControlsEnabled(true); 
        checkFormValidityAndUpdateButton(); 
    }
});

urlInput.addEventListener('input', checkFormValidityAndUpdateButton);
urlInput.addEventListener('blur', checkFormValidityAndUpdateButton); 

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
             } else if (message.includes('success') || message.includes('complete.')) {
                 type = 'success';
              } else if (message.includes('failed') || message.includes('FAILURE')) {
                  type = 'error';
              } 

             addStatus(message, type); 
        });
        console.log("[Renderer] Status update listener registered.");

        window.addEventListener('beforeunload', () => {
            if (removeStatusListener) {
                console.log("[Renderer] Cleaning up status update listener.");
                removeStatusListener(); 
                removeStatusListener = null; 
            }
        });

    } catch (error) {
         console.error("[Renderer] Error setting up status update listener:", error);
         addStatus("Error: Failed to initialize status updates from backend.", 'error');
    }
} else {
    console.error("[Renderer] ERROR: electronAPI not available or onStatusUpdate is missing.");
    addStatus("Error: Cannot receive status updates from backend process.", 'error');
}

checkFormValidityAndUpdateButton();
addStatus("Enter a valid URL (e.g., https://...) and select an output directory to enable packaging.", 'initial');
console.log('[Renderer] UI Initialized.');
    `);

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
  <polyline points="35,50 50,65 65,50" stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="50" y1="30" x2="50" y2="63" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  <line x1="30" y1="75" x2="70" y2="75" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
</svg>`;
    assetsFolder.file("icon.svg", svgIcon);

    projectFolder.file(".gitignore", `# Node dependencies
node_modules/

# Build output folders
dist/
out/
build/
release/

# Packaged application files (platform specific examples)
*.exe
*.dmg
*.pkg
*.app
*.deb
*.rpm
*.snap
*.AppImage
*-win32-x64/
*-darwin-*/
*-linux-*/

# Log files
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
logs/
*debug.log

# Temporary files generated by this application's main process
temp-*
websim-build-*/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE / Editor directories
.idea/
.vscode/
*.swp
*~

# Environment variables file
.env
.env.*
.env.local

# Optional lockfiles
# package-lock.json
# yarn.lock
# pnpm-lock.yaml

# Other temporary/archive files often not needed in repo
*.zip
*.tar.gz
*.tgz
*.rar
*.7z
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
        alert(`Failed to generate the project zip file: ${err.message}`);
        downloadBtn.textContent = 'Error - Try Again?';
        downloadBtn.disabled = false; 
    }
});