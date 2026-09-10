const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for common files
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    // Default to index.html for root
    let urlPath = decodeURIComponent(req.url);
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }

    const filePath = path.join(__dirname, urlPath);
    const normalizedPath = path.normalize(filePath);

    // Security: prevent directory traversal
    if (!normalizedPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    fs.readFile(normalizedPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - File Not Found');
            return;
        }

        const ext = path.extname(normalizedPath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
});