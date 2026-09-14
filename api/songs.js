const response = await fetch('/data/vault.json');
const data = await response.json();

export function getSongs() {
    const songsCopy = [...data.songs];
    const songs = songsCopy.sort((a, b) => b.plays - a.plays);
    return songs;   // ← return the array
}

export async function updateSongs(id, plays) {
    const response = await fetch('/api/updateSongs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, plays })
    });

    if (!response.ok) {
        throw new Error('Failed to update play count');
    }

    return response.json();
}