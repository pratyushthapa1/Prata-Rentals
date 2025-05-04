    // js/script.js
    document.addEventListener('DOMContentLoaded', () => {
        console.log("PRATA Master Script Initialized");

        // ==========================================
        // 1. COMMON UTILITY FUNCTIONS & SETUP
        // ==========================================

        /**
         * Formats a number as NPR currency.
         * @param {number|string} amount - The amount to format.
         * @param {string} [currency='NPR'] - The currency code (default NPR).
         * @returns {string} Formatted currency string or "NPR N/A".
         */
        const formatCurrency = (amount, currency = 'NPR') => {
            const numericAmount = Number(amount);
            if (isNaN(numericAmount)) return `${currency} N/A`;
            // Use 'en-IN' locale for comma separation common in the region
            // Use 0 fraction digits for general display consistency
            return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        };

        /**
         * Formats a date string or Date object into YYYY-MM-DD format.
         * @param {string|Date} dateInput - The date to format.
         * @returns {string} Formatted date string or placeholder.
         */
        const formatDate = (dateInput) => {
            if (!dateInput) return '-- / -- / ----';
            try {
                const date = new Date(dateInput);
                // Adjust for potential timezone issues when creating date from YYYY-MM-DD string
                const offsetDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
                if (isNaN(offsetDate.getTime())) return '-- / -- / ----'; // Check if date is valid
                const year = offsetDate.getFullYear();
                const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
                const day = String(offsetDate.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            } catch (e) {
                console.error("Error formatting date:", e);
                return '-- / -- / ----';
            }
        };

        /**
         * Calculates the number of nights between two dates.
         * @param {string|Date} checkin - Start date.
         * @param {string|Date} checkout - End date.
         * @returns {number} Number of nights (0 if invalid).
         */
        const calculateNights = (checkin, checkout) => {
            if (!checkin || !checkout) return 0;
            try {
                const date1 = new Date(checkin);
                const date2 = new Date(checkout);
                // Add timezone offset adjustment here too if comparing user input dates
                const offsetDate1 = new Date(date1.getTime() + date1.getTimezoneOffset() * 60000);
                const offsetDate2 = new Date(date2.getTime() + date2.getTimezoneOffset() * 60000);

                if (isNaN(offsetDate1.getTime()) || isNaN(offsetDate2.getTime()) || offsetDate2 <= offsetDate1) return 0;
                // Calculate difference in milliseconds and convert to days
                const diffTime = Math.abs(offsetDate2 - offsetDate1);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            } catch (e) {
                console.error("Error calculating nights:", e);
                return 0;
            }
        };

        // --- Common Navigation Handler ---
        const logoLink = document.querySelector('.header-logo');
        if (logoLink) {
            logoLink.addEventListener('click', (e) => {
                const href = logoLink.getAttribute('href');
                // Only prevent default if href is exactly '#'
                if (href === '#') {
                    e.preventDefault();
                    window.location.href = 'index.html'; // Ensure navigation to home
                }
                // Otherwise, let the browser handle navigation for href="index.html"
            });
        }


        // ==========================================
        // 2. WISHLIST MANAGEMENT (using localStorage)
        //    Functions defined here, listener attached later
        // ==========================================
        // !! NOTE: Replace localStorage with Firebase Firestore for logged-in users !!

        const getWishlist = () => {
            // In a real app, check auth state first
            // if (auth.currentUser) { /* fetch from Firestore */ } else { /* use localStorage or disable */ }
            const wishlist = localStorage.getItem('prata_wishlist');
            return wishlist ? new Set(JSON.parse(wishlist)) : new Set();
        };

        const saveWishlist = (wishlistSet) => {
            // if (auth.currentUser) { /* save to Firestore */ } else { /* save to localStorage or prompt login */ }
            localStorage.setItem('prata_wishlist', JSON.stringify(Array.from(wishlistSet)));
            updateWishlistBadges(); // Update UI immediately
        };

        const updateWishlistButtonsVisualState = () => {
            const currentWishlist = getWishlist();
            const allWishlistButtons = document.querySelectorAll('.wishlist-button');

            allWishlistButtons.forEach(button => {
                const propertyId = button.dataset.propertyId;
                const heartIcon = button.querySelector('i');

                if (propertyId && heartIcon) {
                    // Ensure consistent state by removing both classes first
                    heartIcon.classList.remove('fas', 'far');
                    button.classList.remove('active');

                    if (currentWishlist.has(propertyId)) {
                        heartIcon.classList.add('fas'); // Solid heart
                        button.classList.add('active'); // For CSS styling
                        button.setAttribute('aria-label', 'Remove from wishlist');
                    } else {
                        heartIcon.classList.add('far'); // Regular heart
                        button.setAttribute('aria-label', 'Add to wishlist');
                    }
                }
            });
        };

        const updateWishlistBadges = () => {
            const currentWishlist = getWishlist();
            const count = currentWishlist.size;
            const badgeElements = document.querySelectorAll('.wishlist-count-badge');

            badgeElements.forEach(badge => {
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            });
        };

        // --- The core function that handles adding/removing ---
        const handleWishlistClick = (event) => {
            const button = event.target.closest('.wishlist-button');
            if (!button) return; // Exit if the click wasn't on a wishlist button

            event.preventDefault(); // Stop link navigation if inside <a>
            event.stopPropagation(); // Stop event from bubbling up to parent <a>

            const propertyId = button.dataset.propertyId;
            if (!propertyId) {
                console.warn("Wishlist button clicked missing property ID.");
                return;
            }

            // Add check: Prompt login if trying to wishlist while logged out?
            // if (!auth.currentUser) { alert("Please log in to save to wishlist."); return; }

            console.log(`Wishlist button clicked for property: ${propertyId}`); // Debug log
            const currentWishlist = getWishlist();

            if (currentWishlist.has(propertyId)) {
                currentWishlist.delete(propertyId);
                console.log(`Removed property ${propertyId} from wishlist.`);
            } else {
                currentWishlist.add(propertyId);
                console.log(`Added property ${propertyId} to wishlist.`);
                // Optional: Add visual feedback like a small animation
            }

            saveWishlist(currentWishlist);
            updateWishlistButtonsVisualState(); // Update ALL buttons on the page visually
        };

        // ==========================================
        // 3. GLOBAL EVENT LISTENER (Wishlist Click Delegation)
        // ==========================================
        // Attach listener ONCE to the body. Handles clicks on any .wishlist-button.
        document.body.addEventListener('click', handleWishlistClick);


        // ==========================================
        // 4. HELPER FUNCTION (Used by multiple pages)
        // ==========================================

        /**
         * Creates HTML element for a property card.
         * @param {object} property - The property data object.
         * @returns {HTMLElement} The created <a> element containing the card.
         */
        const createPropertyCardElement = (property) => {
            if (!property) return null;

            const link = document.createElement('a');
            link.href = `property.html?id=${property.id}`;
            link.classList.add('property-card-link');
            link.dataset.propertyId = property.id;

            const card = document.createElement('article');
            card.classList.add('property-card');
            card.dataset.propertyId = property.id;

            const priceFormatted = formatCurrency(property.price, property.currency) + (property.priceSuffix || '');

            // Simplified features for card display (customize as needed)
            let featuresHTML = '';
            if (property.features && property.features.length > 0) {
                featuresHTML = property.features.slice(0, 3).map(f => // Show up to 3 features
                    `<span><i class="fas ${f.icon || 'fa-check'}"></i> ${f.text || ''}</span>`
                ).join('');
            } else {
                // Fallback if no features array, maybe show beds/baths if they exist directly
                if(property.bedrooms) featuresHTML += `<span><i class="fas fa-bed"></i> ${property.bedrooms} Bed(s)</span>`;
                if(property.bathrooms) featuresHTML += `<span><i class="fas fa-bath"></i> ${property.bathrooms} Bath(s)</span>`;
            }

            card.innerHTML = `
                <div class="card-image-container">
                    <img src="${property.image || 'images/placeholder.png'}" alt="${property.title || 'Property'}" class="card-image" loading="lazy">
                    ${property.tag ? `<span class="card-tag card-tag-${property.tag.toLowerCase()}">${property.tag}</span>` : ''}
                    <div class="card-price">${priceFormatted}</div>
                    <button class="wishlist-button on-card-wishlist" data-property-id="${property.id}" aria-label="Add to wishlist">
                        <i class="far fa-heart"></i> <!-- Start empty, JS will update -->
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


            // ==========================================
    // 5. PAGE-SPECIFIC LOGIC
    // ==========================================

    // --- Homepage (index.html) Specific ---
    const featuredGrid = document.getElementById('featured-rentals-grid'); // Target grid for featured rentals
    const searchFormHero = document.getElementById('search-form-hero'); // Used to confirm we are on index page

    // Check if the essential elements for the index page's dynamic featured section exist
    if (featuredGrid && searchFormHero) {
        console.log("Index page specific JS running: Loading featured rentals...");

        /**
         * Fetches properties, filters for featured/popular, and displays them.
         */
        const loadFeaturedRentals = async () => {
            const loadingElement = document.getElementById('featured-loading'); // The loading message element

            // Ensure elements exist before proceeding
            if (!loadingElement) {
                console.error("Loading element #featured-loading not found.");
                return; // Stop if loading element is missing
            }

            try {
                // Fetch properties data
                // ** IMPORTANT: Make sure 'properties.json' path is correct relative to index.html **
                const response = await fetch('properties.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} fetching properties.json`);
                }
                const allProperties = await response.json();

                // --- Filter for featured/popular items ---
                const featuredProperties = allProperties
                    .filter(p => p.tag === 'Featured' || p.tag === 'Popular') // Select based on tag
                    .slice(0, 4); // Limit to the first 4 matching items

                // --- Display logic ---
                loadingElement.style.display = 'none'; // Hide loading message
                featuredGrid.innerHTML = ''; // Clear the grid (removes loading msg implicitly if it was inside)

                if (featuredProperties.length === 0) {
                    // Display a message if no featured properties are found
                    featuredGrid.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; padding: 2rem; color: #888;">No featured properties available at the moment.</p>';
                } else {
                    // --- Populate Grid ---
                    featuredProperties.forEach(property => {
                        // Use the helper function (defined earlier in the script) to create each card
                        const cardElement = createPropertyCardElement(property);
                        if (cardElement) { // Make sure card creation was successful
                            featuredGrid.appendChild(cardElement);
                        } else {
                            console.warn(`Failed to create card element for property ID: ${property.id}`);
                        }
                    });

                    // --- IMPORTANT: Update Wishlist States ---
                    // Call this *after* the cards have been added to the DOM
                    // so the buttons exist for the function to find them.
                    updateWishlistButtonsVisualState();
                }

            } catch (error) {
                // --- Error Handling ---
                console.error("Error loading featured rentals:", error);
                if (loadingElement) loadingElement.style.display = 'none'; // Hide loading on error too
                // Display user-friendly error in the grid area
                featuredGrid.innerHTML = `<p style="color: red; text-align: center; grid-column: 1 / -1;">Could not load featured properties. Please try refreshing the page.</p>`;
            }
        };

        // --- Other Index Page Logic (Search Form) ---
        const priceRangeInputHero = document.getElementById('price-range-hero');
        const categorySelectHero = document.getElementById('category-hero');

        // Add Price Validation Listener
        if (priceRangeInputHero) {
            priceRangeInputHero.addEventListener('input', function() {
                this.setCustomValidity('');
                if (this.value && parseInt(this.value, 10) < 0) {
                    this.setCustomValidity('Price cannot be negative.');
                }
            });
            priceRangeInputHero.addEventListener('blur', function() {
                if (!this.checkValidity()) { this.reportValidity(); }
            });
        }

        // Add Search Form Submit Listener (Conditional Redirect)
        if (searchFormHero && categorySelectHero) {
            searchFormHero.addEventListener('submit', function(e) {
                // Price validation check before determining action
                if (priceRangeInputHero && !priceRangeInputHero.checkValidity()) {
                    e.preventDefault(); // Stop submission
                    priceRangeInputHero.reportValidity();
                    return; // Exit handler
                }
                // Set action based on category
                const selectedCategory = categorySelectHero.value;
                this.action = (selectedCategory === 'Room') ? 'rooms.html' : 'search-results.html';
                console.log("Index search submitting to:", this.action);
                // Allow default submission to the modified action URL
            });
        }

        // --- Trigger the loading of featured rentals ---
        loadFeaturedRentals();

    } // End Homepage Specific block


        // --- Property Details Page (property.html) Specific ---
        // Note: property-details.js should handle most of the dynamic loading here.
        // This script mainly ensures the global wishlist handler works.
        if (document.body.contains(document.getElementById('property-content'))) {
            console.log("Property details page specific JS running");

            const inquiryForm = document.getElementById('inquiry-form');
            if (inquiryForm) {
                const resetButton = inquiryForm.querySelector('.btn-reset');
                inquiryForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    // --- Add Real Inquiry Submission (AJAX/Fetch to backend) ---
                    console.log('Inquiry submitted (simulation)!');
                    alert('Inquiry form submission simulated. In a real app, this would send data to the server.');
                    // Optionally clear form or show success message here
                    // window.location.href = 'message.html?type=inquiry_sent'; // Or redirect
                });

                if(resetButton) {
                    // Reset button type="reset" works natively
                    resetButton.addEventListener('click', () => { console.log('Inquiry form reset.'); });
                }
            }
            // Wishlist button on this page is handled by the global listener
        } // End Property Details Page Specific


        // --- Booking Page (booking.html) Specific ---
        // Assuming booking.js handles its own logic and might be loaded separately OR
        // If you want it *all* here, copy the relevant booking logic block here.
        // For now, keeping it separate as it's complex. If booking.js exists, it will run.
        if (document.body.contains(document.getElementById('booking-form'))) {
            console.log("Booking page detected - assuming booking.js handles logic.");
            // If NOT using separate booking.js, paste the entire booking logic block from previous answer here.
            // Ensure it uses the common utility functions defined at the top.
        } // End Booking Page Specific


        // --- Contact Page (contact.html) Specific ---
        if (document.body.contains(document.getElementById('contact-form'))) {
            console.log("Contact page specific JS running");
            const contactForm = document.getElementById('contact-form');
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if (!contactForm.checkValidity()) {
                    contactForm.reportValidity();
                    alert('Please fill in all required fields.');
                    return;
                }
                // --- Add Real Contact Form Submission (AJAX/Fetch to backend) ---
                console.log('Contact form submitted (simulation)!');
                alert('Message sending simulated. Redirecting...');
                window.location.href = 'message.html?type=contact_sent'; // Redirect to a confirmation
            });
        } // End Contact Page Specific


        // --- Wishlist Page (wishlist.html) Specific ---
        // Note: wishlist.js should handle its own logic OR copy it here.
        // Global wishlist button handler works for adding/removing state,
        // but displaying items requires specific logic for this page.
        if (document.body.contains(document.getElementById('wishlist-grid'))) {
            console.log("Wishlist page detected - assuming wishlist.js handles logic.");
            // If NOT using separate wishlist.js, paste the relevant logic here:
            // 1. Check login status placeholder
            // 2. Call a function like loadWishlistItems()
            // 3. loadWishlistItems would:
            //    - getWishlist()
            //    - fetch properties.json
            //    - filter properties based on wishlist IDs
            //    - call createPropertyCardElement() for each
            //    - append to #wishlist-grid
            //    - handle loading/empty states
            //    - Call updateWishlistButtonsVisualState() after rendering
            // The remove button click is handled by the global listener, but you might
            // want extra logic here to visually remove the card immediately.
        } // End Wishlist Page Specific


        // ==========================================
        // 6. FINAL INITIALIZATION (Runs on ALL page loads)
        // ==========================================
        console.log("Running final initializations (wishlist state/badge)...");
        updateWishlistButtonsVisualState(); // Set initial heart states everywhere
        updateWishlistBadges(); // Set initial badge count in header


    }); // === End of DOMContentLoaded ===