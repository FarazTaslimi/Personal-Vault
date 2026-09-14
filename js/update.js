let intervalId = null;

export function update(callback, ms = 1000) {
    if (intervalId) clearInterval(intervalId);

    const tick = () => {
        if (typeof callback === 'function') callback();
    };

    tick();
    intervalId = setInterval(tick, ms);
}