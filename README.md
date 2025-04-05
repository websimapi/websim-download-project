__DELETE_ME__
`````` index.html
<!DOCTYPE html>
<html>
<head>
    <title>Download Project</title>
    <style>
        body {
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f4f4f4;
        }
        .container {
            text-align: center;
            background-color: #fff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        p {
            color: #666;
            margin-bottom: 30px;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }
        button:hover {
            background-color: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Project Download</h1>
        <p>Download the NodeJS Electron project to fetch and package websim source code.</p>
        <button id="downloadBtn">Download Project (.zip)</button>
    </div>

    <script type="importmap">
    {
        "imports": {
            "jszip": "https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm",
            "file-saver": "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/+esm"
        }
    }
    </script>
    <script type="module" src="script.js"></script>
</body>
</html>

