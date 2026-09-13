const response = await fetch('/data/vault.json');
const data = await response.json();

export function songs() {
    const songsCopy = [...data.songs];
    const songs = songsCopy.sort((a, b) => b.plays - a.plays);
    return songs;   // ← return the array
}