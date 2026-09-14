const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types for common files
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac'
};

const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url);
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }

    // ============================================================
    // 🔥 API ROUTES — must come BEFORE static file serving
    // ============================================================
    if (urlPath === '/api/updateSongs' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => { body += chunk; });

        req.on('end', () => {
            try {
                const { id, plays } = JSON.parse(body);

                // Detect environment from the Host header
                const host = req.headers.host || '';
                const isLocal =
                    host.includes('localhost') ||
                    host.includes('127.0.0.1');

                const targetFile = isLocal ? 'vault.json' : 'vault.example.json';
                const vaultPath = path.join(__dirname, 'data', targetFile);

                if (!fs.existsSync(vaultPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `File not found: ${targetFile}` }));
                    return;
                }

                const vault = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
                const song = vault.songs.find(s => s.id === id);

                if (!song) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Song not found' }));
                    return;
                }

                song.plays = plays;
                fs.writeFileSync(vaultPath, JSON.stringify(vault, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    id,
                    plays,
                    file: targetFile
                }));

            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });

        return;   // ← stop here, don't fall through to static serving
    }

    // ============================================================
    // Static file serving
    // ============================================================
    const filePath = path.join(__dirname, urlPath);
    const normalizedPath = path.normalize(filePath);

    // Security: prevent directory traversal
    if (!normalizedPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

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
    console.log(`🔌 API: POST /api/updateSongs`);
    console.log(`🌍 Environment: writes to vault.json locally, vault.example.json elsewhere`);
});