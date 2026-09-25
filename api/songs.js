// Load vault data once when the module imports
const response = await fetch('/data/vault.json');
const vault = await response.json();
const data = vault.songs;

export function getSongs() {
    return [...data].sort((a, b) => b.plays - a.plays);
}

export async function updateSongs(id, plays) {
    const res = await fetch('/api/updateSongs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plays })
    });
    if (!res.ok) throw new Error('Failed to update play count');

    // Update in-memory data so the UI stays in sync
    const song = data.find(s => s.id === id);
    if (song) song.plays = plays;

    return res.json();
}