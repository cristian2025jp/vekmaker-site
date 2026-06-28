function renderGeneratorCards() {
    const grids = document.querySelectorAll("[data-generator-grid]");

    if (!grids.length || typeof GENERATORS === "undefined") {
        return;
    }

    grids.forEach((grid) => {
        grid.innerHTML = "";

        GENERATORS.forEach((generator) => {
            const card = document.createElement("article");
            card.className = "generator-card";

            if (generator.status === "available") {
                card.classList.add("featured");
            }

            const statusClass = generator.status === "available" ? "available" : "soon";
            const statusText = generator.status === "available" ? "Available" : "Coming Soon";

            card.innerHTML = `
                <span class="card-status ${statusClass}">${statusText}</span>
                <h3>${generator.name}</h3>
                <p>${generator.description}</p>
                ${
                    generator.status === "available"
                        ? `<a href="${generator.url}">Open Generator</a>`
                        : ""
                }
            `;

            grid.appendChild(card);
        });
    });
}

document.addEventListener("DOMContentLoaded", renderGeneratorCards);