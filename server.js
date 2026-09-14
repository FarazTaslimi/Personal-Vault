const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    // ... all your other MIME types
};

const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url);
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }

    // ============================================================
    // 🔥 PUT THE API BLOCK HERE — right after urlPath is set
    // ============================================================
    if (urlPath === '/api/updateSongs' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { id, plays } = JSON.parse(body);

                const localPath = path.join(__dirname, 'data', 'vault.json');
                const examplePath = path.join(__dirname, 'data', 'vault.example.json');

                let vaultPath, targetFile;
                if (fs.existsSync(localPath)) {
                    vaultPath = localPath;
                    targetFile = 'vault.json';
                } else if (fs.existsSync(examplePath)) {
                    vaultPath = examplePath;
                    targetFile = 'vault.example.json';
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No vault file found' }));
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
                res.end(JSON.stringify({ success: true, id, plays, file: targetFile }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }
    // ============================================================
    // END OF API BLOCK — static file serving continues below
    // ============================================================

    // Static file serving
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