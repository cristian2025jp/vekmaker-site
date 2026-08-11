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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

const CARD_I18N = {
    en: {
        open: "Open",
        button: "Open Generator",
        count: (count) => `${count} generators available`
    },
    pt: {
        open: "Abrir",
        button: "Abrir Gerador",
        count: (count) => `${count} geradores disponíveis`
    },
    ja: {
        open: "開く",
        button: "ジェネレーターを開く",
        count: (count) => `利用可能なジェネレーター：${count}`
    }
};

function currentLanguage() {
    const lang = (document.documentElement.lang || "en").toLowerCase().split("-")[0];
    return ["en", "pt", "ja"].includes(lang) ? lang : "en";
}

function localizedGenerator(generator, lang) {
    const translated = lang === "en" ? null : generator.translations?.[lang];

    return {
        name: translated?.name || generator.name,
        description: translated?.description || generator.description,
        url: `/${lang}/${generator.slug || generator.id}/`
    };
}

function createGeneratorCard(generator) {
    const lang = currentLanguage();
    const text = CARD_I18N[lang];
    const localized = localizedGenerator(generator, lang);

    const card = document.createElement("article");
    card.className = "generator-card generator-card-available";

    const icon = GENERATOR_ICONS[generator.icon] || GENERATOR_ICONS.box;
    const name = escapeHtml(localized.name);
    const description = escapeHtml(localized.description);
    const url = escapeHtml(localized.url);
    const image = escapeHtml(generator.image || "");

    card.innerHTML = `
        <a href="${url}" class="generator-card-image-link" aria-label="${text.open} ${name}">
            <div class="generator-card-image-wrap">
                <img class="generator-card-image" src="${image}" alt="${name}"
                     width="1200" height="900" loading="lazy" decoding="async">
                <div class="generator-card-image-fallback" aria-hidden="true">
                    <div class="generator-icon">${icon}</div>
                </div>
            </div>
        </a>

        <div class="generator-card-content">
            <h3>${name}</h3>
            <p>${description}</p>
        </div>

        <a href="${url}" class="generator-card-link" aria-label="${text.open} ${name}">
            ${text.button} <span aria-hidden="true">→</span>
        </a>
    `;

    const imageElement = card.querySelector(".generator-card-image");
    const imageWrap = card.querySelector(".generator-card-image-wrap");

    imageElement?.addEventListener("error", () => {
        imageWrap?.classList.add("image-error");
        imageElement.hidden = true;
    });

    return card;
}

function renderGeneratorCards() {
    if (typeof GENERATORS === "undefined") return;

    document.querySelectorAll("[data-generator-grid]").forEach((grid) => {
        const requestedStatus = grid.dataset.generatorGrid;
        const generators = GENERATORS.filter(
            (generator) => generator.status === requestedStatus
        );

        grid.innerHTML = "";
        generators.forEach((generator) => {
            grid.appendChild(createGeneratorCard(generator));
        });
    });

    const availableCount = document.querySelector("[data-available-count]");
    if (availableCount) {
        const count = GENERATORS.filter(
            (generator) => generator.status === "available"
        ).length;
        const lang = currentLanguage();
        availableCount.textContent = CARD_I18N[lang].count(count);
    }
}

document.addEventListener("DOMContentLoaded", renderGeneratorCards);
