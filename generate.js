import fs from 'fs';
import path from 'path';
import { parseFile } from 'music-metadata';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VAULT_JSON = path.join(__dirname, 'data', 'vault.json');
const SONGS_DIR  = path.join(__dirname, 'vault', 'songs');
const COVERS_DIR = path.join(__dirname, 'assets', 'covers');

if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });

function findAudioFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results.push(...findAudioFiles(fullPath));
        } else if (/\.(mp3|m4a|flac|wav|ogg|aac)$/i.test(item)) {
            results.push(fullPath);
        }
    }
    return results;
}

function loadVault() {
    if (!fs.existsSync(VAULT_JSON)) return { songs: [] };
    return JSON.parse(fs.readFileSync(VAULT_JSON, 'utf-8'));
}

function saveVault(vault) {
    fs.writeFileSync(VAULT_JSON, JSON.stringify(vault, null, 2));
}

function getNextId(vault) {
    if (vault.songs.length === 0) return 1;
    return Math.max(...vault.songs.map(s => s.id)) + 1;
}

function saveCover(picture, id) {
    if (!picture || picture.length === 0) return null;
    const pic = picture[0];
    const ext = pic.format.split('/')[1] || 'jpg';
    const filename = `${id}.${ext}`;
    const filepath = path.join(COVERS_DIR, filename);
    fs.writeFileSync(filepath, pic.data);
    return `/assets/covers/${filename}`;
}

async function main() {
    const vault = loadVault();
    // 🔥 Changed: track by `src` instead of `file`
    const existingSrcs = new Set(vault.songs.map(s => s.src));
    let nextId = getNextId(vault);
    let added = 0;

    const audioFiles = findAudioFiles(SONGS_DIR);
    console.log(`🔍 Found ${audioFiles.length} audio files\n`);

    for (const fullPath of audioFiles) {
        const relativePath = '/' + path.relative(__dirname, fullPath).replace(/\\/g, '/');

        if (existingSrcs.has(relativePath)) {
            console.log(`⏭️  Skipped (already in vault): ${relativePath}`);
            continue;
        }

        try {
            const metadata = await parseFile(fullPath);
            const { title, artist, picture } = metadata.common;
            const duration = metadata.format.duration;

            const id = nextId++;
            const cover = saveCover(picture, id);

            vault.songs.push({
                id,
                title: title || path.basename(fullPath, path.extname(fullPath)),
                artist: artist || 'Unknown Artist',
                plays: 0,
                duration: duration ? Math.round(duration) : 0,
                cover: cover || null,
                src: relativePath           // 🔥 Changed from `file` to `src`
            });

            added++;
            console.log(`✅ Added: ${title || relativePath} — ${artist || 'Unknown'} (id: ${id})`);

        } catch (err) {
            console.error(`❌ Failed: ${fullPath} — ${err.message}`);
        }
    }

    saveVault(vault);
    console.log(`\n🎵 Done! Added ${added} new song(s). Total: ${vault.songs.length}`);
}

main();