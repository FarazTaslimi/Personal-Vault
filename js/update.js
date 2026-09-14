let intervalId = null;

export function update(callback, ms = 0) {
    if (typeof callback !== 'function') return;

    if (ms > 0) {
        // Scheduled repeating update (clock, greeting)
        if (intervalId) clearInterval(intervalId);
        callback();
        intervalId = setInterval(callback, ms);
    } else {
        // Immediate one-shot update (play counts, UI changes)
        callback();
    }
}