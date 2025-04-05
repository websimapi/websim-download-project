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
           console.log(`[Status] ${message}`); 
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
        console.error(`Failed to download asset: ${assetUrl.href} - ${err.message}`); 
        sendStatus(mainWindow, `Warning: Failed to download ${path.basename(assetUrl.pathname)} (${err.code || err.message})`); 
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
        tempBuildDir = path.join(app.getPath('temp'), `websim-build-${Date.now()}`); 
        const appContentDir = path.join(tempBuildDir, 'app'); 
        const assetsDownloadDir = path.join(appContentDir, PACKAGED_ASSETS_DIR);

        sendStatus(mainWindow, `Using temporary build directory: ${tempBuildDir}`); 
        await fs.ensureDir(appContentDir);
        await fs.ensureDir(assetsDownloadDir);

        sendStatus(mainWindow, `Fetching HTML from: ${targetUrl}`); 
        let response;
        try {
             response = await axios.get(targetUrl, {
                responseType: 'text',
                timeout: 20000, 
                 headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36' }
             });
        } catch(htmlError) {
             throw new Error(`Failed to fetch base HTML: ${htmlError.message}`); 
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
                 filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || `asset_${assetCounter++}${path.extname(assetUrl.pathname) || '.dat'}`; 


                const localPath = path.join(assetsDownloadDir, filename);
                const relativePathForHtml = path.join(PACKAGED_ASSETS_DIR, filename).replace(/\\/g, '/'); 

                if (!assetMap.has(assetUrl.href)) {
                     assetMap.set(assetUrl.href, relativePathForHtml); 
                     sendStatus(mainWindow, `Queueing download: ${filename} (from ${assetUrl.origin})`); 
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
               console.error(`Skipping invalid URL: '${originalUrlStr}' - ${urlError.message}`); 
               sendStatus(mainWindow, `Warning: Skipping invalid URL '${originalUrlStr}'`); 
            }
        });

        sendStatus(mainWindow, `Found ${assetMap.size} unique assets to download. Starting downloads...`); 
        await Promise.all(downloadTasks); 
        sendStatus(mainWindow, 'Asset download process finished.');

        const finalHtmlContent = $.html();
        await fs.writeFile(path.join(appContentDir, 'index.html'), finalHtmlContent);
        sendStatus(mainWindow, 'Modified HTML saved.');

        sendStatus(mainWindow, 'Creating boilerplate for packaged app...');
        const packageMainJsContent = `
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
        `;
        await fs.writeFile(path.join(appContentDir, 'main.js'), packageMainJsContent);

        // Get electron version from the *downloader's* package.json
        let electronVersion;
        try {
            const ownPackageJson = require('./package.json');
            electronVersion = ownPackageJson.devDependencies.electron;
            if (!electronVersion) throw new Error('Electron version not found in devDependencies.');
             sendStatus(mainWindow, `Using Electron version: ${electronVersion}`); 
        } catch (e) {
            console.error("Failed to read own package.json for Electron version:", e);
            sendStatus(mainWindow, "Warning: Could not determine Electron version. Using default 'latest'.");
            electronVersion = "latest"; 
        }


        const packageJsonContent = JSON.stringify({
            name: PACKAGED_APP_NAME.toLowerCase().replace(/\s+/g, '-'), 
            version: "1.0.0",
            description: `Packaged version of ${baseUrl.host}`, 
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
                    console.error(`Packaged app 'npm install' error: ${error.message}`); 
                    console.error(`stderr: ${stderr}`); 
                    let errorDetail = stderr || error.message;
                    if (errorDetail.includes("EACCES")) {
                        errorDetail = "Permission denied. Try running the command with sudo or check file/folder permissions.";
                    } else if (errorDetail.includes("ENOENT")) {
                         errorDetail = "Command not found (ENOENT). Ensure npx and electron-packager are correctly installed/accessible.";
                    } else if (errorDetail.includes("Syntax error")) {
                         errorDetail = `Shell syntax error during packaging: ${errorDetail}`;
                    }
                    sendStatus(mainWindow, `Error installing dependencies for package: ${stderr || error.message}`); 
                    return reject(new Error(`npm install failed in temp directory: ${stderr || error.message}`)); 
                }
                 // Log warnings from stderr as well
                 if (stderr) {
                     console.warn(`Packaged app 'npm install' stderr (warnings):\n${stderr}`); 
                     sendStatus(mainWindow, `Dependency installation completed with warnings (see console).`);
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
                 iconArg = `--icon="${iconPath.replace(/\\/g, '/')}"`; 
                 sendStatus(mainWindow, `Using icon: ${iconPath}`); 
             } else {
                  sendStatus(mainWindow, `Warning: Icon file not found at ${iconPath}. Using default icon.`); 
             }
        } catch(iconError) {
             sendStatus(mainWindow, `Warning: Error checking for icon file: ${iconError.message}`); 
        }


        const finalAppName = PACKAGED_APP_NAME;
        const finalOutputDir = outputDirUserSelected.replace(/\\/g, '/'); 
        const packagerCommand = `npx electron-packager . "${finalAppName}" --platform=win32 --arch=x64 --out="${finalOutputDir}" --overwrite ${iconArg} ${ignoreString}`; 
        sendStatus(mainWindow, `Executing: ${packagerCommand}`); 

        await new Promise((resolve, reject) => {
            exec(packagerCommand, { cwd: appContentDir, timeout: 600000 }, (error, stdout, stderr) => { 
                if (error) {
                    console.error(`electron-packager execution error: ${error.message}`); 
                    console.error(`stderr: ${stderr}`); 
                    let errorDetail = stderr || error.message;
                    if (errorDetail.includes("EACCES")) {
                        errorDetail = "Permission denied. Try running the command with sudo or check file/folder permissions.";
                    } else if (errorDetail.includes("ENOENT")) {
                         errorDetail = "Command not found (ENOENT). Ensure npx and electron-packager are correctly installed/accessible.";
                    } else if (errorDetail.includes("Syntax error")) {
                         errorDetail = `Shell syntax error during packaging: ${errorDetail}`;
                    }
                    sendStatus(mainWindow, `Packaging failed: ${errorDetail}`); 
                    return reject(new Error(`electron-packager command failed: ${errorDetail}`)); 
                }
                console.log(`electron-packager stdout: ${stdout}`); 
                 if (stderr) {
                     console.warn(`electron-packager stderr (warnings):\n${stderr}`); 
                     sendStatus(mainWindow, `Packaging finished with warnings (see console for details).`);
                 } else {
                    sendStatus(mainWindow, 'Application packaging successful!');
                 }
                resolve();
            });
        });

        const finalOutputPath = path.join(outputDirUserSelected, `${PACKAGED_APP_NAME}-win32-x64`); 
        sendStatus(mainWindow, `Packaging complete. Application saved to: ${finalOutputPath}`); 
        return { success: true, outputDir: finalOutputPath };

    } catch (error) {
        console.error("Error during download/packaging process:", error);
        const errorMessage = error.message || "An unknown error occurred.";
        sendStatus(mainWindow, `ERROR: ${errorMessage}`); 
        console.error(error.stack);
        return { success: false, error: errorMessage }; 
    } finally {
        if (tempBuildDir) {
            try {
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
