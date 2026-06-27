/**
 * =====================================================
 * VEKMaker Layout Loader
 * =====================================================
 */

async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Component not found: ${filePath}`);
        }

        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;

    } catch (error) {
        console.error("Error loading component:", error);
    }
}

async function loadLayout() {
    await loadComponent("site-header", "/assets/components/layout/header.html");
    await loadComponent("site-menu", "/assets/components/navigation/menu.html");
    await loadComponent("site-footer", "/assets/components/layout/footer.html");
}

document.addEventListener("DOMContentLoaded", loadLayout);