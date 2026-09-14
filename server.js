const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

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
    let urlPath = decodeURIComponent(req.url);
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }

    // ============================================================
    // 🔥 API ROUTES — must come BEFORE file reading
    // ============================================================
    if (urlPath === '/api/updateSongs' && req.method === 'POST') {
        let body = '';

        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { id, plays } = JSON.parse(body);
                const vaultPath = path.join(__dirname, 'data', 'vault.json');

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
                res.end(JSON.stringify({ success: true, id, plays }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;   // ← important: stop here, don't fall through
    }

    // ============================================================
    // Static file serving
    // ============================================================
    const filePath = path.join(__dirname, urlPath);
    const normalizedPath = path.normalize(filePath);

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
});