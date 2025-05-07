// js/page-search-results.js
import { makeApiCall, formatCurrency } from './utils.js';
import { createPropertyCardElement } from './ui.js';
import { updateWishlistButtonsVisualState } from './wishlist.js';


export function initSearchResultsPage() {
    const searchResultsGrid = document.getElementById('search-results-grid');
    if (!searchResultsGrid) return;

    console.log("Search results page: Loading results from API...");
    // ... (rest of search results logic as before, using makeApiCall, createPropertyCardElement)
    const searchQueryDisplay = document.getElementById('search-query-display');

    async function loadSearchResultsFromServer() {
        const urlParams = new URLSearchParams(window.location.search);
        let queryTextParts = [];
        if (urlParams.get('location')) queryTextParts.push(`Location: "${urlParams.get('location')}"`);
        if (urlParams.get('category')) queryTextParts.push(`Type: "${urlParams.get('category')}"`);
        if (urlParams.get('max_price')) queryTextParts.push(`Max Price: ${formatCurrency(urlParams.get('max_price'))}`);

        const fullQueryText = queryTextParts.length > 0 ? queryTextParts.join(', ') : "all properties";
        if (searchQueryDisplay) searchQueryDisplay.textContent = `Searching for: ${fullQueryText}`;

        let loadingEl = searchResultsGrid.querySelector('.loading-message');
        if (!loadingEl) {
            loadingEl = document.createElement('p');
            loadingEl.className = 'loading-message';
            loadingEl.style.textAlign = 'center';
            loadingEl.style.gridColumn = '1 / -1';
        }
        loadingEl.textContent = 'Searching for properties...';
        searchResultsGrid.innerHTML = '';
        searchResultsGrid.appendChild(loadingEl);

        try {
            const properties = await makeApiCall(`search_properties.php${window.location.search}`);
            searchResultsGrid.innerHTML = '';

            if (!properties || properties.length === 0) {
                searchResultsGrid.innerHTML = `<p class="empty-message" style="grid-column: 1 / -1; text-align: center;">No properties found matching your criteria: ${fullQueryText}.</p>`;
            } else {
                properties.forEach(property => {
                    const cardElement = createPropertyCardElement(property, property.id);
                    if (cardElement) searchResultsGrid.appendChild(cardElement);
                });
                updateWishlistButtonsVisualState();
            }
        } catch (error) {
            console.error("Error loading search results:", error.message);
            searchResultsGrid.innerHTML = `<p class="error-message" style="grid-column: 1 / -1; text-align: center;">Could not load search results: ${error.message}</p>`;
        }
    }
    loadSearchResultsFromServer();
}