function applyPageConfig() {
    if (typeof PAGE === "undefined") {
        return;
    }

    if (PAGE.title) {
        document.title = PAGE.title + " | " + SITE.name;
    }

    if (PAGE.description) {
        let descriptionTag = document.querySelector('meta[name="description"]');

        if (!descriptionTag) {
            descriptionTag = document.createElement("meta");
            descriptionTag.setAttribute("name", "description");
            document.head.appendChild(descriptionTag);
        }

        descriptionTag.setAttribute("content", PAGE.description);
    }

    if (PAGE.keywords) {
        let keywordsTag = document.querySelector('meta[name="keywords"]');

        if (!keywordsTag) {
            keywordsTag = document.createElement("meta");
            keywordsTag.setAttribute("name", "keywords");
            document.head.appendChild(keywordsTag);
        }

        keywordsTag.setAttribute("content", PAGE.keywords);
    }
}

document.addEventListener("DOMContentLoaded", applyPageConfig);