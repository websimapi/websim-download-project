import JSZip from 'jszip';
import { saveAs } from 'file-saver';

document.getElementById('downloadBtn').addEventListener('click', async () => {
    try {
        const zip = new JSZip();
        
        // Create package.json
        const packageJson = {
            "name": "websim-downloader-packager",
            "version": "1.0.0",
            "description": "Electron application to fetch and package websim sources",
            "main": "main.js",
            "scripts": {
                "start": "electron ."
            },
            "author": "",
            "license": "ISC",
            "dependencies": {
                "axios": "^1.6.2",
                "cheerio": "^1.0.0-rc.12",
                "electron": "^27.1.0",
                "fs-extra": "^11.1.1"
            },
            "devDependencies": {}
        };

        // Add the main Node.js files
        zip.file('package.json', JSON.stringify(packageJson, null, 2));
        zip.file('main.js', await fetchProjectFile('script.js'));
        zip.file('preload.js', createPreloadJs());
        zip.file('index.html', createIndexHtml());

        // Create README file
        zip.file('README.md', createReadme());
        
        // Create zip file
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'websim-downloader-packager.zip');
    } catch (error) {
        console.error('Error creating zip:', error);
        alert('Failed to create the project zip file: ' + error.message);
    }
});

async function fetchProjectFile(filename) {
    const response = await fetch(filename);
    return await response.text();
}

function createPreloadJs() {
    return `const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
    downloadAndPackage: (url, outputDir) => ipcRenderer.invoke('download-and-package', url, outputDir),
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (_, message) => callback(message));
    }
});`;
}

function createIndexHtml() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Websim Packager</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2 {
            color: #333;
        }
        input, button {
            padding: 10px;
            margin: 5px 0;
        }
        input {
            width: 100%;
            box-sizing: border-box;
        }
        button {
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        #status {
            margin-top: 20px;
            padding: 10px;
            border-left: 4px solid #2196F3;
            background-color: #E3F2FD;
            max-height: 300px;
            overflow-y: auto;
        }
        .url-form {
            display: flex;
            gap: 10px;
        }
        .url-form input {
            flex-grow: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Websim Downloader & Packager</h1>
        <p>Enter the URL of a Websim page to download and package as a standalone Electron application.</p>
        
        <div class="url-form">
            <input type="text" id="urlInput" placeholder="https://example.com/websim-page">
            <button id="startBtn">Start</button>
        </div>
        
        <div id="status">
            <p>Ready to package a websim. Enter a URL and click Start.</p>
        </div>
    </div>

    <script>
        const urlInput = document.getElementById('urlInput');
        const startBtn = document.getElementById('startBtn');
        const statusDiv = document.getElementById('status');
        
        function addStatus(message) {
            const p = document.createElement('p');
            p.textContent = message;
            statusDiv.appendChild(p);
            statusDiv.scrollTop = statusDiv.scrollHeight;
        }
        
        window.electronAPI.onStatusUpdate((message) => {
            addStatus(message);
        });
        
        startBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                addStatus('Please enter a valid URL.');
                return;
            }
            
            try {
                addStatus(`Starting process for URL: ${url}`);
                const outputDir = await window.electronAPI.selectOutputDirectory();
                
                if (!outputDir) {
                    addStatus('Process cancelled: No output directory selected.');
                    return;
                }
                
                addStatus(`Selected output directory: ${outputDir}`);
                addStatus('Starting download and packaging process...');
                
                const result = await window.electronAPI.downloadAndPackage(url, outputDir);
                
                if (result.success) {
                    addStatus(`SUCCESS! Packaged app saved to: ${result.outputDir}`);
                } else {
                    addStatus(`FAILURE: Process encountered an error.`);
                    addStatus(`Error details: ${result.error}`);
                    addStatus(`------------------------------------------`);
                }
            } catch (error) {
                addStatus(`ERROR: ${error.message}`);
            }
        });
    </script>
</body>
</html>`;
}

function createReadme() {
    return `# Websim Downloader & Packager

## Overview
This Electron application allows you to download any websim page and package it as a standalone Electron application. It fetches all required assets and creates a portable Windows executable (.exe) that can run offline.

## Installation

1. Extract the ZIP file
2. Open a terminal/command prompt in the extracted directory
3. Install dependencies:
   ```
   npm install
   ```
4. Start the application:
   ```
   npm start
   ```

## Requirements
- Node.js (v14 or higher)
- npm (v6 or higher)
- Windows, macOS, or Linux (packaging for Windows produces .exe files)

## Usage

1. Launch the application
2. Enter the URL of the websim page you want to package
3. Click "Start"
4. Select an output directory when prompted
5. Wait for the process to complete
6. Navigate to the output directory to find your packaged application

## How It Works

The application:
1. Downloads the specified webpage
2. Parses the HTML to find all linked assets (CSS, JavaScript, images, etc.)
3. Downloads all assets and rewrites the HTML to use local paths
4. Creates a basic Electron application structure around the content
5. Uses electron-packager to build a standalone executable

## Troubleshooting

- If packaging fails, check your internet connection and try again
- Some sites may use dynamic loading that isn't fully captured by the static analysis
- For assistance, check the console output for detailed error messages

## License
ISC
`;
}