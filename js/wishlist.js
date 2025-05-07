// js/wishlist.js
import { makeApiCall } from './utils.js';
import * as state from './state.js'; // To access currentUserId, userWishlist and update them

// UI Selectors (can be passed in or defined here if specific to wishlist module)
const getWishlistBadgeElement = () => document.querySelector('.header-nav .wishlist-link .wishlist-count-badge');

// Add this function to fetch property details by IDs
async function fetchWishlistPropertyDetails(idsArray) {
    if (!idsArray.length) return [];
    const idsParam = idsArray.join(',');
    // Remove the extra 'php/' here:
    return await makeApiCall('get_properties_by_ids.php?ids=' + idsParam);
}

// Add this function to render the wishlist cards
function renderWishlist(properties) {
    const wishlistContainer = document.querySelector('#wishlist-grid');
    if (!wishlistContainer) return;
    wishlistContainer.innerHTML = '';
    document.getElementById('wishlist-loading')?.remove();
    document.getElementById('empty-wishlist-message')?.remove();
    if (!properties.length) {
        const emptyMsg = document.createElement('p');
        emptyMsg.id = 'empty-wishlist-message';
        emptyMsg.textContent = 'Your wishlist is empty. Start exploring and save properties you love!';
        wishlistContainer.appendChild(emptyMsg);
        return;
    }
    properties.forEach(property => {
        const cardLink = document.createElement('a');
        cardLink.href = `property.html?id=${property.id}`;
        cardLink.className = 'property-card-link';
        cardLink.innerHTML = `
            <article class="property-card" data-property-id="${property.id}">
                <div class="card-image-container">
                    <img src="${property.imageURL || 'images/card1.png.jpeg'}" alt="${property.title}" class="card-image">
                    <span class="card-tag">${property.tag || ''}</span>
                    <div class="card-price">${property.currency || ''} ${property.price}${property.price_suffix ? '/' + property.price_suffix : ''}</div>
                    <button class="remove-wishlist-btn" data-property-id="${property.id}" aria-label="Remove from wishlist">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="card-text-content">
                    <h3 class="card-title">${property.title}</h3>
                    <p class="card-location"><i class="fas fa-map-marker-alt"></i> ${property.location}</p>
                </div>
            </article>
        `;
        wishlistContainer.appendChild(cardLink);
    });
}

export async function fetchUserWishlistFromServer() {
    if (!state.currentUserId) {
        state.setUserWishlist(new Set());
        updateWishlistButtonsVisualState();
        updateWishlistBadges();
        renderWishlist([]);
        return;
    }
    const loadingMsg = document.getElementById('wishlist-loading');
    if (loadingMsg) loadingMsg.style.display = 'block';
    try {
        const wishlistData = await makeApiCall('get_wishlist.php');
        const wishlistIds = Array.isArray(wishlistData) ? wishlistData.map(id => String(id)) : [];
        state.setUserWishlist(new Set(wishlistIds));
        const properties = await fetchWishlistPropertyDetails(wishlistIds);
        renderWishlist(properties);
    } catch (error) {
        renderWishlist([]);
        const wishlistContainer = document.querySelector('#wishlist-grid');
        if (wishlistContainer) {
            const errorMsg = document.createElement('p');
            errorMsg.style.color = 'red';
            errorMsg.textContent = 'Could not load your wishlist. Please try again later.';
            wishlistContainer.appendChild(errorMsg);
        }
    } finally {
        const loadingMsg = document.getElementById('wishlist-loading');
        if (loadingMsg) loadingMsg.style.display = 'none';
        updateWishlistButtonsVisualState();
        updateWishlistBadges();
    }
}

export async function toggleWishlistOnServer(propertyIdStr) {
    if (!state.currentUserId) {
        alert("Please log in to manage your wishlist.");
        return;
    }
    const propertyId = String(propertyIdStr);
    const button = document.querySelector(`.wishlist-button[data-property-id="${propertyId}"]`);
    const heartIcon = button?.querySelector('i');

    if (button) button.disabled = true;
    if (heartIcon) heartIcon.classList.add('fa-spin');

    const isCurrentlyWishlisted = state.userWishlist.has(propertyId);
    const action = isCurrentlyWishlisted ? 'remove' : 'add';

    try {
        const result = await makeApiCall('toggle_wishlist.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId: propertyId, action: action })
        });

        if (result.success) {
            const newWishlist = new Set(state.userWishlist);
            if (action === 'add') {
                newWishlist.add(propertyId);
            } else {
                newWishlist.delete(propertyId);
            }
            state.setUserWishlist(newWishlist);
            console.log(`Wishlist updated on server for property ${propertyId}. Action: ${action}.`);
        } else {
            throw new Error(result.message || "Failed to update wishlist on server.");
        }
    } catch (error) {
        console.error("Error toggling wishlist:", error.message);
        alert("Could not update wishlist. Please try again.");
    } finally {
        if (button) button.disabled = false;
        if (heartIcon) heartIcon.classList.remove('fa-spin');
        updateWishlistButtonsVisualState();
        updateWishlistBadges();
    }
}

export function updateWishlistButtonsVisualState() {
    const allWishlistButtons = document.querySelectorAll('.wishlist-button');
    allWishlistButtons.forEach(button => {
        const propertyId = button.dataset.propertyId;
        const heartIcon = button.querySelector('i');

        if (propertyId && heartIcon) {
            heartIcon.classList.remove('fas', 'far');
            button.classList.remove('active');

            if (state.currentUserId && state.userWishlist.has(String(propertyId))) {
                heartIcon.classList.add('fas');
                button.classList.add('active');
                button.setAttribute('aria-label', 'Remove from wishlist');
            } else {
                heartIcon.classList.add('far');
                button.setAttribute('aria-label', 'Add to wishlist');
            }
        }
    });
}

export function updateWishlistBadges() {
    const count = state.userWishlist.size;
    const badgeElement = getWishlistBadgeElement();

    if (badgeElement) {
        if (count > 0 && state.currentUserId) {
            badgeElement.textContent = count;
            badgeElement.style.display = 'flex';
        } else {
            badgeElement.style.display = 'none';
        }
    }
}

export function initWishlistGlobalClickHandler() {
    document.body.addEventListener('click', (event) => {
        const button = event.target.closest('.wishlist-button');
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const propertyId = button.dataset.propertyId;
        if (!propertyId) {
            console.warn("Wishlist button clicked without a property ID.");
            return;
        }
        toggleWishlistOnServer(propertyId);
    });
}


