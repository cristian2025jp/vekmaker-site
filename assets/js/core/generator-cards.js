const GENERATOR_ICONS = {
    box: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M12 20 32 10l20 10v26L32 56 12 46V20Z"/>
            <path d="m12 20 20 11 20-11M32 31v25"/>
        </svg>
    `,
    cylinder: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <ellipse cx="32" cy="16" rx="19" ry="8"/>
            <path d="M13 16v31c0 4.5 8.5 8 19 8s19-3.5 19-8V16"/>
            <path d="M13 47c0 4.5 8.5 8 19 8s19-3.5 19-8"/>
        </svg>
    `,
    coin: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="22"/>
            <circle cx="32" cy="32" r="6"/>
            <path d="M32 10v6M32 48v6M10 32h6M48 32h6"/>
        </svg>
    `,
    nameplate: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="8" y="18" width="48" height="28" rx="6"/>
            <path d="M18 36V27l8 9v-9M34 36l5-9 5 9M36 33h6"/>
        </svg>
    `,
    frame: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <rect x="9" y="9" width="46" height="46" rx="3"/>
            <rect x="18" y="18" width="28" height="28" rx="2"/>
        </svg>
    `,
    organizer: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
            <path d="M9 18h46v34H9z"/>
            <path d="M9 32h46M25 18v34M42 18v34"/>
        </svg>
    `
};

function createGeneratorCard(generator) {
    const card = document.createElement("article");
    card.className = `generator-card generator-card-${generator.status}`;

    const isAvailable = generator.status === "available";
    const statusText = isAvailable ? "Available" : "Coming Soon";
    const icon = GENERATOR_ICONS[generator.icon] || GENERATOR_ICONS.box;

    card.innerHTML = `
        <div class="generator-card-top">
            <div class="generator-icon">${icon}</div>
            <span class="card-status ${generator.status}">${statusText}</span>
        </div>

        <div class="generator-card-content">
            <h3>${generator.name}</h3>
            <p>${generator.description}</p>
        </div>

        ${
            isAvailable
                ? `<a href="${generator.url}" class="generator-card-link" aria-label="Open ${generator.name}">
                        Open Generator <span aria-hidden="true">→</span>
                   </a>`
                : `<span class="generator-card-disabled" aria-hidden="true">In development</span>`
        }
    `;

    return card;
}

function renderGeneratorCards() {
    if (typeof GENERATORS === "undefined") {
        return;
    }

    document.querySelectorAll("[data-generator-grid]").forEach((grid) => {
        const requestedStatus = grid.dataset.generatorGrid;
        const generators = GENERATORS.filter(
            (generator) => generator.status === requestedStatus
        );

        grid.innerHTML = "";
        generators.forEach((generator) => grid.appendChild(createGeneratorCard(generator)));
    });

    const availableCount = document.querySelector("[data-available-count]");
    if (availableCount) {
        const count = GENERATORS.filter((generator) => generator.status === "available").length;
        availableCount.textContent = `${count} generators available`;
    }
}

document.addEventListener("DOMContentLoaded", renderGeneratorCards);
