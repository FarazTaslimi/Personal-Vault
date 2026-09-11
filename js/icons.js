export async function icons() {
    // Wait for the caller to insert the HTML into the DOM
    await new Promise(resolve => setTimeout(resolve, 0));

    // Load Lucide dynamically
    const { createIcons, icons: lucideIcons } = await import('https://esm.sh/lucide@0.468.0');

    // Replace all <i data-lucide="..."> elements with SVGs
    createIcons({ icons: lucideIcons });
}