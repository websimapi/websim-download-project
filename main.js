const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const cheerio = require('cheerio');
const { exec } = require('child_process');
const os = require('os');
const url = require('url');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
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

// IPC handlers
ipcMain.handle('select-output-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
    if (result.canceled) {
        return null;
    }
    
    return result.filePaths[0];
});

ipcMain.handle('download-and-package', async (event, targetUrl, outputDir) => {
    try {
        sendStatusUpdate('Starting download process...');
        
        // Create temporary directory
        const tempDir = path.join(os.tmpdir(), `websim-build-${Date.now()}`);
        const appDir = path.join(tempDir, 'app');
        await fs.ensureDir(appDir);
        
        sendStatusUpdate(`Created temporary directory at: ${tempDir}`);
        
        // Download the webpage
        sendStatusUpdate(`Downloading webpage from: ${targetUrl}`);
        const { data } = await axios.get(targetUrl);
        
        // Parse HTML
        const $ = cheerio.load(data);
        const baseUrl = new URL(targetUrl).origin;
        
        // Create app structure
        sendStatusUpdate('Creating Electron app structure...');
        await fs.writeFile(path.join(appDir, 'index.html'), data);
        await fs.writeFile(path.join(appDir, 'main.js'), createMainJs());
        await fs.writeFile(path.join(appDir, 'preload.js'), createPreloadJs());
        
        // Create package.json
        const packageJson = {
            name: "websim-packaged-app",
            version: "1.0.0",
            description: "Packaged Websim Application",
            main: "main.js",
            scripts: {
                start: "electron ."
            },
            dependencies: {
                electron: "^27.1.0"
            }
        };
        
        await fs.writeFile(
            path.join(appDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
        
        sendStatusUpdate('Installing dependencies for the packaged app (this may take a moment)...');
        try {
            await runCommand(`cd "${appDir}" && npm install`, (output) => {
                sendStatusUpdate(output);
            });
        } catch (error) {
            sendStatusUpdate(`npm install failed in temp directory: ${error.message}`);
            throw new Error(`npm install failed in temp directory: ${error.message}`);
        }
        
        // Download all linked assets
        sendStatusUpdate('Downloading assets...');
        const assetsDir = path.join(appDir, 'assets');
        await fs.ensureDir(assetsDir);
        
        // Replace scripts and styles with local versions
        $('script[src]').each(async function() {
            const src = $(this).attr('src');
            if (src && !src.startsWith('data:') && !src.includes('://')) {
                const assetUrl = new URL(src, targetUrl).href;
                const assetPath = path.join(assetsDir, path.basename(src));
                
                try {
                    const response = await axios.get(assetUrl, { responseType: 'text' });
                    await fs.writeFile(assetPath, response.data);
                    $(this).attr('src', `assets/${path.basename(src)}`);
                } catch (error) {
                    sendStatusUpdate(`Failed to download script: ${src}`);
                }
            }
        });
        
        // Do similar for CSS files, images, etc.
        // This is a simplified version and would need to be expanded for production use
        
        // Write modified HTML back to disk
        await fs.writeFile(path.join(appDir, 'index.html'), $.html());
        
        // Package the app
        sendStatusUpdate('Packaging the application...');
        
        try {
            // Use electron-packager to create a standalone executable
            const packagerCommand = `npx electron-packager "${appDir}" --out="${outputDir}" --overwrite`;
            
            await runCommand(packagerCommand, (output) => {
                sendStatusUpdate(output);
            });
            
            sendStatusUpdate('Packaging completed successfully!');
            return { success: true, outputDir };
        } catch (error) {
            sendStatusUpdate(`Packaging failed: ${error.message}`);
            throw new Error(`electron-packager command failed: ${error.message}`);
        }
    } catch (error) {
        console.error('Error in downloadAndPackage:', error);
        return { success: false, error: error.message };
    }
});

function createMainJs() {
    return `const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile('index.html');
    // Uncomment to open DevTools automatically
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});`;
}

function createPreloadJs() {
    return `// This is an empty preload script
// It can be used to expose Node APIs to the renderer process
// in a secure way if needed later.
window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded');
});`;
}

function sendStatusUpdate(message) {
    console.log(message);
    if (mainWindow) {
        mainWindow.webContents.send('status-update', message);
    }
}

async function runCommand(command, outputCallback) {
    return new Promise((resolve, reject) => {
        const childProcess = exec(command);
        
        childProcess.stdout.on('data', (data) => {
            outputCallback(data.toString());
        });
        
        childProcess.stderr.on('data', (data) => {
            outputCallback(data.toString());
        });
        
        childProcess.on('error', (error) => {
            reject(error);
        });
        
        childProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command exited with code ${code}`));
            }
        });
    });
}