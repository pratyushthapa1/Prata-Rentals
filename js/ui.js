// js/ui.js
import { formatCurrency } from './utils.js';
import * as state from './state.js'; // To access currentUserId and userWishlist

export function createPropertyCardElement(propertyData, propertyIdFromArg) {
    const propertyId = String(propertyData.id || propertyIdFromArg);

    if (!propertyData || !propertyId) {
        console.error("Cannot create property card: missing property data or ID.", { propertyData, propertyIdFromArg });
        return null;
    }

    const link = document.createElement('a');
    link.href = `property.html?id=${propertyId}`;
    link.classList.add('property-card-link');
    link.dataset.propertyId = propertyId;

    const card = document.createElement('article');
    card.classList.add('property-card');
    card.dataset.propertyId = propertyId;

    const title = propertyData.title || 'Untitled Property';
    const location = propertyData.location || 'Unknown Location';
    const imageURL = propertyData.imageURL || propertyData.image_url || propertyData.image_url_1 || 'images/placeholder.png';
    const priceFormatted = formatCurrency(propertyData.price, propertyData.currency) + (propertyData.price_suffix || propertyData.priceSuffix || '/mo');
    const tag = propertyData.tag || '';

    const bedrooms = propertyData.bedrooms;
    const bathrooms = propertyData.bathrooms;
    const area = propertyData.area;

    let featuresHTML = '';
    if (bedrooms) featuresHTML += `<span><i class="fas fa-bed"></i> ${bedrooms} Bed${Number(bedrooms) !== 1 ? 's' : ''}</span>`;
    if (bathrooms) featuresHTML += `<span><i class="fas fa-bath"></i> ${bathrooms} Bath${Number(bathrooms) !== 1 ? 's' : ''}</span>`;
    if (area) featuresHTML += `<span><i class="fas fa-ruler-combined"></i> ${area} sqft</span>`;

    let tagHTML = '';
    if (tag) {
        const tagClass = tag.toLowerCase().includes('popular') || tag.toLowerCase().includes('featured') ? 'primary-tag' : 'secondary-tag';
        tagHTML = `<span class="card-tag ${tagClass}">${tag}</span>`;
    }

    // Use state.currentUserId and state.userWishlist
    const isWishlisted = state.currentUserId && state.userWishlist.has(propertyId);
    const heartIconClass = isWishlisted ? 'fas' : 'far';
    const wishlistButtonAriaLabel = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist';
    const wishlistButtonActiveClass = isWishlisted ? 'active' : '';

    card.innerHTML = `
        <div class="card-image-container">
            <img src="${imageURL}" alt="Image of ${title}" class="card-image" loading="lazy">
            ${tagHTML}
            <div class="card-price">${priceFormatted}</div>
            <button class="wishlist-button on-card-wishlist ${wishlistButtonActiveClass}" data-property-id="${propertyId}" aria-label="${wishlistButtonAriaLabel}">
                <i class="${heartIconClass} fa-heart"></i>
            </button>
        </div>
        <div class="card-text-content">
            <h3 class="card-title">${title}</h3>
            <p class="card-location"><i class="fas fa-map-marker-alt"></i> ${location}</p>
        </div>
        <div class="card-footer">
            <div class="card-features">
                ${featuresHTML || '<span>Details available</span>'}
            </div>
            <span class="card-details-link-placeholder" aria-label="View details for ${title}">
                <i class="fas fa-arrow-right"></i>
            </span>
        </div>`;

    link.appendChild(card);
    return link;
}

export function initPasswordToggle() {
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // ... (implementation as before)
            const passwordInputId = this.dataset.togglePassword;
            const passwordInput = document.getElementById(passwordInputId);
            if (passwordInput) {
                const icon = this.querySelector('i');
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
                    this.setAttribute('aria-label', 'Hide password');
                } else {
                    passwordInput.type = 'password';
                    if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
                    this.setAttribute('aria-label', 'Show password');
                }
            }
        });
    });
}

export function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            // ... (implementation as before)
            const hrefAttribute = this.getAttribute('href');
            if (hrefAttribute && hrefAttribute.length > 1) {
                try {
                    const targetElement = document.querySelector(hrefAttribute);
                    if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                } catch (error) {
                    console.warn("Smooth scroll target not found or invalid selector:", hrefAttribute, error);
                }
            }
        });
    });
}