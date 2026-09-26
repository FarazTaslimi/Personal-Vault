// ============================================================
// 🖥️ DEV SERVER — Personal Vault
// ============================================================
// A minimal Node.js HTTP server that:
//   1. Serves static files (HTML, CSS, JS, images, audio, etc.)
//   2. Handles the /api/updateSongs endpoint (play count persistence)
//   3. Supports HTTP Range requests (needed for audio seeking)

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;


// ============================================================
// 📄 MIME TYPES — maps file extensions to Content-Type headers
// ============================================================
// Without the correct Content-Type, browsers won't know how to
// interpret a file (e.g. CSS won't apply, JS won't execute).

const mimeTypes = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'text/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.txt':  'text/plain',
    '.md':   'text/markdown',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
    '.eot':  'application/vnd.ms-fontobject',
    '.mp3':  'audio/mpeg',
    '.wav':  'audio/wav',
    '.ogg':  'audio/ogg',
    '.m4a':  'audio/mp4',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm'
};


// ============================================================
// 🌐 SERVER
// ============================================================

const server = http.createServer((req, res) => {

    let urlPath = decodeURIComponent(req.url);
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
    }


    // ============================================================
    // 🔌 API — POST /api/updateSongs
    // ============================================================
    // Receives { id, plays } and updates the matching song in
    // data/vault.json (or vault.example.json as a fallback).
    // ============================================================
    if (urlPath === '/api/updateSongs' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { id, plays } = JSON.parse(body);

                const localPath   = path.join(__dirname, 'data', 'vault.json');
                const examplePath = path.join(__dirname, 'data', 'vault.example.json');

                let vaultPath, targetFile;
                if (fs.existsSync(localPath)) {
                    vaultPath  = localPath;
                    targetFile = 'vault.json';
                } else if (fs.existsSync(examplePath)) {
                    vaultPath  = examplePath;
                    targetFile = 'vault.example.json';
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No vault file found' }));
                    return;
                }

                const vault = JSON.parse(fs.readFileSync(vaultPath, 'utf-8'));
                const song  = vault.songs.find(s => s.id === id);

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
    // 📁 STATIC FILE SERVING
    // ============================================================

    const filePath       = path.join(__dirname, urlPath);
    const normalizedPath = path.normalize(filePath);

    // Security: prevent path traversal outside the project folder
    if (!normalizedPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext         = path.extname(normalizedPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Stat the file once — used for both range and non-range responses
    const stat = fs.existsSync(normalizedPath) ? fs.statSync(normalizedPath) : null;

    // --------------------------------------------------------
    // 🔥 RANGE REQUESTS — needed for audio/video seeking
    // --------------------------------------------------------
    // When the browser wants to seek (audio.currentTime = X),
    // it sends a "Range: bytes=START-END" header. We respond with
    // 206 Partial Content containing only that slice of the file.
    //
    // Without this, seeking silently restarts playback from 0
    // because the browser can't jump into the middle of an
    // unseekable stream.
    // --------------------------------------------------------
    const range = req.headers.range;

    if (stat && stat.isFile() && range) {
        const fileSize  = stat.size;
        const parts     = range.replace(/bytes=/, '').split('-');
        const start     = parseInt(parts[0], 10);
        const end       = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges':  'bytes',
            'Content-Length': chunkSize,
            'Content-Type':   contentType
        });

        // Stream only the requested byte range
        fs.createReadStream(normalizedPath, { start, end }).pipe(res);
        return;
    }

    // --------------------------------------------------------
    // 📄 NON-RANGE REQUESTS — send the whole file
    // --------------------------------------------------------
    // Always includes "Accept-Ranges: bytes" so the browser
    // knows from the very first request that seeking is allowed.
    // --------------------------------------------------------
    fs.readFile(normalizedPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 - File Not Found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes'
        });
        res.end(data);
    });
});


// ============================================================
// 🚀 START
// ============================================================

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔌 API: POST /api/updateSongs`);
});
