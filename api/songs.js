const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const DATA_URL = isLocal
    ? '/data/vault.json'
    : '/data/vault.example.json';

let cachedData = null;

async function loadVault() {
    if (cachedData) return cachedData;
    const response = await fetch(DATA_URL);
    cachedData = await response.json();
    return cachedData;
}

export async function getSongs() {
    const vault = await loadVault();
    const songs = [...vault.songs];
    return songs.sort((a, b) => b.plays - a.plays);
}

export async function updateSongs(id, plays) {
    const response = await fetch('/api/updateSongs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plays })
    });
    if (!response.ok) throw new Error('Failed to update play count');
    return response.json();
}