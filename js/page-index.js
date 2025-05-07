// js/page-index.js
import { makeApiCall, formatCurrency } from './utils.js';
import { createPropertyCardElement } from './ui.js';
import { updateWishlistButtonsVisualState } from './wishlist.js';

export function initHomepage() {
    const featuredGrid = document.querySelector('.featured-rentals .rental-cards-grid');
    const heroSearchForm = document.getElementById('search-form-hero');

    if (!featuredGrid || !heroSearchForm) {
        // console.log("Not on homepage or essential elements missing.");
        return;
    }
    console.log("Index page: Initializing featured rentals and hero search form...");

    const loadFeaturedRentalsFromServer = async () => {
        // ... (implementation as before, using makeApiCall, createPropertyCardElement)
        const loadingEl = document.getElementById('featured-loading');
        if (loadingEl) loadingEl.style.display = 'block';
        if (featuredGrid) featuredGrid.innerHTML = '';

        try {
            const properties = await makeApiCall('get_featured_properties.php');
            if (loadingEl) loadingEl.style.display = 'none';

            if (!properties || properties.length === 0) {
                if (featuredGrid) featuredGrid.innerHTML = '<p class="empty-message" style="grid-column: 1 / -1; text-align: center;">No featured properties available at the moment.</p>';
            } else {
                properties.forEach(property => {
                    const cardElement = createPropertyCardElement(property, property.id);
                    if (cardElement && featuredGrid) featuredGrid.appendChild(cardElement);
                });
                updateWishlistButtonsVisualState();
            }
        } catch (error) {
            console.error("Error loading featured rentals:", error.message);
            if (loadingEl) loadingEl.style.display = 'none';
            if (featuredGrid) featuredGrid.innerHTML = `<p class="error-message" style="grid-column: 1 / -1; text-align: center;">Could not load properties: ${error.message}</p>`;
        }
    };

    const priceRangeInputHero = document.getElementById('price-range-hero');
    if (priceRangeInputHero) {
        priceRangeInputHero.addEventListener('input', function() { this.setCustomValidity(''); });
        priceRangeInputHero.addEventListener('blur', function() { if (!this.checkValidity()) this.reportValidity(); });
    }

    heroSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        // ... (implementation as before)
        if (priceRangeInputHero && !priceRangeInputHero.checkValidity()) {
            priceRangeInputHero.reportValidity();
            return;
        }
        const location = document.getElementById('location-hero')?.value.trim();
        const category = document.getElementById('category-hero')?.value;
        const max_price = priceRangeInputHero?.value;

        const queryParams = new URLSearchParams();
        if (location) queryParams.set('location', location);
        if (category) queryParams.set('category', category);
        if (max_price) queryParams.set('max_price', max_price);

        window.location.href = `search-results.html?${queryParams.toString()}`;
    });

    loadFeaturedRentalsFromServer();
}