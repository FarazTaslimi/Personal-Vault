import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { parseFile } from 'music-metadata';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VAULT_JSON = path.join(__dirname, 'data', 'vault.json');
const SONGS_DIR  = path.join(__dirname, 'vault', 'songs');
const MOVIES_DIR = path.join(__dirname, 'vault', 'movies');
const COVERS_DIR = path.join(__dirname, 'assets', 'covers');

const OMDB_API_KEY = process.env.OMDB_API_KEY || '';

if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });


// ============================================================
// ⌨️  INTERACTIVE HELPERS
// ============================================================

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, answer => {
        rl.close();
        resolve(answer);
    }));
}

function clickableLink(text, url) {
    if (!process.stdout.isTTY) return text;
    return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}


// ============================================================
// 📂 FILE DISCOVERY
// ============================================================

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

function findVideoFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const item of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results.push(...findVideoFiles(fullPath));
        } else if (/\.(mp4|mkv|avi|mov|webm|m4v|flv|wmv|mpg|mpeg)$/i.test(item)) {
            results.push(fullPath);
        }
    }
    return results;
}


// ============================================================
// 💾 VAULT PERSISTENCE
// ============================================================

function loadVault() {
    if (!fs.existsSync(VAULT_JSON)) return { songs: [], movies: [] };
    const vault = JSON.parse(fs.readFileSync(VAULT_JSON, 'utf-8'));

    if (!vault.songs)  vault.songs  = [];
    if (!vault.movies) vault.movies = [];

    return vault;
}

function saveVault(vault) {
    fs.writeFileSync(VAULT_JSON, JSON.stringify(vault, null, 2));
}


// ============================================================
// 🔢 ID GENERATION
// ============================================================

function getNextId(vault) {
    if (vault.songs.length === 0) return 1;
    return Math.max(...vault.songs.map(s => s.id)) + 1;
}

function getNextMovieNumber(vault) {
    if (vault.movies.length === 0) return 1;
    const numbers = vault.movies
        .map(m => parseInt(String(m.id).slice(1), 10))
        .filter(n => !isNaN(n));
    if (numbers.length === 0) return 1;
    return Math.max(...numbers) + 1;
}


// ============================================================
// 🖼️ COVER ART (songs)
// ============================================================

function saveCover(picture, id) {
    if (!picture || picture.length === 0) return null;
    const pic = picture[0];
    const ext = pic.format.split('/')[1] || 'jpg';
    const filename = `${id}.${ext}`;
    const filepath = path.join(COVERS_DIR, filename);
    fs.writeFileSync(filepath, pic.data);
    return `/assets/covers/${filename}`;
}


// ============================================================
// 🖼️ POSTER DOWNLOAD (movies)
// ============================================================

async function downloadPoster(url, id) {
    if (!url || url === 'N/A') return null;

    try {
        const res = await fetch(url);
        if (!res.ok) return null;

        let ext = 'jpg';
        const urlExt = url.split('.').pop().split('?')[0].toLowerCase();
        if (['jpg', 'jpeg', 'png', 'webp'].includes(urlExt)) {
            ext = urlExt === 'jpeg' ? 'jpg' : urlExt;
        }

        const buffer = Buffer.from(await res.arrayBuffer());

        const previewDir = path.join(__dirname, 'assets', 'previews');
        if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

        const filename = `${id}.${ext}`;
        const filepath = path.join(previewDir, filename);

        fs.writeFileSync(filepath, buffer);

        return `/assets/previews/${filename}`;
    } catch (err) {
        console.error(`   ⚠️  Poster download failed for ${id}: ${err.message}`);
        return null;
    }
}


// ============================================================
// 🎵 SONGS
// ============================================================

async function processSongs(vault) {
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
                src: relativePath
            });

            added++;
            console.log(`✅ Added: ${title || relativePath} — ${artist || 'Unknown'} (id: ${id})`);
        } catch (err) {
            console.error(`❌ Failed: ${fullPath} — ${err.message}`);
        }
    }

    return added;
}


// ============================================================
// 🎬 MOVIES — FILENAME PARSING
// ============================================================

function isStrictTitleWord(seg) {
    return /^[A-Z][a-z]+$/.test(seg) || /^[A-Z]$/.test(seg);
}

function isLooseTitleWord(seg) {
    return /^[a-zA-Z]+$/.test(seg);
}

function parseMovieFilename(filepath) {
    const base = path.basename(filepath, path.extname(filepath));

    let year = null;
    let yearIndex = -1;

    const bracketYear = base.match(/[\(\[]\s*(199\d|20[0-1]\d|202[0-7])\s*[\)\]]/);
    if (bracketYear) {
        year = parseInt(bracketYear[1], 10);
        yearIndex = bracketYear.index;
    } else {
        const standaloneYear = base.match(/(?<=\s|\.|_)(199\d|20[0-1]\d|202[0-7])(?=\s|\.|_|$)/);
        if (standaloneYear) {
            year = parseInt(standaloneYear[1], 10);
            yearIndex = base.indexOf(standaloneYear[0]);
        }
    }

    const titlePart = yearIndex > 0 ? base.slice(0, yearIndex) : base;
    const segments = titlePart.split(/[.\-_\s]+/).filter(Boolean);

    let titleStart = -1;
    for (let i = 0; i < segments.length; i++) {
        if (isStrictTitleWord(segments[i])) {
            titleStart = i;
            break;
        }
    }

    if (titleStart === -1) {
        for (let i = 0; i < segments.length; i++) {
            if (isLooseTitleWord(segments[i])) {
                titleStart = i;
                break;
            }
        }
    }

    if (titleStart === -1) titleStart = 0;

    const title = segments
        .slice(titleStart)
        .map(w => {
            if (/^[a-z]+$/.test(w)) {
                return w.charAt(0).toUpperCase() + w.slice(1);
            }
            if (/^[A-Z]+$/.test(w) && w.length > 1) {
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }
            return w;
        })
        .join(' ')
        .trim();

    return { title, year };
}


// ============================================================
// 🎬 MOVIES — OMDB LOOKUP
// ============================================================

function normalizeTitle(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scoreTitle(resultTitle, searchTitle) {
    const a = normalizeTitle(searchTitle);
    const b = normalizeTitle(resultTitle);

    if (!a || !b) return -1;
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 40;
    return -1;
}

async function searchOMDb(title, year) {
    if (!OMDB_API_KEY) return null;

    const fetchSearch = async (params) => {
        const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&type=movie&${params}`;
        try {
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            if (data.Response === 'False' || !data.Search) return [];
            return data.Search;
        } catch {
            return [];
        }
    };

    const pool = [];

    if (year) {
        const withYear = await fetchSearch(`s=${encodeURIComponent(title)}&y=${year}`);
        pool.push(...withYear);
    }

    const withoutYear = await fetchSearch(`s=${encodeURIComponent(title)}`);
    pool.push(...withoutYear);

    const words = title.split(' ');
    if (words.length > 2) {
        const shortened = words.slice(0, -1).join(' ');
        const shortSearch = await fetchSearch(`s=${encodeURIComponent(shortened)}`);
        pool.push(...shortSearch);
    }

    const seen = new Set();
    const unique = pool.filter(r => {
        if (seen.has(r.imdbID)) return false;
        seen.add(r.imdbID);
        return true;
    });

    let candidates = unique;
    if (year) {
        candidates = unique.filter(r => {
            const ry = parseInt(String(r.Year).slice(0, 4), 10);
            return !isNaN(ry) && Math.abs(ry - year) <= 1;
        });
    }

    if (candidates.length === 0) return null;

    const scored = candidates
        .map(r => ({ result: r, score: scoreTitle(r.Title, title) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const top = scored[0];
    console.log(`   🎯 Match: "${top.result.Title}" (${top.result.Year}) — title ${top.score}/100 — imdbID ${top.result.imdbID}`);

    return top.result.imdbID;
}

async function getOMDbDetails(imdbID) {
    if (!OMDB_API_KEY || !imdbID) return null;

    try {
        const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.Response === 'False') return null;
        return data;
    } catch {
        return null;
    }
}


// ============================================================
// 🎬 MOVIES — MANUAL MATCH (asks the user directly)
// ============================================================

async function manualMatchMovie(failed) {
    const { vaultEntry, rawTitle, rawYear, filename } = failed;

    const query = encodeURIComponent(rawTitle + (rawYear ? ` ${rawYear}` : ''));
    const searchUrl = `https://www.imdb.com/find/?q=${query}`;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 ${filename}`);
    console.log(`   Parsed from filename: "${rawTitle}"${rawYear ? ` (${rawYear})` : ''}`);
    console.log(`   👉 Search on IMDb: ${clickableLink('Open IMDB', searchUrl)}`);
    console.log(`      ${searchUrl}`);
    console.log(`      Find the movie, then fill in the correct values below.`);
    console.log(`      Press Enter on any field to keep the filename value.\n`);

    // ---- Title ----
    const titleInput = (await askQuestion(`   Title [${rawTitle}]: `)).trim();
    if (titleInput) vaultEntry.title = titleInput;

    // ---- Year ----
    const yearInput = (await askQuestion(`   Year [${rawYear || 'none'}]: `)).trim();
    if (yearInput) {
        const parsed = parseInt(yearInput, 10);
        if (!isNaN(parsed)) vaultEntry.year = parsed;
    }

    // ---- Rating ----
    const ratingInput = (await askQuestion(`   Rating (0-10) [${vaultEntry.rating || 0}]: `)).trim();
    if (ratingInput) {
        const parsed = parseFloat(ratingInput);
        if (!isNaN(parsed)) vaultEntry.rating = parsed;
    }

    console.log(`   ✅ Updated: ${vaultEntry.title} (${vaultEntry.year}) ⭐ ${vaultEntry.rating}`);
}


// ============================================================
// 🎬 MOVIES — MAIN PIPELINE
// ============================================================

async function processMovies(vault) {
    const existingSrcs = new Set(vault.movies.map(m => m.src));
    let nextNumber = getNextMovieNumber(vault);
    let added = 0;
    const failed = [];

    const videoFiles = findVideoFiles(MOVIES_DIR);
    console.log(`🔍 Found ${videoFiles.length} video files\n`);

    if (!OMDB_API_KEY) {
        console.log('⚠️  OMDB_API_KEY not set — falling back to filename-only metadata.\n');
    }

    for (const fullPath of videoFiles) {
        const relativePath = '/' + path.relative(__dirname, fullPath).replace(/\\/g, '/');

        if (existingSrcs.has(relativePath)) {
            console.log(`⏭️  Skipped (already in vault): ${relativePath}`);
            continue;
        }

        const id = 'M' + nextNumber++;
        const { title: rawTitle, year: rawYear } = parseMovieFilename(fullPath);

        let title = rawTitle;
        let year = rawYear;
        let rating = 0;
        let posterUrl = null;
        let matched = false;

        if (OMDB_API_KEY) {
            const imdbID = await searchOMDb(rawTitle, rawYear);

            if (imdbID) {
                const details = await getOMDbDetails(imdbID);

                if (details) {
                    const titleOk = scoreTitle(details.Title, rawTitle) > 0;
                    const detailsYear = details.Year ? parseInt(details.Year.slice(0, 4), 10) : null;
                    const yearOk = !rawYear || (detailsYear && Math.abs(detailsYear - rawYear) <= 1);

                    if (titleOk && yearOk) {
                        title = details.Title || rawTitle;
                        year = detailsYear || rawYear;

                        const imdbRating = parseFloat(details.imdbRating);
                        if (!isNaN(imdbRating)) rating = imdbRating;

                        if (details.Poster && details.Poster !== 'N/A') {
                            posterUrl = details.Poster;
                        }
                        matched = true;
                    }
                }
            }
        }

        let preview = null;
        if (posterUrl) {
            preview = await downloadPoster(posterUrl, id);
        }
        if (!preview) {
            preview = `/assets/previews/${id}.png`;
        }

        const vaultEntry = {
            id,
            title,
            year,
            rating,
            watches: 0,
            preview,
            src: relativePath
        };

        vault.movies.push(vaultEntry);
        added++;

        const meta = [
            year ? `(${year})` : '',
            rating ? `⭐ ${rating}` : '',
            matched ? '🖼️' : '⚠️ filename only',
        ].filter(Boolean).join(' ');

        console.log(`✅ Added: ${title} ${meta} (id: ${id})`);

        if (!matched) {
            failed.push({
                vaultEntry,
                rawTitle,
                rawYear,
                filename: path.basename(fullPath)
            });
        }
    }

    return { added, failed };
}


// ============================================================
// 🚀 MAIN
// ============================================================

async function main() {
    const vault = loadVault();

    const songsAdded = await processSongs(vault);
    const { added: moviesAdded, failed: failedMovies } = await processMovies(vault);

    saveVault(vault);

    console.log(`\n🎵 Added ${songsAdded} new song(s). Total: ${vault.songs.length}`);
    console.log(`🎬 Added ${moviesAdded} new movie(s). Total: ${vault.movies.length}`);

    if (failedMovies.length > 0) {
        console.log(`\n⚠️  ${failedMovies.length} movie(s) could not be matched automatically:`);
        for (const f of failedMovies) {
            console.log(`   - ${f.filename}`);
        }

        const answer = await askQuestion('\nDo you want to fill in their details manually? (y/n): ');

        if (answer.trim().toLowerCase() === 'y') {
            for (const failed of failedMovies) {
                await manualMatchMovie(failed);
            }

            saveVault(vault);
            console.log('\n💾 Vault saved with manual entries.');
        } else {
            console.log('   Skipped. You can re-run the script later to fix them.');
        }
    }
}

main();
