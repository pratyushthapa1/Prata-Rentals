// js/wishlist.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Wishlist JS loaded");

    const loginPrompt = document.getElementById('login-prompt');
    const wishlistGrid = document.getElementById('wishlist-grid');
    const emptyMsg = document.getElementById('empty-wishlist-message');
    const loadingMsg = document.getElementById('wishlist-loading');

    // --- Check Login Status ---
    // !! Replace this with your actual Firebase Auth check !!
    const checkLoginStatus = () => {
        // Example using localStorage simulation - REPLACE THIS
        return localStorage.getItem('prata_loggedIn') === 'true';
        // Example using Firebase Auth (assuming 'auth' object is available globally or imported)
        // return auth.currentUser != null;
    };

    const isLoggedIn = checkLoginStatus();

    // --- Helper Functions (Can be moved to script.js if shared) ---
    const getWishlist = () => {
        // !! Replace with Firebase Firestore fetch if logged in, otherwise use localStorage !!
        if (isLoggedIn) {
             // Placeholder: Fetch from Firestore - requires backend setup
             console.warn("Firestore fetch for wishlist not implemented. Using localStorage as fallback.");
             const wishlist = localStorage.getItem('prata_wishlist');
             return wishlist ? new Set(JSON.parse(wishlist)) : new Set();
        } else {
            // For logged-out users, maybe show empty or use localStorage if desired
            const wishlist = localStorage.getItem('prata_wishlist');
            return wishlist ? new Set(JSON.parse(wishlist)) : new Set();
        }
    };

    const saveWishlist = (wishlistSet) => {
         // !! Replace with Firebase Firestore update if logged in !!
         if (isLoggedIn) {
             // Placeholder: Update Firestore - requires backend setup
             console.warn("Firestore save for wishlist not implemented. Saving to localStorage as fallback.");
             localStorage.setItem('prata_wishlist', JSON.stringify(Array.from(wishlistSet)));
         } else {
            localStorage.setItem('prata_wishlist', JSON.stringify(Array.from(wishlistSet)));
         }
         // Update badges globally (assuming updateWishlistBadges is in script.js or defined here)
         if (typeof updateWishlistBadges === 'function') {
             updateWishlistBadges();
         }
    };

     // --- Function to create property card HTML (similar to search results) ---
     const createWishlistCard = (property) => {
        const link = document.createElement('a');
        link.href = `property.html?id=${property.id}`;
        link.classList.add('property-card-link');
        link.dataset.propertyId = property.id;

        const card = document.createElement('article');
        card.classList.add('property-card');
        card.dataset.propertyId = property.id;

        const priceFormatted = typeof formatCurrency === 'function'
            ? formatCurrency(property.price, property.currency) + (property.priceSuffix || '')
            : `NPR ${property.price || 'N/A'}`; // Fallback

        let featuresHTML = '';
        if (property.features && property.features.length > 0) {
            featuresHTML = property.features.slice(0, 2).map(f =>
                `<span><i class="fas ${f.icon || 'fa-check'}"></i> ${f.text || ''}</span>`
            ).join('');
        }
         // Add floor/wifi info if needed
         if (property.floorNumber) featuresHTML += `<span><i class="fas fa-building"></i> Floor ${property.floorNumber}</span>`;
         if (property.numberOfFloors) featuresHTML += `<span><i class="fas fa-layer-group"></i> ${property.numberOfFloors} Floors</span>`;
         if (property.hasWifi) featuresHTML += `<span><i class="fas fa-wifi"></i> WiFi</span>`;


        card.innerHTML = `
            <div class="card-image-container">
                <img src="${property.image || 'images/placeholder.png'}" alt="${property.title || 'Property'}" class="card-image" loading="lazy">
                ${property.tag ? `<span class="card-tag card-tag-${property.tag.toLowerCase()}">${property.tag}</span>` : ''}
                <div class="card-price">${priceFormatted}</div>
                <button class="remove-wishlist-btn" data-property-id="${property.id}" aria-label="Remove from wishlist">
                    <i class="fas fa-times"></i> <!-- Use Times icon -->
                </button>
            </div>
            <div class="card-text-content">
                <h3 class="card-title">${property.title || 'Untitled Property'}</h3>
                <p class="card-location"><i class="fas fa-map-marker-alt"></i> ${property.location || 'N/A'}</p>
                <div class="card-features">
                    ${featuresHTML || '<span>Details available</span>'}
                </div>
            </div>
        `;
        link.appendChild(card);
        return link;
    };


    // --- Function to load and display wishlist items ---
    const loadWishlistItems = async () => {
        if (!wishlistGrid || !loadingMsg || !emptyMsg) return; // Ensure elements exist

        wishlistGrid.innerHTML = ''; // Clear any placeholders
        loadingMsg.style.display = 'block'; // Show loading
        emptyMsg.style.display = 'none';

        try {
            const wishlistIds = getWishlist(); // Get Set of IDs

            if (wishlistIds.size === 0) {
                loadingMsg.style.display = 'none';
                emptyMsg.style.display = 'block';
                return; // Nothing to load
            }

            // Fetch all properties data
            const response = await fetch('properties.json'); // Adjust path if needed
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const allProperties = await response.json();

            // Filter all properties to get only those in the wishlist
            const wishlistedProperties = allProperties.filter(property =>
                wishlistIds.has(String(property.id)) // Ensure comparison uses strings if IDs are strings
            );

            loadingMsg.style.display = 'none'; // Hide loading

            if (wishlistedProperties.length === 0) {
                emptyMsg.style.display = 'block'; // Show empty if IDs existed but properties not found
            } else {
                wishlistedProperties.forEach(property => {
                    const cardElement = createWishlistCard(property);
                    wishlistGrid.appendChild(cardElement);
                });
            }

        } catch (error) {
            console.error("Error loading wishlist items:", error);
            loadingMsg.style.display = 'none';
            wishlistGrid.innerHTML = '<p style="color: red; text-align: center; grid-column: 1 / -1;">Could not load wishlist items.</p>';
        }
    };


    // --- Main Logic Execution ---
    if (!isLoggedIn) {
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (wishlistGrid) wishlistGrid.style.display = 'none';
        if (loadingMsg) loadingMsg.style.display = 'none'; // Hide loading if not logged in
        if (emptyMsg) emptyMsg.style.display = 'none';
    } else {
        // User is logged in, proceed to load items
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (wishlistGrid) wishlistGrid.style.display = 'grid'; // Ensure grid is visible

        loadWishlistItems(); // Load items dynamically

        // Attach listener for remove buttons within the grid
        if (wishlistGrid) {
            wishlistGrid.addEventListener('click', (e) => {
                const removeButton = e.target.closest('.remove-wishlist-btn');
                if (removeButton) {
                    e.preventDefault(); // Prevent link navigation if card is link
                    e.stopPropagation(); // Prevent bubbling

                    const propertyIdToRemove = removeButton.dataset.propertyId;
                    const cardLink = removeButton.closest('.property-card-link');

                    if (propertyIdToRemove && cardLink) {
                        console.log(`Attempting to remove property ID: ${propertyIdToRemove}`);

                        // 1. Update the data store (localStorage or Firestore)
                        const currentWishlist = getWishlist();
                        currentWishlist.delete(propertyIdToRemove);
                        saveWishlist(currentWishlist); // Save updated list & update badge

                        // 2. Remove the card visually
                        cardLink.style.transition = 'opacity 0.3s ease-out'; // Add fade effect
                        cardLink.style.opacity = '0';
                        setTimeout(() => {
                             cardLink.remove();
                             // Check if wishlist is now empty after removal
                             if (wishlistGrid.children.length === 0 || wishlistGrid.querySelectorAll('.property-card-link').length === 0) {
                                if (emptyMsg) emptyMsg.style.display = 'block';
                             }
                        }, 300); // Remove after fade


                    }
                }
            });
        }
    }
}); // End DOMContentLoaded