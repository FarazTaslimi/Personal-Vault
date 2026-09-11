const loadedStyles = new Set();
let styleTag = null;

// Create (or reuse) a single <style> tag in <head>
function getStyleTag() {
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-styles';
        document.head.appendChild(styleTag);
    }
    return styleTag;
}

export async function loadCSS(path) {
    // Skip if already loaded
    if (loadedStyles.has(path)) return;

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load: ${path}`);

        const css = await response.text();
        getStyleTag().textContent += `\n/* ${path} */\n${css}\n`;

        loadedStyles.add(path);
    } catch (err) {
        console.error(`loadCSS error:`, err);
    }
}