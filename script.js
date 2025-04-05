import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
*   Uses @electron/packager to create a distributable executable (.exe).

## Prerequisites

*   [Node.js](https://nodejs.org/) (version 16+ recommended, includes npm)
*   [Git](https://git-scm.com/) (optional, but recommended)

## Setup

1.  **Extract the zip file:** Unzip the downloaded \`${projectFolderName}.zip\` file.

2.  **Navigate to the project directory:**
    \`\`\`bash
    cd ${projectFolderName}
    \`\`\`

3.  **Install dependencies:** This command installs Electron, @electron/packager, and other necessary libraries.
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
    *   Use \`@electron/packager\` to build the final executable for Windows (x64).

5.  **Find the Executable:** Once the process completes successfully, navigate to the output directory you selected in step 3. Inside, you should find a folder named something like \`packaged-websim-win32-x64\`. This folder contains your standalone \`.exe\` file and other necessary resources. Double-click the \`.exe\` to run the packaged websim.

## How it Works

1.  **Fetching (main.js):** Uses the \`axios\` library to download the initial HTML from the target URL. It then uses \`cheerio\` (a server-side jQuery-like library) to parse the HTML structure. It identifies \`<link href="...">\`, \`<script src="...">\`, and \`<img src="...">\` tags (and potentially others). For each asset found, it resolves its full URL (handling relative paths like \`/css/style.css\` or \`../images/logo.png\`) and downloads it using \`axios\`.
2.  **Local Path Rewriting (main.js):** As assets are downloaded, the corresponding \`href\` or \`src\` attributes in the HTML are modified to point to the local file path within the package (e.g., \`downloaded_assets/style.css\`).
3.  **Temporary Electron Project Creation (main.js):** A temporary folder is created. Inside it, a basic Electron project is scaffolded:
    *   The modified HTML is saved as \`index.html\`.
    *   Downloaded assets are placed in a \`downloaded_assets\` subfolder.
    *   A minimal \`main.js\` (the Electron main process script for the *packaged* app) is created. This script simply creates a browser window and loads the local \`index.html\`.
    *   A minimal \`package.json\` defining the packaged app's structure and Electron dependency is created.
4.  **Dependency Installation for Package (main.js):** Critically, \`npm install\` is run *inside the temporary project directory*. This installs Electron there, which \`@electron/packager\` needs to bundle.
5.  **Packaging (main.js):** The Node.js \`child_process.exec\` function is used to run the \`@electron/packager\` command via \`npx\`. This command takes the temporary project directory as input and builds the distributable application (including the Node.js runtime, Electron framework, and all the downloaded websim code/assets) into the specified output directory.
6.  **Interface (index.html, renderer.js, preload.js):** The user interface you interact with is also an Electron app.
    *   \`index.html\`: Defines the layout (URL input, directory selection, button, status area).
    *   \`renderer.js\`: Handles button clicks, calls backend functions via the preload script, and updates the status area.
    *   \`preload.js\`: Securely exposes specific Node.js/Electron functions (defined in \`main.js\` via \`ipcMain.handle\`) to the renderer process (\`renderer.js\`) using \`contextBridge\`. This is the secure way to communicate between the frontend UI and the backend Node.js capabilities in modern Electron.

## Important Considerations & Limitations

*   **Dynamic Content:** This tool primarily captures the *static* client-side code as served by the web server *at the time of download*. It might not capture content loaded dynamically via JavaScript after the initial page load, especially if that content relies on complex API interactions or server-side logic that cannot be replicated offline. The packaged app runs the downloaded JavaScript, but if that JS tries to fetch data from its original server, it will likely fail.
*   **Complex SPAs:** Single Page Applications (SPAs) built with frameworks like React, Angular, or Vue might be difficult to package correctly. Their routing, state management, and build processes often rely on server interaction or specific configurations not easily replicated by simple asset downloading.
*   **Server-Side Dependencies:** The packaged application will *only* contain the client-side code. Any functionality that requires communication with the original web server (e.g., fetching data from an API, user authentication, database interactions) will **not** work in the offline packaged version unless the original websim was designed to be fully functional offline.
*   **Path Issues:** While the tool attempts to handle relative paths for common assets (CSS, JS, images), complex cases (e.g., paths generated dynamically in JS, paths within CSS \`url()\`) might not be rewritten correctly, leading to broken styles or images in the packaged app.
*   **Asset Discovery:** The current implementation primarily looks for assets in \`link[rel=stylesheet][href]\`, \`script[src]\`, \`img[src]\`, \`source[src]\`, \`track[src]\`, \`video[poster]\`. Assets loaded via other means (e.g., JavaScript fetch, CSS \`@import\`, inline styles with \`url()\`, complex JS loaders) might not be downloaded.
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

    // Add package.json for the downloader app
    projectFolder.file("package.json", `{
  "name": "websim-downloader-packager",
  "version": "1.0.0",
  "description": "Fetches and packages websim client code into an Electron executable.",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "package-win": "echo 'This script is intended for DEVELOPMENT packaging of the downloader itself, not for packaging the downloaded websim.' && echo 'Use the application UI (npm start) to package a websim.' && exit 1"
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
    "@electron/packager": "^18.3.2",
    "electron": "^28.2.3"
  },
  "dependencies": {
    "axios": "^1.6.7",
    "cheerio": "^1.0.0-rc.12",
    "fs-extra": "^11.2.0"
  }
}`);

    // Add main.js (Electron main process for the downloader app)
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

    // Optional: Open DevTools for debugging the downloader app itself
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    // On macOS, apps stay active until Cmd+Q
    if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

// Send status updates to renderer
function sendStatus(message) {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
       try {
           // Log to main process console as well
           console.log(`[Status] ${message}`);
           mainWindow.webContents.send('status-update', message);
       } catch (e) {
          console.error("Failed to send status update:", e);
       }
    } else {
        console.log(`[Status - Window Gone] ${message}`);
    }
}

// Handle directory selection request
ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Output Directory for Packaged App',
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
        sendStatus('Directory selection cancelled.');
        return null;
    }
    sendStatus(`Output directory selected: ${result.filePaths[0]}`);
    return result.filePaths[0];
});

// Handle the main download and package request
ipcMain.handle('download-and-package', async (event, targetUrl, outputDirUserSelected) => {
    if (!targetUrl || !outputDirUserSelected) {
        sendStatus('ERROR: Missing URL or Output Directory.');
        throw new Error("Missing URL or Output Directory.");
    }

    let tempBuildDir = null; // Initialize outside try
    const startTime = Date.now();

    try {
        tempBuildDir = path.join(app.getPath('temp'), `websim-build-${Date.now()}`);
        const appContentDir = path.join(tempBuildDir, 'app'); // Dir containing the packaged app's code
        const assetsDownloadDir = path.join(appContentDir, PACKAGED_ASSETS_DIR); // Subdir for assets

        sendStatus(`Using temporary build directory: ${tempBuildDir}`);
        await fs.ensureDir(appContentDir);
        await fs.ensureDir(assetsDownloadDir);
        sendStatus('Temporary directories created.');

        // 1. Fetch Base HTML
        sendStatus(`Fetching HTML from: ${targetUrl}`);
        let response;
        try {
             response = await axios.get(targetUrl, {
                responseType: 'text',
                timeout: 20000, // 20 seconds timeout for HTML fetch
                 headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache', // Try to get fresh content
                    'Pragma': 'no-cache'
                }
            });
             sendStatus(`HTML fetched successfully (Status: ${response.status})`);
        } catch(htmlError) {
             const errorMessage = `Failed to fetch base HTML (${htmlError.code || 'Error'}): ${htmlError.message}`;
             sendStatus(`ERROR: ${errorMessage}`);
             throw new Error(errorMessage);
        }

        const htmlContent = response.data;
        const baseUrl = new URL(targetUrl);

        // 2. Parse HTML and Download Assets
        sendStatus('Parsing HTML and identifying assets...');
        const $ = cheerio.load(htmlContent);
        const downloadTasks = [];
        const assetMap = new Map(); // Track assets to avoid duplicates { originalUrl -> localRelativePath }
        let assetCounter = 0; // For generating unique names for assets without clear names

        const selectors = [
            'link[rel="stylesheet"][href]',
            'script[src]',
            'img[src]',
            'img[srcset]', // Handle responsive images
            'source[src]',
            'source[srcset]',
            'video[poster]',
            'audio[src]',
            'track[src]',
            'object[data]',
            'embed[src]',
             // Basic inline style url() check - might miss complex cases
             '[style*="url("]'
        ];

        $(selectors.join(', ')).each((index, element) => {
            const $el = $(element);
            let attributeNames = []; // Attributes containing URLs for this element type
            let isInlineStyle = false;

             if ($el.is('link')) attributeNames = ['href'];
             else if ($el.is('script, img, source, video, audio, track, embed')) attributeNames = ['src']; // Base cases
             else if ($el.is('object')) attributeNames = ['data'];

             // Handle attributes with multiple URLs (srcset)
             if ($el.attr('srcset')) attributeNames.push('srcset');
             // Handle poster attribute
             if ($el.is('video[poster]') && $el.attr('poster')) attributeNames.push('poster');
              // Handle inline style
              if($el.is('[style*="url("]')) isInlineStyle = true;


             // Process standard attributes
             attributeNames.forEach(attrName => {
                 const value = $el.attr(attrName);
                 if (!value) return;

                 const urlsToProcess = [];
                 if (attrName === 'srcset') {
                     // Parse srcset: "image-1x.jpg 1x, image-2x.jpg 2x" -> ["image-1x.jpg", "image-2x.jpg"]
                     value.split(',').forEach(part => {
                         const url = part.trim().split(' ')[0];
                         if (url) urlsToProcess.push(url);
                     });
                 } else {
                     urlsToProcess.push(value);
                 }

                 let updatedValue = value; // Start with original value for srcset modification

                 urlsToProcess.forEach(originalUrlStr => {
                     if (!originalUrlStr || originalUrlStr.startsWith('data:') || originalUrlStr.startsWith('blob:')) {
                         return; // Skip data URIs and blob URIs
                     }

                     try {
                         const assetUrl = new URL(originalUrlStr, baseUrl.href);

                         // Generate a safe filename
                         let filename = path.basename(assetUrl.pathname) || `asset_${assetCounter++}`;
                          // Remove query params/hash and sanitize
                          filename = filename.split('?')[0].split('#')[0];
                          filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || `asset_${assetCounter++}${path.extname(assetUrl.pathname) || '.dat'}`;

                         const localPath = path.join(assetsDownloadDir, filename);
                         const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\\\/g, '/'); // Use forward slashes for HTML

                         if (!assetMap.has(assetUrl.href)) {
                              assetMap.set(assetUrl.href, relativePathForHtml);
                              sendStatus(`Queueing download: ${filename} (from ${assetUrl.origin})`);
                             downloadTasks.push(
                                  downloadAsset(assetUrl, localPath).then(success => {
                                      if (!success) {
                                         sendStatus(`Warning: Failed asset '${filename}' will retain original URL ${attrName === 'src' || attrName === 'href' ? 'in HTML.' : 'if used.'}`);
                                         // For critical assets like CSS/JS, maybe remove the element or log a bigger warning?
                                      }
                                  })
                             );
                         } else {
                             // Asset already queued or downloaded, ensure relative path is correct
                             sendStatus(`Asset already queued: ${filename} (using existing local path)`);
                         }

                         // Update the attribute value in the HTML
                         // For srcset, we need to replace the specific URL part
                         const localRelPath = assetMap.get(assetUrl.href); // Get the determined local path
                         if (attrName === 'srcset') {
                            updatedValue = updatedValue.replace(originalUrlStr, localRelPath);
                         } else {
                            $el.attr(attrName, localRelPath); // Direct replacement for single-URL attributes
                         }

                     } catch (urlError) {
                        console.error(`Skipping invalid URL in ${attrName}: '${originalUrlStr}' - ${urlError.message}`);
                        sendStatus(`Warning: Skipping invalid URL '${originalUrlStr}' in attribute ${attrName}`);
                     }
                 }); // End foreach url in attribute value

                  if (attrName === 'srcset') {
                       $el.attr(attrName, updatedValue); // Update srcset with all replacements done
                  }
             }); // End foreach attributeName

              // Process inline styles
              if(isInlineStyle) {
                  let styleAttr = $el.attr('style');
                  const urlRegex = /url\((['"]?)(.*?)\1\)/g; // Regex to find url(...)
                  let match;
                  let styleNeedsUpdate = false;
                  let updatedStyle = styleAttr;

                  while ((match = urlRegex.exec(styleAttr)) !== null) {
                      const originalUrlStr = match[2]; // The URL inside url()

                      if (!originalUrlStr || originalUrlStr.startsWith('data:') || originalUrlStr.startsWith('blob:')) {
                          continue;
                      }

                       try {
                           const assetUrl = new URL(originalUrlStr, baseUrl.href);
                           let filename = path.basename(assetUrl.pathname) || `inline_asset_${assetCounter++}`;
                           filename = filename.split('?')[0].split('#')[0];
                           filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || `inline_asset_${assetCounter++}${path.extname(assetUrl.pathname) || '.dat'}`;

                           const localPath = path.join(assetsDownloadDir, filename);
                           const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\\\/g, '/');

                           let localRelPathToUse;
                           if (!assetMap.has(assetUrl.href)) {
                               assetMap.set(assetUrl.href, relativePathForHtml);
                               localRelPathToUse = relativePathForHtml;
                               sendStatus(`Queueing inline style asset: ${filename} (from ${assetUrl.origin})`);
                               downloadTasks.push(
                                   downloadAsset(assetUrl, localPath).then(success => {
                                       if (!success) sendStatus(`Warning: Failed inline style asset '${filename}' will retain original URL.`);
                                   })
                               );
                           } else {
                                localRelPathToUse = assetMap.get(assetUrl.href);
                                sendStatus(`Inline style asset already queued: ${filename}`);
                           }

                           // Replace in the style attribute string
                           // Need to be careful to replace only the URL part within the match
                           const escapedOriginal = match[0].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape regex chars in original match
                           updatedStyle = updatedStyle.replace(new RegExp(escapedOriginal), `url('${localRelPathToUse}')`);
                           styleNeedsUpdate = true;

                       } catch(urlError) {
                           console.error(`Skipping invalid URL in style: '${originalUrlStr}' - ${urlError.message}`);
                           sendStatus(`Warning: Skipping invalid URL '${originalUrlStr}' in inline style`);
                       }
                  } // End while loop for inline style urls

                  if (styleNeedsUpdate) {
                      $el.attr('style', updatedStyle);
                  }
              } // End if inline style
        }); // End element processing

        sendStatus(`Found ${assetMap.size} unique assets. Starting downloads...`);
        await Promise.all(downloadTasks);
        sendStatus('Asset download process finished.');

        // 3. Save Modified HTML
        const finalHtmlContent = $.html();
        await fs.writeFile(path.join(appContentDir, 'index.html'), finalHtmlContent);
        sendStatus('Modified HTML saved.');

        // 4. Create Boilerplate for Packaged App (main.js, package.json)
        sendStatus('Creating boilerplate for packaged app...');
        const packageMainJsContent = `
            const { app, BrowserWindow } = require('electron');
            const path = require('path');

            function createPackagedWindow () {
                const win = new BrowserWindow({
                    width: 1280, // Default size, can be adjusted
                    height: 800,
                    webPreferences: {
                        nodeIntegration: false, // Best practice
                        contextIsolation: true, // Best practice
                        webSecurity: false, // **IMPORTANT**: Often needed to load local file:// resources, but has security risks. Only use if necessary and package trusted content.
                        spellcheck: false,
                        preload: path.join(__dirname, 'packaged-preload.js') // Optional preload for packaged app
                    },
                    autoHideMenuBar: true, // Cleaner look
                    icon: path.join(__dirname, 'assets', 'icon.png') // Reference packaged icon if needed (adjust path/name)
                });

                // Load the downloaded and modified HTML
                win.loadFile(path.join(__dirname, 'index.html'));

                // Optional: Open DevTools in packaged app for debugging
                // win.webContents.openDevTools();
            }

            // Optional Preload for Packaged App (if needed for IPC or node access in renderer)
            // Create packaged-preload.js if required:
            // const { contextBridge, ipcRenderer } = require('electron');
            // contextBridge.exposeInMainWorld('packagedAPI', { /* expose functions if needed */ });


            app.whenReady().then(createPackagedWindow);

            app.on('window-all-closed', () => {
                // Standard quit behavior
                if (process.platform !== 'darwin') {
                    app.quit();
                }
            });

            app.on('activate', () => {
                // Standard macOS activation behavior
                if (BrowserWindow.getAllWindows().length === 0) {
                    createPackagedWindow();
                }
            });
        `;
        await fs.writeFile(path.join(appContentDir, 'main.js'), packageMainJsContent);
        // Create a minimal preload for the packaged app (even if empty, helps structure)
        await fs.writeFile(path.join(appContentDir, 'packaged-preload.js'), `
            // Preload script for the packaged application
            // Use contextBridge to expose Node.js/Electron features to the renderer process if needed.
            // Example:
            // const { contextBridge } = require('electron');
            // contextBridge.exposeInMainWorld('myAPI', {
            //   doSomething: () => { /* ... */ }
            // });
            console.log('Packaged app preload script loaded.');
        `);


        // Determine Electron version to use in the packaged app
        let electronVersion;
        try {
            const ownPackageJsonPath = path.join(__dirname, 'package.json');
            const ownPackageJson = await fs.readJson(ownPackageJsonPath);
            electronVersion = ownPackageJson.devDependencies?.electron || ownPackageJson.dependencies?.electron;
            if (!electronVersion) throw new Error('Electron version not found in downloader package.json.');
             sendStatus(`Using Electron version: ${electronVersion} for packaged app.`);
        } catch (e) {
            console.error("Failed to read downloader package.json for Electron version:", e);
            sendStatus("Warning: Could not determine Electron version. Using 'latest'. This might cause issues.");
            electronVersion = "latest"; // Fallback, less reliable
        }

        // Create package.json for the packaged app
        const packageJsonContent = JSON.stringify({
            name: PACKAGED_APP_NAME.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, ''), // Sanitize name
            version: "1.0.0",
            description: `Packaged version of ${baseUrl.host}`,
            main: "main.js",
            author: "Websim Packager",
            license: "UNLICENSED", // Or specify based on downloaded content license if known
            dependencies: {
                // Electron MUST be a production dependency for the packaged app
                "electron": electronVersion
            }
        }, null, 2);
        await fs.writeFile(path.join(appContentDir, 'package.json'), packageJsonContent);
        sendStatus('Packaged app package.json created.');

        // 5. Install Dependencies for the Packaged App (specifically Electron)
        sendStatus('Installing Electron dependency for the packaged app (this may take a moment)...');
        await new Promise((resolve, reject) => {
            // Use 'npm install' - it doesn't need package-lock.json
            // --no-save: Prevent modification of package.json (already correct)
            // --omit=dev: Ensure only production deps are installed (Electron)
            // Other flags for cleaner/faster installs:
            const installCommand = 'npm install --omit=dev --ignore-scripts --prefer-offline --no-audit --progress=false --no-fund';
            sendStatus(`Executing in ${appContentDir}: ${installCommand}`);

            exec(installCommand, { cwd: appContentDir, timeout: 300000 }, (error, stdout, stderr) => { // 5 min timeout
                if (error) {
                    console.error(`Packaged app 'npm install' error: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    const errMsg = `Error installing Electron for package: ${stderr || error.message}`;
                    sendStatus(`ERROR: ${errMsg}`);
                    return reject(new Error(`npm install failed in temp directory: ${errMsg}`));
                }
                 if (stderr) {
                     // npm install often prints warnings to stderr, treat them as info
                     console.warn(`Packaged app 'npm install' stderr (warnings/info):\n${stderr}`);
                     sendStatus(`Dependency installation completed (Note: Check console for any warnings from npm).`);
                 } else {
                    sendStatus('Packaged app Electron dependency installed successfully.');
                 }
                 console.log(`Packaged app 'npm install' stdout:\n${stdout}`);
                resolve();
            });
        });

        // 6. Package the Application using @electron/packager
        sendStatus('Starting application packaging (@electron/packager)...');
        await fs.ensureDir(outputDirUserSelected); // Ensure final output dir exists

        // Check for icon (optional)
        const iconPath = path.resolve(__dirname, 'assets', 'icon.ico'); // .ico for Windows
        let iconArg = '';
        try {
            if (await fs.pathExists(iconPath)) {
                 // Use path.relative to get a reliable path for the command line, needs careful quoting
                 // Simpler: Use absolute path, properly quoted.
                 iconArg = `--icon="${iconPath.replace(/\\\\/g, '/')}"`; // Quote and use forward slashes
                 sendStatus(`Using icon: ${iconPath}`);
             } else {
                  sendStatus(`Warning: Icon file not found at ${iconPath}. Using default icon. Please create assets/icon.ico for a custom icon.`);
             }
        } catch(iconError) {
             sendStatus(`Warning: Error checking for icon file: ${iconError.message}`);
        }

        // Define ignore patterns for packager (as an array of regex)
        const ignorePatterns = [
             '^/node_modules/electron($|/)', // Packager includes Electron runtime
             '^/node_modules/@electron/packager($|/)' // Exclude packager dev dep if present
             // Add other patterns if needed, e.g., '^/\\.git($|/)'
         ];
         const ignoreArg = ignorePatterns.map(p => `--ignore="${p}"`).join(' ');


        const finalAppName = PACKAGED_APP_NAME; // Use the constant
        // Ensure output directory path is quoted and uses forward slashes for consistency
        const outputDirQuoted = `"${outputDirUserSelected.replace(/\\\\/g, '/')}"`;
        const sourceDir = "."; // Package from the 'app' directory relative to cwd

        // Construct the packager command
        // Use npx to ensure the latest compatible packager is used or the one installed
        const packagerCommand = `npx @electron/packager@latest ${sourceDir} "${finalAppName}" --platform=win32 --arch=x64 --out=${outputDirQuoted} --overwrite ${iconArg} ${ignoreArg}`;
        sendStatus(`Executing packager: ${packagerCommand}`);

        await new Promise((resolve, reject) => {
            // Run packager from the directory containing the packaged app's code (package.json, main.js)
            exec(packagerCommand, { cwd: appContentDir, timeout: 600000 }, (error, stdout, stderr) => { // 10 min timeout
                if (error) {
                    console.error(`@electron/packager execution error: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    let errorDetail = stderr || error.message;
                    if (errorDetail.includes("Cannot find module 'electron'")) {
                         errorDetail = `Electron module not found within the temporary package. 'npm install' might have failed or packager couldn't find it. ${errorDetail}`;
                    } else if (errorDetail.includes("EACCES")) {
                        errorDetail = `Permission denied during packaging. Check permissions for output/temp folders. ${errorDetail}`;
                    } else if (errorDetail.includes("ENOSPC")) {
                         errorDetail = `No space left on device during packaging. ${errorDetail}`;
                    } else if (errorDetail.includes("syntax error") || errorDetail.includes("unexpected")) {
                         errorDetail = `Command syntax error during packaging (check paths/quotes?): ${errorDetail}`;
                    } else if (errorDetail.includes("Unable to determine application name")) {
                         errorDetail = `Packager failed to read name from temp package.json. ${errorDetail}`;
                    }
                    const errMsg = `Packaging failed: ${errorDetail}`;
                    sendStatus(`ERROR: ${errMsg}`);
                    return reject(new Error(`@electron/packager command failed: ${errorDetail}`));
                }
                console.log(`@electron/packager stdout: ${stdout}`);
                 if (stderr) {
                     // Packager often logs info/warnings to stderr
                     console.warn(`@electron/packager stderr (warnings/info):\n${stderr}`);
                     sendStatus(`Packaging finished (Note: Check console for packager warnings).`);
                 } else {
                    sendStatus('Application packaging successful!');
                 }
                resolve();
            });
        });

        const finalOutputPath = path.join(outputDirUserSelected, `${finalAppName}-win32-x64`);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        sendStatus(`------------------------------------------`);
        sendStatus(`SUCCESS! Packaging complete in ${duration}s.`);
        sendStatus(`Application saved to: ${finalOutputPath}`);
        sendStatus(`------------------------------------------`);
        return { success: true, outputDir: finalOutputPath };

    } catch (error) {
        console.error("Error during download/packaging process:", error);
        const errorMessage = error.message || "An unknown error occurred.";
        sendStatus(`------------------------------------------`);
        sendStatus(`FAILURE: ${errorMessage}`);
        sendStatus(`------------------------------------------`);
        console.error(error.stack); // Log stack trace for debugging
        return { success: false, error: errorMessage };
    } finally {
        // 7. Cleanup Temporary Directory
        if (tempBuildDir) {
            try {
                 sendStatus(`Cleaning up temporary directory: ${tempBuildDir}`);
                 // Add a small delay before cleanup, helps avoid file lock issues on Windows
                 await new Promise(resolve => setTimeout(resolve, 1000));
                 await fs.remove(tempBuildDir);
                 sendStatus('Temporary directory cleaned up successfully.');
            } catch (cleanupError) {
                console.error(`Failed to clean up temporary directory ${tempBuildDir}: ${cleanupError.message}`);
                sendStatus(`Warning: Could not fully clean up temporary directory: ${cleanupError.message} (You may need to delete it manually: ${tempBuildDir})`);
            }
        }
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
        sendStatus(`Process finished in ${totalDuration}s.`);
    }
});


// Helper function to download a single asset
async function downloadAsset(assetUrl, localPath) {
    try {
        await fs.ensureDir(path.dirname(localPath)); // Ensure directory exists
        const response = await axios.get(assetUrl.href, {
            responseType: 'arraybuffer', // Get data as raw bytes
            timeout: 15000, // 15 seconds timeout per asset
             headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
                'Referer': assetUrl.origin // Sometimes helpful
            }
        });
        await fs.writeFile(localPath, Buffer.from(response.data));
        // sendStatus(`Downloaded: ${path.basename(localPath)}`); // Optional: Status per asset
        return true;
    } catch (err) {
        console.error(`Failed to download asset: ${assetUrl.href} - ${err.message}`);
        // Don't sendStatus here for every failure, gets too verbose. Caller will warn.
        return false;
    }
}
    `);

    // Add preload.js (Electron preload script for the downloader app)
    projectFolder.file("preload.js", `
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Renderer -> Main (Invoke/Handle)
    selectDirectory: () => ipcRenderer.invoke('select-output-directory'),
    startPackaging: (url, outputDir) => ipcRenderer.invoke('download-and-package', url, outputDir),

    // Main -> Renderer (Send/On)
    onStatusUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('status-update', subscription);
        // Return a function to unsubscribe -> Cleans up the listener when no longer needed
        return () => {
            console.log('[Preload] Removing status-update listener');
            ipcRenderer.removeListener('status-update', subscription);
        };
    },

    // Optional: Function to remove a specific listener if needed, though the above is often sufficient
    removeStatusListener: (listener) => {
         ipcRenderer.removeListener('status-update', listener);
    }
});

console.log('[Preload] Script executed, electronAPI exposed.');
    `);

    // Add index.html (Electron renderer process UI for the downloader app)
    projectFolder.file("index.html", `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <!-- CSP: Restrictive but allows inline styles for convenience here. -->
    <!-- For production, consider stricter policies (nonces/hashes). -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
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
            --text-color: #212529;
            --font-family-sans-serif: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            --font-family-monospace: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
        body {
            font-family: var(--font-family-sans-serif);
            padding: 20px;
            background-color: var(--light-gray);
            margin: 0;
            font-size: 1rem; /* 16px default */
            line-height: 1.5;
            color: var(--text-color);
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
            overflow: hidden; /* Prevent body scroll, handle scrolling in status */
        }
        .container {
            background-color: #fff;
            padding: 25px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            flex-shrink: 0; /* Prevent control area from shrinking */
            margin-bottom: 20px;
            border: 1px solid var(--border-color);
        }
        h1 {
            color: var(--dark-gray);
            margin-top: 0;
            margin-bottom: 25px;
            font-size: 1.75rem;
            border-bottom: 1px solid var(--medium-gray);
            padding-bottom: 10px;
            font-weight: 500;
        }
        label {
            display: block;
            margin-bottom: 6px;
            color: #495057;
            font-weight: 600;
        }
        input[type="url"], input[type="text"] {
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 18px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box; /* Include padding and border in width */
            transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            background-color: #fff; /* Ensure white background */
        }
        input[type="url"]:focus, input[type="text"]:focus {
            border-color: var(--primary-color);
            outline: 0;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
         input[readonly] {
            background-color: var(--medium-gray);
            cursor: not-allowed; /* Indicate it's not directly editable */
            opacity: 0.8;
         }
        button {
            padding: 10px 20px;
            margin-right: 10px;
            margin-top: 5px; /* Add space if buttons wrap */
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: background-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            vertical-align: middle; /* Align with input fields */
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
            background-color: #cccccc !important; /* Ensure override */
            color: #666 !important;
            cursor: not-allowed;
            box-shadow: none !important;
            opacity: 0.65;
        }
        .dir-selection {
            display: flex;
            align-items: center;
            margin-bottom: 20px; /* Space below directory selection */
        }
        .dir-selection input[type="text"] {
            flex-grow: 1; /* Input takes available space */
            margin: 0 10px 0 0; /* Remove bottom margin, add right margin */
        }
        .status-container {
             flex-grow: 1; /* Takes remaining vertical space */
             display: flex;
             flex-direction: column;
             min-height: 150px; /* Minimum height */
             background-color: #fff;
             padding: 15px;
             border-radius: 8px;
             box-shadow: 0 4px 8px rgba(0,0,0,0.1);
             border: 1px solid var(--border-color);
        }
        .status-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
            flex-shrink: 0; /* Prevent label from shrinking */
         }
        #status {
            padding: 15px;
            background-color: var(--dark-gray); /* Dark background for log */
            color: #f8f9fa; /* Light text */
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: var(--font-family-monospace);
            font-size: 0.875rem; /* Smaller font for logs */
            white-space: pre-wrap; /* Preserve whitespace and wrap lines */
            word-wrap: break-word;
            overflow-y: auto; /* Enable vertical scrolling */
             flex-grow: 1; /* Allow log area to grow */
             line-height: 1.4;
             /* max-height: 50vh; Limit max height if needed, but flex-grow should handle it */
             min-height: 100px; /* Ensure it's visible even when empty */
        }
        .status-line {
            margin-bottom: 4px;
            padding: 3px 6px;
            border-radius: 3px;
            display: block; /* Ensure each message is on a new line */
        }
        .status-line time {
             color: #adb5bd; /* Dim timestamp */
             margin-right: 8px;
             font-size: 0.9em;
        }
        /* No background colors by default on dark bg, use text color/borders */
        .status-line.error {
            color: #f06565; /* Lighter red for dark bg */
            font-weight: bold;
            border-left: 3px solid var(--error-color);
        }
        .status-line.warning {
            color: #ffcc66; /* Lighter yellow */
            border-left: 3px solid var(--warning-color);
        }
        .status-line.success {
            color: #69db7c; /* Lighter green */
            font-weight: bold;
            border-left: 3px solid var(--success-color);
        }
         .status-line.info {
             color: #66d9ef; /* Lighter cyan */
             border-left: 3px solid var(--info-color);
         }
         .status-line.default {
              color: #ced4da; /* Default light gray text */
              border-left: 3px solid var(--secondary-color);
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
        <div id="status"><span class="status-line default"><time>...</time>Enter a valid URL (e.g., https://...) and select an output directory.</span></div>
    </div>

    <script src="./renderer.js"></script>
</body>
</html>
    `);

    // Add renderer.js (Electron renderer process logic for the downloader app)
    projectFolder.file("renderer.js", `
// --- Check if Preload script worked ---
if (typeof window.electronAPI?.startPackaging !== 'function') {
    console.error("FATAL: window.electronAPI or required functions not found. Preload script likely failed.");
    const message = "Error: Cannot initialize communication with the backend process. The application may not work correctly. Check the Developer Tools (View -> Toggle Developer Tools) console for more details.";
    // Attempt to display error prominently even if status updates fail
    const body = document.body;
    const errorDiv = document.createElement('div');
    errorDiv.textContent = message;
    errorDiv.style.cssText = "position:fixed; top:0; left:0; width:100%; padding:10px; background-color:red; color:white; z-index:9999; text-align:center; font-weight:bold;";
    if (body) body.prepend(errorDiv); else alert(message); // Fallback alert

    // Disable controls permanently if API is missing
    document.getElementById('selectDirBtn').disabled = true;
    document.getElementById('packageBtn').disabled = true;
    document.getElementById('urlInput').disabled = true;

} else {
    console.log('[Renderer] electronAPI found. Initializing UI listeners.');

    // --- DOM Elements ---
    const urlInput = document.getElementById('urlInput');
    const outputDirInput = document.getElementById('outputDirInput');
    const selectDirBtn = document.getElementById('selectDirBtn');
    const packageBtn = document.getElementById('packageBtn');
    const statusDiv = document.getElementById('status');

    // --- State ---
    let isProcessing = false;
    let removeStatusListener = null; // Function to unsubscribe from status updates

    // --- Functions ---

    // Add a formatted line to the status log
    function addStatus(message, type = 'default') {
        // Sanitize message slightly (optional)
        message = String(message || '').trim();
        if (!message) return; // Don't log empty messages

        console.log(`[Status-${type}] ${message}`); // Log to console as well

        const line = document.createElement('span'); // Use span for inline display within the pre-like div
        line.classList.add('status-line', type);

        const time = document.createElement('time');
        time.textContent = new Date().toLocaleTimeString();
        line.appendChild(time);

        line.appendChild(document.createTextNode(message)); // Add message text

        statusDiv.appendChild(line);

        // Auto-scroll to the bottom
        statusDiv.scrollTop = statusDiv.scrollHeight;
    }

    // Clear the status log
    function clearStatus() {
        statusDiv.innerHTML = ''; // Clear content
        addStatus("Log cleared.");
    }

    // Enable/disable form controls during processing
    function setControlsEnabled(enabled) {
        isProcessing = !enabled;
        urlInput.disabled = !enabled;
        selectDirBtn.disabled = !enabled;
        // Package button depends on both processing state and form validity
        packageBtn.disabled = !enabled || !isFormValid();

        packageBtn.textContent = isProcessing ? 'Processing...' : 'Download & Package';
    }

    // Check if URL and output directory are validly set
    function isFormValid() {
        let isValid = true;
        const urlValue = urlInput.value.trim();
        const dirValue = outputDirInput.value.trim();

        // Basic URL validation (starts with http/https, not empty)
        if (!urlValue || !urlValue.toLowerCase().startsWith('http') || !urlInput.checkValidity()) {
             isValid = false;
             // Optionally add visual feedback to invalid field
             urlInput.style.borderColor = urlValue ? 'red' : ''; // Red border if invalid but not empty
        } else {
             urlInput.style.borderColor = ''; // Reset border if valid
        }

        if (!dirValue) {
            isValid = false;
        }

        // Update package button state based on validity (only if not processing)
        if (!isProcessing) {
           packageBtn.disabled = !isValid;
        }
        return isValid;
    }

    // --- Event Listeners ---

    // Directory Selection Button
    selectDirBtn.addEventListener('click', async () => {
        addStatus('Opening directory selector...', 'info');
        setControlsEnabled(false); // Disable controls while dialog is open
        try {
            const directoryPath = await window.electronAPI.selectDirectory();
            if (directoryPath) {
                outputDirInput.value = directoryPath;
                addStatus(`Output directory set: ${directoryPath}`, 'info');
            } else {
                 addStatus('Directory selection cancelled.', 'warning');
            }
        } catch (error) {
            console.error('Error selecting directory via IPC:', error);
            addStatus(`Error selecting directory: ${error.message || 'Unknown error'}`, 'error');
        } finally {
             setControlsEnabled(true); // Re-enable controls
             isFormValid(); // Re-validate form, potentially enabling package button
        }
    });

    // Package Button
    packageBtn.addEventListener('click', async () => {
        if (!isFormValid() || isProcessing) {
            addStatus("Please ensure a valid URL (starting with http/https) is entered and an output directory is selected.", "warning");
            return;
        }

        const targetUrl = urlInput.value.trim();
        const outputDir = outputDirInput.value.trim();

        clearStatus();
        addStatus(`Starting download and packaging for: ${targetUrl}`, 'info');
        setControlsEnabled(false);

        try {
            const result = await window.electronAPI.startPackaging(targetUrl, outputDir);

            // Status updates during the process are handled by the onStatusUpdate listener
            // Here, we just handle the final result object/error from the invoke call

            if (result && result.success) {
                 // Final success message is usually sent via status update, but can add one here too
                 addStatus(`Packaging process completed. Check log for details.`, 'success');
            } else {
                 // Error should have been sent via status update, but log a fallback
                 addStatus(`Packaging process failed. Error: ${result?.error || 'Unknown error from backend.'}`, 'error');
            }
        } catch (error) {
            // This catches errors in the IPC call itself (e.g., main process crashed, invoke rejected unexpectedly)
            console.error('IPC invocation error (startPackaging):', error);
            addStatus(`CRITICAL RENDERER ERROR: Failed to communicate with backend: ${error.message || 'Unknown IPC error'}`, 'error');
            addStatus(`Packaging process aborted due to communication failure.`, 'error');
        } finally {
            setControlsEnabled(true); // Always re-enable controls
            isFormValid(); // Re-check validity
        }
    });

    // Input validation on change/blur
    urlInput.addEventListener('input', isFormValid);
    urlInput.addEventListener('blur', isFormValid);
    // We don't need listeners for outputDirInput as it's readonly and set via button

    // --- Setup Status Update Listener ---
    try {
        if (removeStatusListener) removeStatusListener(); // Remove previous listener if any

        removeStatusListener = window.electronAPI.onStatusUpdate((message) => {
             let type = 'default'; // Default type

             // Basic message type detection
             message = String(message || '');
             const lowerMessage = message.toLowerCase();

              if (lowerMessage.startsWith('error:') || lowerMessage.includes('failed:') || lowerMessage.includes('failure:')) {
                  type = 'error';
                  // Optional: Remove prefix like "ERROR: " for cleaner display
                  if (message.startsWith('ERROR:')) message = message.substring(6).trim();
                  else if (message.startsWith('FAILURE:')) message = message.substring(8).trim();

             } else if (lowerMessage.startsWith('warning:')) {
                  type = 'warning';
                  if (message.startsWith('Warning:')) message = message.substring(8).trim();

             } else if (lowerMessage.includes('success') || lowerMessage.includes('complete')) {
                  type = 'success';
             } else if (lowerMessage.includes('starting') || lowerMessage.includes('fetching') || lowerMessage.includes('creating') || lowerMessage.includes('installing') || lowerMessage.includes('packaging') || lowerMessage.includes('using') || lowerMessage.includes('found') || lowerMessage.includes('downloading')) {
                 type = 'info';
             }

             addStatus(message, type);
        });

        console.log("[Renderer] Status update listener registered successfully.");
        addStatus("Ready. Waiting for URL and output directory.", "info");

        // Cleanup listener on window unload
        window.addEventListener('beforeunload', () => {
            if (removeStatusListener) {
                console.log("[Renderer] Cleaning up status update listener before unload.");
                removeStatusListener();
                removeStatusListener = null;
            }
        });

    } catch (error) {
         console.error("[Renderer] Error setting up status update listener:", error);
         addStatus("Error: Failed to set up status updates from backend.", 'error');
    }

    // --- Initial State ---
    isFormValid(); // Set initial button state

} // End of check for window.electronAPI
    `);

    // --- Assets ---
    const assetsFolder = projectFolder.folder("assets");

    // Add SVG icon (user must convert this to icon.ico for Windows packaging)
    const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007bff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dy="2"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="96" height="96" x="2" y="2" rx="18" ry="18" fill="url(#grad1)" filter="url(#shadow)"/>
  <path d="M 28,72 V 38 Q 28,30 36,30 H 64 Q 72,30 72,38 V 50 H 62 V 40 Q 62,35 58,35 H 42 Q 38,35 38,40 V 72 H 28 Z M 50,72 V 52 H 72 V 62 Q 72,68 66,68 H 56 Q 50,68 50,72 Z" fill="#ffffff" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/>
  <text x="50" y="90" font-family="sans-serif" font-size="10" fill="#ffffff" text-anchor="middle" style="opacity:0.7;">Package</text>
</svg>`;
    assetsFolder.file("icon.svg", svgIcon);
    // Add placeholder for the required .ico file
    assetsFolder.file("icon_readme.txt", "Please convert icon.svg to icon.ico using an online converter or image editor and place it in this 'assets' directory for the Windows executable icon.");


    // Add .gitignore
    projectFolder.file(".gitignore", `# Node modules
node_modules/

# Packaged application output directories
dist/
out/
release/
packaged-*/

# Build artifacts
build/
*.o
*.obj
*.dylib
*.dll
*.so

# Log files
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
*.logs

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

# Temporary build directory used by this app
temp-build-*/

# Environment variables file
.env

# Archives
*.zip
*.tar
*.gz
*.rar
*.7z
`);

    // --- Generate and Download Zip ---
    downloadBtn.textContent = 'Generating Zip...';
    downloadBtn.disabled = true;

    try {
        const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9 // Max compression
            },
            comment: `Generated Electron project for websim downloading/packaging on ${new Date().toISOString()}`
        });
        saveAs(content, `${projectFolderName}.zip`);
        downloadBtn.textContent = 'Download Project (.zip)';
        downloadBtn.disabled = false;
    } catch(err) {
        console.error("Error generating zip file:", err);
        alert("Failed to generate the project zip file. Check console for details.");
        downloadBtn.textContent = 'Error - Try Again?';
        downloadBtn.disabled = false;
    }
});