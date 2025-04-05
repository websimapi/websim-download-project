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
*   Uses Electron Packager to create a distributable executable (.exe).

## Prerequisites

*   [Node.js](https://nodejs.org/) (version 16+ recommended, includes npm)
*   [Git](https://git-scm.com/) (optional, but recommended)

## Setup

1.  **Extract the zip file:** Unzip the downloaded `websim-downloader-packager.zip` file.

2.  **Navigate to the project directory:**
    ```bash
    cd websim-downloader-packager
    ```

3.  **Install dependencies:** This command installs Electron, Electron Packager, and other necessary libraries.
    ```bash
    npm install
    ```
    *Note: This might take a few minutes, especially the first time.*

4.  **(Windows Only) Prepare Icon:** The packager needs an `.ico` file for the executable icon.
    *   An `icon.svg` is provided in the `assets` folder.
    *   **You must convert `assets/icon.svg` to `assets/icon.ico`**. You can use online converters (search for "svg to ico converter") or image editing software.
    *   Place the resulting `icon.ico` file inside the `assets` folder. If you skip this, packaging might fail or use a default icon.

## Usage

1.  **Run the Electron application:**
    ```bash
    npm start
    ```
    This will open the application window.

2.  **Enter the Websim URL:** In the application window, enter the full URL of the websim you want to download (e.g., `https://example.com/my-websim/`). Make sure it's a publicly accessible URL.

3.  **Choose an Output Directory:** Click the "Browse..." button and select a folder where the final packaged application (the folder containing the `.exe`) will be saved.

4.  **Click "Download & Package":** The application will now perform the following steps (status updates will appear in the app window):
    *   Fetch the HTML content from the URL.
    *   Parse the HTML to find links to CSS, JavaScript, images, etc.
    *   Download these assets.
    *   Modify the HTML to point to the downloaded local assets.
    *   Create a temporary Electron project structure.
    *   Inject the downloaded content and the modified HTML into this structure.
    *   Install Electron within the temporary structure (required by the packager).
    *   Use `electron-packager` to build the final executable for Windows (x64).

5.  **Find the Executable:** Once the process completes successfully, navigate to the output directory you selected in step 3. Inside, you should find a folder named something like `packaged-websim-win32-x64`. This folder contains your standalone `.exe` file and other necessary resources. Double-click the `.exe` to run the packaged websim.

## How it Works

1.  **Fetching (main.js):** Uses the `axios` library to download the initial HTML from the target URL. It then uses `cheerio` (a server-side jQuery-like library) to parse the HTML structure. It identifies `<link href="...">`, `<script src="...">`, and `<img src="...">` tags (and potentially others). For each asset found, it resolves its full URL (handling relative paths like `/css/style.css` or `../images/logo.png`) and downloads it using `axios`.
2.  **Local Path Rewriting (main.js):** As assets are downloaded, the corresponding `href` or `src` attributes in the HTML are modified to point to the local file path within the package (e.g., `downloaded_assets/style.css`).
3.  **Temporary Electron Project Creation (main.js):** A temporary folder is created. Inside it, a basic Electron project is scaffolded:
    *   The modified HTML is saved as `index.html`.
    *   Downloaded assets are placed in a `downloaded_assets` subfolder.
    *   A minimal `main.js` (the Electron main process script for the *packaged* app) is created. This script simply creates a browser window and loads the local `index.html`.
    *   A minimal `package.json` defining the packaged app's structure and Electron dependency is created.
4.  **Dependency Installation for Package (main.js):** Critically, `npm install` is run *inside the temporary project directory*. This installs Electron there, which `electron-packager` needs to bundle.
5.  **Packaging (main.js):** The Node.js `child_process.exec` function is used to run the `electron-packager` command. This command takes the temporary project directory as input and builds the distributable application (including the Node.js runtime, Electron framework, and all the downloaded websim code/assets) into the specified output directory.
6.  **Interface (index.html, renderer.js, preload.js):** The user interface you interact with is also an Electron app.
    *   `index.html`: Defines the layout (URL input, directory selection, button, status area).
    *   `renderer.js`: Handles button clicks, calls backend functions via the preload script, and updates the status area.
    *   `preload.js`: Securely exposes specific Node.js/Electron functions (defined in `main.js` via `ipcMain.handle`) to the renderer process (`renderer.js`) using `contextBridge`. This is the secure way to communicate between the frontend UI and the backend Node.js capabilities in modern Electron.

## Important Considerations & Limitations

*   **Dynamic Content:** This tool primarily captures the *static* client-side code as served by the web server *at the time of download*. It might not capture content loaded dynamically via JavaScript after the initial page load, especially if that content relies on complex API interactions or server-side logic that cannot be replicated offline. The packaged app runs the downloaded JavaScript, but if that JS tries to fetch data from its original server, it will likely fail.
*   **Complex SPAs:** Single Page Applications (SPAs) built with frameworks like React, Angular, or Vue might be difficult to package correctly. Their routing, state management, and build processes often rely on server interaction or specific configurations not easily replicated by simple asset downloading.
*   **Server-Side Dependencies:** The packaged application will *only* contain the client-side code. Any functionality that requires communication with the original web server (e.g., fetching data from an API, user authentication, database interactions) will **not** work in the offline packaged version unless the original websim was designed to be fully functional offline.
*   **Path Issues:** While the tool attempts to handle relative paths for common assets (CSS, JS, images), complex cases (e.g., paths generated dynamically in JS, paths within CSS `url()`) might not be rewritten correctly, leading to broken styles or images in the packaged app.
*   **Asset Discovery:** The current implementation only looks for assets in specific tags (`link[rel=stylesheet]`, `script[src]`, `img[src]`). Assets loaded via other means (e.g., JavaScript fetch, CSS `@import`, inline styles with `url()`) might not be downloaded.
*   **Cross-Origin Resources:** The Node.js backend fetch can download resources from different domains, bypassing browser CORS limitations that would apply if fetching directly from the renderer.
*   **Build Size:** Including all assets can significantly increase the size of the final executable. Electron itself adds a considerable base size (~100MB+).
*   **Security (`webSecurity: false`):** The packaged app's `main.js` includes `webSecurity: false`. This is often necessary to allow the local `index.html` file to load other local resources (`file://...`) like the downloaded assets. However, **disabling web security can have security implications** if the downloaded code itself contains vulnerabilities or attempts malicious actions. Use with caution and only package trusted content.

## Development (Contributing)

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Install development dependencies if needed (`npm install --save-dev <package>`).
5.  Test thoroughly (`npm start` to run the downloader app).
6.  Commit your changes (`git commit -am 'Add some feature'`).
7.  Push to the branch (`git push origin feature/your-feature`).
8.  Create a new Pull Request.

## License

MIT License (See LICENSE file - you should add one, e.g., from choosealicense.com)
    `);

     // Add LICENSE file (MIT License example)
    projectFolder.file("LICENSE", `
MIT License

Copyright (c) ${new Date().getFullYear()} Your Name / AI Project Generator

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
    "package-win": "electron-packager . packaged-websim --platform=win32 --arch=x64 --out=dist/ --overwrite --icon=assets/icon.ico --ignore=\"^/dist$\" --ignore=\"^/temp-.*\" --ignore=\"^/node_modules/.*/(test|example|demo|benchmark)\" --ignore=\"^/\\.git$\"",
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
const fs = require('fs-extra'); // Use fs-extra for easier directory handling
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url'); // Standard Node.js URL module
const { exec } = require('child_process'); // To run electron-packager

let mainWindow;

// --- Configuration ---
const PACKAGED_APP_NAME = 'packaged-websim'; // Name for the output app folder/exe
const PACKAGED_ASSETS_DIR = 'downloaded_assets'; // Subfolder for downloaded assets inside the packaged app

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 850, // Slightly wider to accommodate text
        height: 650, // Slightly taller for status box
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Recommended for security
            nodeIntegration: false, // Keep false
            spellcheck: false, // Disable spellcheck in input fields if desired
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging renderer
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

// --- Helper Functions ---

// Function to send status updates to the renderer process
function sendStatus(window, message) {
    if (window && !window.isDestroyed() && window.webContents) {
       try {
           console.log(`[Status] ${message}`); // Log status to console as well
           window.webContents.send('status-update', message);
       } catch (e) {
          console.error("Failed to send status update:", e);
       }
    }
}

// Function to download a single asset
async function downloadAsset(assetUrl, localPath) {
    try {
        const response = await axios.get(assetUrl.href, {
            responseType: 'arraybuffer',
            timeout: 15000, // 15 second timeout for downloads
             // Spoof user agent - some sites might block default node/axios UA
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/9_1_0_4472_124 Safari/537.36'
            }
        });
        await fs.writeFile(localPath, Buffer.from(response.data));
        return true; // Indicate success
    } catch (err) {
        console.error(`Failed to download asset: ${assetUrl.href} - ${err.message}`);
        sendStatus(mainWindow, `Warning: Failed to download ${path.basename(assetUrl.pathname)} (${err.code || err.message})`);
        return false; // Indicate failure
    }
}

// --- IPC Handlers ---

// Handle request from renderer to select an output directory
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

// Handle the core download and package request
ipcMain.handle('download-and-package', async (event, targetUrl, outputDirUserSelected) => {
    // Validate inputs basic
     if (!targetUrl || !outputDirUserSelected) {
        throw new Error("Missing URL or Output Directory.");
    }
    let tempBuildDir; // Define here to be accessible in finally block

    try {
        // --- 1. Setup Directories ---
        tempBuildDir = path.join(app.getPath('temp'), `websim-build-${Date.now()}`);
        const appContentDir = path.join(tempBuildDir, 'app'); // Directory for the actual app content to be packaged
        const assetsDownloadDir = path.join(appContentDir, PACKAGED_ASSETS_DIR);

        sendStatus(mainWindow, `Using temporary build directory: ${tempBuildDir}`);
        await fs.ensureDir(appContentDir);
        await fs.ensureDir(assetsDownloadDir);

        // --- 2. Fetch Main HTML ---
        sendStatus(mainWindow, `Fetching HTML from: ${targetUrl}`);
        let response;
        try {
             response = await axios.get(targetUrl, {
                responseType: 'text',
                timeout: 20000, // 20s timeout for main HTML
                 headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/9_1_0_4472_124 Safari/537.36' }
             });
        } catch(htmlError) {
             throw new Error(`Failed to fetch base HTML: ${htmlError.message}`);
        }

        const htmlContent = response.data;
        const baseUrl = new URL(targetUrl); // Base for resolving relative URLs

        // --- 3. Parse HTML and Download Assets ---
        sendStatus(mainWindow, 'Parsing HTML and identifying assets...');
        const $ = cheerio.load(htmlContent);
        const downloadTasks = [];
        const assetMap = new Map(); // Tracks original URL -> local relative path
        let assetCounter = 0;

        // Select common elements that link external resources
        $('link[rel="stylesheet"][href], script[src], img[src], source[src], track[src], video[poster]').each((index, element) => {
            const $el = $(element);
            let srcAttr = 'href'; // Default for stylesheets
            if ($el.is('script') || $el.is('img') || $el.is('source') || $el.is('track') ) {
                srcAttr = 'src';
            } else if ($el.is('video[poster]')) {
                 srcAttr = 'poster';
            }
            // Add more selectors/attributes here if needed (e.g., 'video>source[src]', 'audio[src]')

            const originalUrlStr = $el.attr(srcAttr);
            if (!originalUrlStr || originalUrlStr.startsWith('data:')) { // Skip empty or data URIs
                 return;
            }

            try {
                const assetUrl = new URL(originalUrlStr, baseUrl.href); // Resolve relative URLs correctly

                // Basic filename extraction, sanitize, and ensure uniqueness
                let filename = path.basename(assetUrl.pathname);
                 // Remove query parameters/hash from filename if present
                filename = filename.split('?')[0].split('#')[0];
                 // Basic sanitization (replace non-alphanumeric/dot/underscore/hyphen with '_')
                filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || `asset_${assetCounter++}${path.extname(assetUrl.pathname) || '.dat'}`;


                const localPath = path.join(assetsDownloadDir, filename);
                // Relative path from the packaged app's root (where index.html will be)
                 const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\\\/g, '/'); // Use forward slashes for HTML

                // Only download if we haven't encountered this exact URL before
                if (!assetMap.has(assetUrl.href)) {
                     assetMap.set(assetUrl.href, relativePathForHtml); // Store mapping
                     sendStatus(mainWindow, `Queueing download: ${filename} (from ${assetUrl.origin})`);
                    // Add download promise to the list
                    downloadTasks.push(
                         downloadAsset(assetUrl, localPath).then(success => {
                             if (success) {
                                 // Update the HTML attribute only if download succeeded
                                 $el.attr(srcAttr, relativePathForHtml);
                             } else {
                                // Optionally remove the element or leave the original URL if download fails?
                                // Leaving original URL might be better than broken links.
                                // $el.remove(); // Or comment out if keeping original is better
                             }
                         })
                    );
                } else {
                     // Asset URL seen before, just update the HTML attribute to the existing local path
                     $el.attr(srcAttr, assetMap.get(assetUrl.href));
                }

            } catch (urlError) {
               console.error(`Skipping invalid URL: '${originalUrlStr}' - ${urlError.message}`);
               sendStatus(mainWindow, `Warning: Skipping invalid URL '${originalUrlStr}'`);
            }
        });

        sendStatus(mainWindow, `Found ${assetMap.size} unique assets to download. Starting downloads...`);
        await Promise.all(downloadTasks); // Wait for all downloads to complete (or fail)
        sendStatus(mainWindow, 'Asset download process finished.');

        // --- 4. Save Modified HTML ---
        const finalHtmlContent = $.html();
        await fs.writeFile(path.join(appContentDir, 'index.html'), finalHtmlContent);
        sendStatus(mainWindow, 'Modified HTML saved.');

        // --- 5. Prepare Electron Boilerplate for Packaged App ---
        sendStatus(mainWindow, 'Creating boilerplate for packaged app...');
        // Main process script for the packaged application
        const packageMainJsContent = `
            const { app, BrowserWindow } = require('electron');
            const path = require('path');

            function createWindow () {
                const mainWindow = new BrowserWindow({
                    width: 1280, // Default size for packaged app
                    height: 800,
                    webPreferences: {
                        // --- Security Note ---
                        // sandbox: true, // Enabling sandbox is safer but might break some content if it relies on Node.js APIs in renderer. Test carefully.
                        nodeIntegration: false, // Essential for security if loading external content.
                        contextIsolation: true, // Essential for security.
                        // --- Important for local files ---
                        webSecurity: false, // Often REQUIRED to allow file:// URLs (index.html) to load other file:// URLs (assets). Understand the risks.
                        // preload: path.join(__dirname, 'preload.js') // Uncomment if the packaged app needs a preload script
                    },
                    // Auto-hide menu bar for a cleaner look, user can press Alt to show it
                    autoHideMenuBar: true,
                });

                // Load the downloaded index.html from the app's root directory
                 // Using file path join ensures correct slashes for the OS
                mainWindow.loadFile(path.join(__dirname, 'index.html'));

                // Optional: Open DevTools in packaged app for debugging
                // mainWindow.webContents.openDevTools();
            }

            // Disable hardware acceleration - might help compatibility on some systems
            // app.disableHardwareAcceleration();

            app.whenReady().then(createWindow);

            app.on('window-all-closed', () => {
                // Standard quit behavior unless on macOS
                if (process.platform !== 'darwin') {
                    app.quit();
                }
            });

            app.on('activate', () => {
                // Re-create window on macOS dock click if none are open
                if (BrowserWindow.getAllWindows().length === 0) {
                    createWindow();
                }
            });
        `;
        await fs.writeFile(path.join(appContentDir, 'main.js'), packageMainJsContent);

        // Package.json for the packaged application
        // It MUST declare electron as a devDependency for electron-packager
         const packageJsonContent = JSON.stringify({
            name: PACKAGED_APP_NAME.toLowerCase().replace(/\\s+/g, '-'), // Sanitize name
            version: "1.0.0",
            description: `Packaged version of ${baseUrl.host}`,
            main: "main.js",
            author: "Websim Packager",
            license: "UNLICENSED", // Content license depends on the source
            dependencies: {
                 // Add any runtime dependencies needed *by the packaged websim's JS* here.
                 // Usually empty unless the original site required specific Node modules client-side (uncommon).
            },
            devDependencies: {
                "electron": require('./package.json').devDependencies.electron // Use same Electron version as downloader app
            }
        }, null, 2); // Pretty print JSON
        await fs.writeFile(path.join(appContentDir, 'package.json'), packageJsonContent);


        // --- 6. Install Dependencies for Packaged App ---
        // electron-packager needs the 'electron' dependency installed within the target directory.
        sendStatus(mainWindow, 'Installing dependencies for the packaged app (this may take a moment)...');
        await new Promise((resolve, reject) => {
            // Use 'npm ci' for potentially faster/cleaner installs if package-lock.json were present,
            // but 'npm install' is more general.
             const installCommand = 'npm install --production'; // Only install runtime deps (if any) + electron devDep
             exec(installCommand, { cwd: appContentDir, timeout: 180000 /* 3 min timeout */ }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Packaged app 'npm install' error: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    sendStatus(mainWindow, `Error installing dependencies for package: ${stderr || error.message}`);
                    return reject(new Error(`npm install failed in temp directory: ${stderr || error.message}`));
                }
                console.log(`Packaged app 'npm install' stdout: ${stdout}`);
                sendStatus(mainWindow, 'Packaged app dependencies installed.');
                resolve();
            });
        });

        // --- 7. Package the App using Electron Packager ---
        sendStatus(mainWindow, 'Starting application packaging (electron-packager)...');
        // Ensure the user-selected output directory exists
        await fs.ensureDir(outputDirUserSelected);

        // Construct the electron-packager command
        // Use npx to ensure it uses the locally installed or a cached version
         // Target: Windows 64-bit. Add more platforms if needed (e.g., --platform=darwin,linux)
         // --overwrite: Replace existing output folder if present
         // --out: Specify the user's chosen directory
         // --icon: Path to the icon file (relative to the *downloader project*, not temp dir)
         // --ignore: Prevent unnecessary files from being copied into the package
         const iconPath = path.resolve(__dirname, 'assets', 'icon.ico'); // Absolute path to icon
         const ignorePatterns = [
            "/node_modules/electron($|/)", // Ignore electron itself in final package (packager adds it)
             "/node_modules/electron-packager($|/)", // Ignore packager
             "/\\.git($|/)",
             "/dist($|/)", // Ignore downloader's dist
             "/temp-build-.*" // Ignore build dirs
         ].map(p => `--ignore="${p}"`).join(" "); // Format for command line


         // Check if icon exists before packaging
         let iconArg = '';
         if (await fs.pathExists(iconPath)) {
             iconArg = `--icon="${iconPath}"`;
             sendStatus(mainWindow, `Using icon: ${iconPath}`);
         } else {
              sendStatus(mainWindow, `Warning: Icon file not found at ${iconPath}. Using default icon.`);
         }

        const packagerCommand = `npx electron-packager . "${PACKAGED_APP_NAME}" --platform=win32 --arch=x64 --out="${outputDirUserSelected}" --overwrite ${iconArg}`;
        // Note: electron-packager runs from within the appContentDir

        await new Promise((resolve, reject) => {
            exec(packagerCommand, { cwd: appContentDir, timeout: 300000 /* 5 min timeout */ }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`electron-packager execution error: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    sendStatus(mainWindow, `Packaging failed: ${stderr || error.message}`);
                    return reject(new Error(`electron-packager command failed: ${stderr || error.message}`));
                }
                console.log(`electron-packager stdout: ${stdout}`);
                 // Check stderr for warnings, even if command succeeded
                 if (stderr) {
                     console.warn(`electron-packager stderr (warnings):\n${stderr}`);
                     sendStatus(mainWindow, `Packaging finished with warnings (see console for details).`);
                 } else {
                    sendStatus(mainWindow, 'Application packaging successful!');
                 }
                resolve();
            });
        });

        // --- 8. Success ---
        const finalOutputPath = path.join(outputDirUserSelected, `${PACKAGED_APP_NAME}-win32-x64`); // Default output folder name structure
        sendStatus(mainWindow, `Packaging complete. Application saved to: ${finalOutputPath}`);
        return { success: true, outputDir: finalOutputPath };

    } catch (error) {
        console.error("Error during download/packaging process:", error);
        // Send specific error message if available, otherwise generic
        const errorMessage = error.message || "An unknown error occurred.";
        sendStatus(mainWindow, `ERROR: ${errorMessage}`);
        // Ensure the full error stack trace is logged to the console for debugging
        console.error(error.stack);
        return { success: false, error: errorMessage }; // Return error info to renderer
    } finally {
        // --- 9. Cleanup ---
        if (tempBuildDir) {
            try {
                 // Optional: Delay cleanup or make conditional for debugging
                 // await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
                 sendStatus(mainWindow, `Cleaning up temporary directory: ${tempBuildDir}`);
                 await fs.remove(tempBuildDir);
                 sendStatus(mainWindow, 'Temporary directory cleaned up.');
            } catch (cleanupError) {
                console.error(`Failed to clean up temporary directory ${tempBuildDir}: ${cleanupError.message}`);
                sendStatus(mainWindow, `Warning: Could not fully clean up temporary directory: ${cleanupError.message}`);
            }
        }
        sendStatus(mainWindow, 'Process finished.');
    }
});
    `);

    // Add preload.js (Electron preload script)
    projectFolder.file("preload.js", `
const { contextBridge, ipcRenderer } = require('electron');

// --- Expose specific APIs to the Renderer process ---
// Only expose the functions needed, adhering to the principle of least privilege.
contextBridge.exposeInMainWorld('electronAPI', {
    // Renderer can invoke 'select-output-directory' in the main process
    selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),

    // Renderer can invoke 'download-and-package' in the main process with arguments
    downloadAndPackage: (url, outputDir) => ipcRenderer.invoke('download-and-package', url, outputDir),

    // Renderer can set up a listener for 'status-update' events sent from the main process
    onStatusUpdate: (callback) => {
        // Create a validated listener function
         const subscription = (_event, value) => callback(value);
         // Add the listener
        ipcRenderer.on('status-update', subscription);
        // Return a function to remove the listener (cleanup)
        return () => ipcRenderer.removeListener('status-update', subscription);
    },

    // Example of sending a simple message *to* main (if needed, though invoke covers most cases)
    // sendMessageToMain: (message) => ipcRenderer.send('message-channel', message)
});

console.log('[Preload] Electron APIs exposed to renderer.');

// You could also expose specific Node.js modules here if absolutely necessary,
// but it's generally safer to handle Node.js operations in the main process
// and expose only specific functions via ipcRenderer.invoke/on.
// e.g., contextBridge.exposeInMainWorld('nodeAPI', { platform: process.platform });
    `);

    // Add index.html (Electron renderer process UI)
    projectFolder.file("index.html", `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <!-- Recommended CSP for Electron -->
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
        }
        .container {
            background-color: #fff;
            padding: 25px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            flex-grow: 0; /* Don't grow container */
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
            width: 100%; /* Full width within container */
            padding: 10px 12px;
            margin-bottom: 18px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box; /* Include padding and border in width */
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
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        button#selectDirBtn {
            background-color: var(--secondary-color);
            color: white;
        }
        button#selectDirBtn:hover {
            background-color: #5a6268;
            box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
        button#packageBtn {
            background-color: var(--primary-color);
            color: white;
        }
        button#packageBtn:hover {
            background-color: #0056b3;
            box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
        button:disabled {
            background-color: #cccccc;
            color: #666;
            cursor: not-allowed;
            box-shadow: none;
        }
        .dir-selection {
            display: flex;
            align-items: center; /* Align input and button vertically */
            margin-bottom: 20px; /* Spacing below directory selection */
        }
        .dir-selection input[type="text"] {
            flex-grow: 1; /* Input takes available space */
            margin: 0 10px 0 0; /* Remove bottom margin, add right margin */
        }
        .status-container {
             flex-grow: 1; /* Status takes remaining vertical space */
             display: flex; /* Use flexbox for inner content */
             flex-direction: column;
        }
        #status {
            margin-top: 10px;
            padding: 15px;
            background-color: var(--medium-gray);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: "Consolas", "Monaco", monospace;
            font-size: 0.875rem; /* Slightly smaller font */
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-y: auto; /* Enable vertical scrolling */
             flex-grow: 1; /* Make status box fill available space */
             border-top: 3px solid var(--secondary-color);
             line-height: 1.4;
             color: #333;
        }
         .status-label {
            font-weight: 600;
            color: #555;
            margin-bottom: 5px; /* Space above the status box */
         }
        .status-line.error {
            color: var(--error-color);
            font-weight: bold;
        }
        .status-line.warning {
            color: #ffc107; /* Bootstrap warning yellow */
        }
        .status-line.success {
            color: var(--success-color);
            font-weight: bold;
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
        <div id="status">Welcome! Enter a URL and select an output directory to begin.</div>
    </div>

    <script src="./renderer.js"></script>
</body>
</html>
    `);

    // Add renderer.js (Electron renderer process logic)
    projectFolder.file("renderer.js", `
console.log('[Renderer] Script loaded.');

// --- DOM Element References ---
const urlInput = document.getElementById('urlInput');
const outputDirInput = document.getElementById('outputDirInput');
const selectDirBtn = document.getElementById('selectDirBtn');
const packageBtn = document.getElementById('packageBtn');
const statusDiv = document.getElementById('status');

// --- State ---
let isProcessing = false;
let statusUpdateUnsubscribe = null; // To hold the cleanup function for the listener

// --- Utility Functions ---
function addStatus(message, type = 'info') {
    console.log(`[Status-${type}] ${message}`); // Log to console with type

    const line = document.createElement('div');
    line.classList.add('status-line');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    // Add styling based on type
    if (type === 'error') {
        line.classList.add('error');
    } else if (type === 'warning') {
        line.classList.add('warning');
    } else if (type === 'success') {
        line.classList.add('success');
    }

    statusDiv.appendChild(line);
    statusDiv.scrollTop = statusDiv.scrollHeight; // Auto-scroll to the bottom
}

function clearStatus() {
    statusDiv.innerHTML = ''; // Clear previous messages
}

function setControlsEnabled(enabled) {
    isProcessing = !enabled; // Update processing state
    urlInput.disabled = !enabled;
    outputDirInput.disabled = !enabled; // Technically readonly, but disable visual style change
    selectDirBtn.disabled = !enabled;
    // Package button enablement depends on form validity *and* not processing
    packageBtn.disabled = !enabled || !isFormValid();
}

// --- Form Validation ---
function isFormValid() {
    // Check if URL is reasonably valid (basic check, type="url" helps)
    const isUrlValid = urlInput.checkValidity() && urlInput.value.trim() !== '';
    // Check if output directory is selected
    const isDirSelected = outputDirInput.value.trim() !== '';
    return isUrlValid && isDirSelected;
}

function checkFormValidityAndUpdateButton() {
    // Enable package button only if form is valid AND not currently processing
    packageBtn.disabled = !isFormValid() || isProcessing;
}

// --- Event Listeners ---

// When the "Browse..." button is clicked
selectDirBtn.addEventListener('click', async () => {
    addStatus('Opening directory selector...');
    setControlsEnabled(false); // Disable controls while dialog is open
    try {
        // Call the function exposed from main process via preload script
        const directoryPath = await window.electronAPI.selectOutputDirectory();
        if (directoryPath) {
            outputDirInput.value = directoryPath;
            addStatus(`Output directory selected: ${directoryPath}`);
            checkFormValidityAndUpdateButton(); // Re-check form validity
        } else {
             addStatus('Directory selection cancelled.', 'warning');
        }
    } catch (error) {
        console.error('Error selecting directory:', error);
        addStatus(`Error selecting directory: ${error.message}`, 'error');
    } finally {
         setControlsEnabled(true); // Re-enable controls
    }
});

// When the "Download & Package" button is clicked
packageBtn.addEventListener('click', async () => {
    if (!isFormValid() || isProcessing) {
        return; // Should not happen if button is disabled correctly, but check anyway
    }

    const targetUrl = urlInput.value.trim();
    const outputDir = outputDirInput.value.trim();

    clearStatus(); // Clear previous log
    addStatus(`Starting process for: ${targetUrl}`);
    setControlsEnabled(false); // Disable UI during operation

    try {
        // Call the main process function and wait for result
        const result = await window.electronAPI.downloadAndPackage(targetUrl, outputDir);

        if (result.success) {
            addStatus(`------------------------------------------`, 'success');
            addStatus(`SUCCESS! Application packaged successfully.`, 'success');
            addStatus(`Output Location: ${result.outputDir}`, 'success');
            addStatus(`------------------------------------------`, 'success');
        } else {
             // Error message should have already been sent via status updates from main
             addStatus(`------------------------------------------`, 'error');
            addStatus(`FAILURE: Process failed. See log above for details.`, 'error');
             addStatus(`Error summary: ${result.error}`, 'error');
             addStatus(`------------------------------------------`, 'error');
        }
    } catch (error) {
        // Catch errors *invoking* the IPC function itself (less common)
        console.error('IPC invocation error:', error);
        addStatus(`------------------------------------------`, 'error');
        addStatus(`CRITICAL RENDERER ERROR: Failed to communicate with main process: ${error.message}`, 'error');
        addStatus(`------------------------------------------`, 'error');
    } finally {
        setControlsEnabled(true); // Re-enable UI
    }
});

// Listen for changes in the URL input to update button state
urlInput.addEventListener('input', checkFormValidityAndUpdateButton);

// --- Initialization ---

// Set initial button state based on any pre-filled values (unlikely but good practice)
checkFormValidityAndUpdateButton();

// Set up the listener for status updates from the main process
if (window.electronAPI && typeof window.electronAPI.onStatusUpdate === 'function') {
    statusUpdateUnsubscribe = window.electronAPI.onStatusUpdate((message) => {
         // Basic parsing for type hints from main process log
        if (message.startsWith('ERROR:')) {
            addStatus(message.substring(6).trim(), 'error');
        } else if (message.startsWith('Warning:')) {
            addStatus(message.substring(8).trim(), 'warning');
        } else if (message.includes('successful!') || message.includes('SUCCESS!')) {
            addStatus(message, 'success');
        } else {
            addStatus(message, 'info');
        }
    });
    console.log("[Renderer] Status update listener registered.");
} else {
    console.error("[Renderer] ERROR: electronAPI.onStatusUpdate not found. Preload script might have failed.");
    addStatus("Error: Cannot receive status updates from backend.", 'error');
}

// Add initial welcome message.
// Use setTimeout to ensure it appears after any potential initial load messages.
setTimeout(() => {
     if (statusDiv.childElementCount <= 1) { // Add only if no other messages appeared quickly
        clearStatus();
        addStatus("Ready. Enter a valid URL and select an output directory.");
     }
}, 100);


// Optional: Clean up listener when the window is closed (though Electron usually handles this)
window.addEventListener('beforeunload', () => {
    if (statusUpdateUnsubscribe) {
        console.log("[Renderer] Cleaning up status update listener.");
        statusUpdateUnsubscribe();
    }
});
    `);

    // --- Assets ---
    const assetsFolder = projectFolder.folder("assets");

    // Add placeholder SVG icon - User needs to convert this to ICO for Windows packaging
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

    // Add .gitignore
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
websim-build-*/

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


    // --- Generate and Download Zip ---
    zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 9 // Max compression
            }
        })
        .then(function(content) {
            saveAs(content, `${projectFolderName}.zip`);
        })
        .catch(err => {
            console.error("Error generating zip file:", err);
            alert("Failed to generate the project zip file. See console for details.");
        });
});