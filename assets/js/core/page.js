/**
 * =====================================================
 * VEKMaker Page Metadata
 * =====================================================
 */

function upsertMeta(selector, attributes) {
    let element = document.head.querySelector(selector);

    if (!element) {
        element = document.createElement("meta");
        document.head.appendChild(element);
    }

    Object.entries(attributes).forEach(([name, value]) => {
        if (value) {
            element.setAttribute(name, value);
        }
    });

    return element;
}

function upsertLink(selector, attributes) {
    let element = document.head.querySelector(selector);

    if (!element) {
        element = document.createElement("link");
        document.head.appendChild(element);
    }

    Object.entries(attributes).forEach(([name, value]) => {
        if (value) {
            element.setAttribute(name, value);
        }
    });

    return element;
}

function addStructuredData(data, id) {
    let script = document.head.querySelector(`script[data-seo-id="${id}"]`);

    if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seoId = id;
        document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
}

function applyPageConfig() {
    if (typeof PAGE === "undefined" || typeof SITE === "undefined") {
        return;
    }

    const pageTitle = PAGE.title
        ? `${PAGE.title} | ${SITE.name}`
        : SITE.name;

    const canonicalUrl = PAGE.canonical
        || `${SITE.domain}${window.location.pathname}`;

    const socialTitle = PAGE.socialTitle || pageTitle;
    const socialDescription = PAGE.socialDescription || PAGE.description;
    const socialImage = PAGE.image
        ? new URL(PAGE.image, SITE.domain).href
        : `${SITE.domain}/assets/icons/vekmaker-social.png`;

    document.title = pageTitle;

    if (PAGE.description) {
        upsertMeta('meta[name="description"]', {
            name: "description",
            content: PAGE.description
        });
    }

    upsertMeta('meta[name="robots"]', {
        name: "robots",
        content: PAGE.robots || "index, follow, max-image-preview:large"
    });

    upsertLink('link[rel="canonical"]', {
        rel: "canonical",
        href: canonicalUrl
    });

    upsertMeta('meta[property="og:type"]', {
        property: "og:type",
        content: PAGE.ogType || "website"
    });

    upsertMeta('meta[property="og:site_name"]', {
        property: "og:site_name",
        content: SITE.name
    });

    upsertMeta('meta[property="og:title"]', {
        property: "og:title",
        content: socialTitle
    });

    upsertMeta('meta[property="og:description"]', {
        property: "og:description",
        content: socialDescription
    });

    upsertMeta('meta[property="og:url"]', {
        property: "og:url",
        content: canonicalUrl
    });

    upsertMeta('meta[property="og:image"]', {
        property: "og:image",
        content: socialImage
    });

    upsertMeta('meta[name="twitter:card"]', {
        name: "twitter:card",
        content: "summary_large_image"
    });

    upsertMeta('meta[name="twitter:title"]', {
        name: "twitter:title",
        content: socialTitle
    });

    upsertMeta('meta[name="twitter:description"]', {
        name: "twitter:description",
        content: socialDescription
    });

    upsertMeta('meta[name="twitter:image"]', {
        name: "twitter:image",
        content: socialImage
    });

    addStructuredData({
        "@context": "https://schema.org",
        "@type": PAGE.schemaType || "WebPage",
        "name": PAGE.heading || PAGE.title || SITE.name,
        "description": PAGE.description || "",
        "url": canonicalUrl,
        "isPartOf": {
            "@type": "WebSite",
            "name": SITE.name,
            "url": SITE.domain
        }
    }, "page");

    if (PAGE.generator && PAGE.generator !== "home" && PAGE.generator !== "information") {
        addStructuredData({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": PAGE.heading || PAGE.title,
            "applicationCategory": "DesignApplication",
            "operatingSystem": "Any modern web browser",
            "url": canonicalUrl,
            "description": PAGE.description || "",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            }
        }, "application");
    }

    if (PAGE.generator === "home") {
        addStructuredData({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": SITE.name,
            "alternateName": "VEK Maker",
            "url": SITE.domain
        }, "website");
    }
}

document.addEventListener("DOMContentLoaded", applyPageConfig);
