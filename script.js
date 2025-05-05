// js/script.js
console.log("PRATA Master Script Initialized - Integrating Firebase");

// ==========================================
// 1. FIREBASE INITIALIZATION (MUST BE FIRST)
// ==========================================

// --- Define Firebase Config Object ONCE ---
const firebaseConfig = {
    apiKey: "AIzaSyBnj99ND8CggU26pWEKye4LM7YDdfsa-UM", // Replace with your actual key if different
    authDomain: "prata-rentals.firebaseapp.com",
    projectId: "prata-rentals",
    storageBucket: "prata-rentals.appspot.com", // Corrected: .appspot.com usually
    messagingSenderId: "111004710794",
    appId: "1:111004710794:web:8d37d8577b84069fe9fa73",
    measurementId: "G-G0WKY8JJQN" // Optional
};
// --- END FIREBASE CONFIG ---

// --- Initialize Firebase using v8 compat syntax ---
let app, auth, db, storage, analytics; // Declare globally within script scope
try {
    // Initialize Firebase App (needed first)
    app = firebase.initializeApp(firebaseConfig);

    // Initialize other services (check if SDKs are included in HTML)
    if (typeof firebase.auth === 'function') {
        auth = firebase.auth();
    } else {
        console.warn("Firebase Auth SDK not included or failed to load.");
    }

    if (typeof firebase.firestore === 'function') {
        db = firebase.firestore();
        // Optional: Configure Firestore settings if needed
        // db.settings({ /* ... */ });
    } else {
        console.warn("Firebase Firestore SDK not included or failed to load.");
    }

    if (typeof firebase.storage === 'function') {
        storage = firebase.storage();
    } else {
        console.warn("Firebase Storage SDK not included or failed to load.");
    }

    if (typeof firebase.analytics === 'function') {
       analytics = firebase.analytics(); // Optional: Initialize Analytics
       console.log("Firebase Analytics Initialized");
    }


    console.log("Firebase Services Initialized (using v8 compat)");

} catch (error) {
    console.error("FATAL: Firebase initialization failed:", error);
    // Optionally display a message to the user on the page
    // Avoid innerHTML replacement if possible, prefer appending/updating a specific error div
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = '<p style="color: red; background: #fee; border: 1px solid red; padding: 15px; text-align: center; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999;">Error initializing application services. Features depending on the database may not work. Please try refreshing the page or contact support.</p>';
    document.body.prepend(errorDiv); // Add error message at the top
}


// ==========================================
// 2. COMMON UTILITY FUNCTIONS & SETUP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase services are available before proceeding
    if (!auth || !db) {
        console.error("Firebase Auth or Firestore failed to initialize. Aborting dependent operations.");
        // Maybe show a more prominent error message to the user here
        return; // Stop further execution within DOMContentLoaded if core services failed
    }

    console.log("DOM Fully Loaded - Attaching Event Listeners and Running Page Logic");

    /**
     * Formats a number as NPR currency.
     * @param {number|string} amount - The amount to format.
     * @param {string} [currency='NPR'] - The currency code (default NPR).
     * @returns {string} Formatted currency string or "NPR N/A".
     */
    const formatCurrency = (amount, currency = 'NPR') => {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) return `${currency} N/A`;
        return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    /**
     * Formats various date inputs into a readable string (e.g., Jan 5, 2024).
     * Handles Firebase Timestamps, Date objects, or valid date strings.
     * @param {firebase.firestore.Timestamp|Date|string} dateInput - The date to format.
     * @returns {string} Formatted date string or placeholder.
     */
    const formatReadableDate = (dateInput) => {
        if (!dateInput) return '--';
        try {
            let date;
             // Use the globally available firebase object for Timestamp check
            if (dateInput instanceof firebase.firestore.Timestamp) {
                date = dateInput.toDate();
            } else if (dateInput instanceof Date) {
                date = dateInput;
            } else {
                date = new Date(dateInput); // Attempt to parse string
            }

            if (isNaN(date.getTime())) return '--'; // Invalid date

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch (e) {
            console.error("Error formatting date:", e, "Input:", dateInput);
            return '--';
        }
    };

    // Keep calculateNights if needed for booking, otherwise remove
    const calculateNights = (checkin, checkout) => {
        if (!checkin || !checkout) return 0;
            try {
                const date1 = (checkin instanceof firebase.firestore.Timestamp) ? checkin.toDate() : new Date(checkin);
                const date2 = (checkout instanceof firebase.firestore.Timestamp) ? checkout.toDate() : new Date(checkout);

                if (isNaN(date1.getTime()) || isNaN(date2.getTime()) || date2 <= date1) return 0;
                // Calculate difference in milliseconds and convert to days
                const diffTime = Math.abs(date2 - date1);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays;
            } catch (e) {
                console.error("Error calculating nights:", e);
                return 0;
            }
     };


    // --- Common Navigation Handler ---
    const logoLink = document.querySelector('.header-logo a'); // Adjusted selector
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            // Allow default navigation for explicit href="index.html"
        });
    }

    // ==========================================
    // 3. AUTHENTICATION STATE & UI UPDATES
    // ==========================================
    let currentUserId = null; // Store current user ID globally within scope
    let userWishlist = new Set(); // Store user's wishlist IDs

    const profileLinkElement = document.querySelector('.profile-icon'); // Target the wrapper div/icon
    const listPropertyBtn = document.querySelector('.btn-header-cta');

    // --- Auth State Listener ---
    auth.onAuthStateChanged(async (user) => { // Make async to fetch wishlist
        if (user) {
            // User is signed in.
            currentUserId = user.uid;
            console.log("Auth state changed: User is LOGGED IN", currentUserId);

            // Update Profile UI
            if (profileLinkElement) {
                profileLinkElement.classList.add('logged-in');
                profileLinkElement.setAttribute('aria-label', `Profile Menu for ${user.email || 'User'}`);
                const profileIcon = profileLinkElement.querySelector('i');
                 if (profileIcon) profileIcon.className = 'fas fa-circle-user'; // Solid icon
                // TODO: Add click listener to profileLinkElement to open a dropdown/menu
            }
            if (listPropertyBtn) listPropertyBtn.style.display = 'inline-block'; // Show button

            // Fetch User's Wishlist (only if db is available)
            if (db) {
                await fetchUserWishlist();
            } else {
                console.warn("Firestore (db) not available, cannot fetch wishlist.");
                updateWishlistButtonsVisualState(); // Still update buttons (will show empty)
                updateWishlistBadges();
            }

        } else {
            // User is signed out.
            currentUserId = null;
            userWishlist = new Set();
            console.log("Auth state changed: User is LOGGED OUT");

            // Update Profile UI
            if (profileLinkElement) {
                profileLinkElement.classList.remove('logged-in');
                profileLinkElement.setAttribute('aria-label', 'Profile Menu / Login');
                 const profileIcon = profileLinkElement.querySelector('i');
                 if (profileIcon) profileIcon.className = 'far fa-circle-user'; // Regular icon
                 // TODO: Add click listener to profileLinkElement to redirect to login/signup
            }
             if (listPropertyBtn) listPropertyBtn.style.display = 'none'; // Hide button

             // Update Wishlist UI for logged-out state
             updateWishlistButtonsVisualState();
             updateWishlistBadges();
        }
    });
    // --- End Auth State Change ---


    // ==========================================
    // 4. WISHLIST MANAGEMENT (Firebase Firestore Version)
    // ==========================================

    /**
     * Fetches the current user's wishlist from Firestore and updates local state.
     */
    const fetchUserWishlist = async () => {
        // Added db check here for safety, though already checked before calling
        if (!currentUserId || !db) {
            userWishlist = new Set();
            updateWishlistButtonsVisualState();
            updateWishlistBadges();
            return;
        }
        console.log(`Fetching wishlist for user ${currentUserId}...`); // Debug log
        try {
            const userDocRef = db.collection('users').doc(currentUserId);
            const docSnap = await userDocRef.get();

            if (docSnap.exists) {
                const userData = docSnap.data();
                // Ensure the field exists and is an array before creating Set
                userWishlist = new Set(Array.isArray(userData.wishlistedProperties) ? userData.wishlistedProperties : []);
                console.log("Fetched user wishlist:", Array.from(userWishlist));
            } else {
                console.log(`User document ${currentUserId} not found, starting with empty wishlist.`);
                userWishlist = new Set();
                // You might want to create the user document here if it's standard practice for your app
                // await userDocRef.set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); // Example: Create doc if missing
            }
        } catch (error) {
            console.error("Error fetching user wishlist:", error);
            userWishlist = new Set(); // Reset on error for safety
        } finally {
            // Update UI after fetch attempt
            updateWishlistButtonsVisualState();
            updateWishlistBadges();
        }
    };

    /**
     * Adds or removes a property ID from the user's wishlist in Firestore.
     */
    const toggleWishlistInFirestore = async (propertyId) => {
        if (!currentUserId || !db) {
            console.warn("Cannot update wishlist: User not logged in or DB not available.");
            alert("Please log in to manage your wishlist.");
            return;
        }

        const button = document.querySelector(`.wishlist-button[data-property-id="${propertyId}"]`);
        const heartIcon = button?.querySelector('i');

        // Visual feedback: Temporarily disable/show loading
        if(button) button.disabled = true;
        if(heartIcon) heartIcon.classList.add('fa-spin'); // Add spinning animation if you have Font Awesome spinning styles

        const userDocRef = db.collection('users').doc(currentUserId);
        const isCurrentlyWishlisted = userWishlist.has(propertyId);

        // Use the globally available firebase object for FieldValue
        const updateAction = isCurrentlyWishlisted
            ? firebase.firestore.FieldValue.arrayRemove(propertyId)
            : firebase.firestore.FieldValue.arrayUnion(propertyId);

        try {
            // Ensure user document exists before updating (optional but safer)
            const docSnap = await userDocRef.get();
            if (!docSnap.exists) {
                 // Create the document with the initial wishlist item if adding
                 if (!isCurrentlyWishlisted) {
                    await userDocRef.set({ wishlistedProperties: [propertyId], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                    console.log(`Created user doc and added ${propertyId} to wishlist.`);
                    userWishlist.add(propertyId); // Update local state
                 } else {
                    // This case (trying to remove from non-existent doc) shouldn't happen if fetchUserWishlist ran
                    console.warn(`User document ${currentUserId} not found, cannot remove ${propertyId}.`);
                    throw new Error("User profile not found."); // Throw error to handle below
                 }
            } else {
                 // Update existing document
                await userDocRef.update({
                    wishlistedProperties: updateAction
                });
                 // Update local state
                if (isCurrentlyWishlisted) {
                    userWishlist.delete(propertyId);
                    console.log(`Removed ${propertyId} from Firestore wishlist.`);
                } else {
                    userWishlist.add(propertyId);
                    console.log(`Added ${propertyId} to Firestore wishlist.`);
                }
            }

            // Update UI (only after successful operation)
            updateWishlistButtonsVisualState();
            updateWishlistBadges();

        } catch (error) {
            console.error("Error updating Firestore wishlist:", error);
            alert("Could not update wishlist. Please try again.");
            // Revert UI changes if necessary (complex, might skip for basic implementation)
        } finally {
             // Re-enable button and remove spinner regardless of success/error
             if(button) button.disabled = false;
             if(heartIcon) heartIcon.classList.remove('fa-spin');
        }
    };

    /**
     * Updates the visual appearance (heart icon, active class) of ALL wishlist buttons.
     */
    const updateWishlistButtonsVisualState = () => {
        const allWishlistButtons = document.querySelectorAll('.wishlist-button');

        allWishlistButtons.forEach(button => {
            const propertyId = button.dataset.propertyId;
            const heartIcon = button.querySelector('i');

            if (propertyId && heartIcon) {
                // Style based on local userWishlist state
                heartIcon.classList.remove('fas', 'far'); // Remove both
                button.classList.remove('active');

                if (userWishlist.has(propertyId)) {
                    heartIcon.classList.add('fas'); // Solid
                    button.classList.add('active');
                    button.setAttribute('aria-label', 'Remove from wishlist');
                } else {
                    heartIcon.classList.add('far'); // Regular
                    button.setAttribute('aria-label', 'Add to wishlist');
                }
                // Show/hide based on login? Or just style differently?
                // button.style.display = currentUserId ? 'inline-block' : 'none'; // Example: hide if logged out
            }
        });
    };

    /**
     * Updates the count displayed in wishlist badge elements.
     */
    const updateWishlistBadges = () => {
        const count = userWishlist.size;
        // Assuming badge is inside header wishlist icon link:
        const badgeElement = document.querySelector('.header-nav .wishlist-icon .wishlist-count-badge');

        if (badgeElement) {
            if (count > 0 && currentUserId) { // Only show badge if logged in and count > 0
                badgeElement.textContent = count;
                badgeElement.style.display = 'flex'; // Use flex to center number if needed
            } else {
                badgeElement.style.display = 'none';
            }
        }
    };

    /**
     * Handles clicks on wishlist buttons using event delegation.
     */
    const handleWishlistClick = (event) => {
        const button = event.target.closest('.wishlist-button');
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        const propertyId = button.dataset.propertyId;
        if (!propertyId) return;

        if (!currentUserId) {
            alert("Please log in to add items to your wishlist.");
            // TODO: Redirect to login modal/page
            return;
        }
        toggleWishlistInFirestore(propertyId);
    };

    // Attach the single delegated listener
    document.body.addEventListener('click', handleWishlistClick);

    // ==========================================
    // 5. HELPER FUNCTION - CREATE PROPERTY CARD
    // ==========================================

    const createPropertyCardElement = (propertyData, propertyId) => {
        // --- Keep previous implementation, it's good ---
        // (Ensure it uses the global `userWishlist` set correctly for initial state if called before fetch finishes, though `updateWishlistButtonsVisualState` called later is safer)
         if (!propertyData || !propertyId) return null;

        const link = document.createElement('a');
        link.href = `property.html?id=${propertyId}`;
        link.classList.add('property-card-link');
        link.dataset.propertyId = propertyId;

        const card = document.createElement('article');
        card.classList.add('property-card');
        card.dataset.propertyId = propertyId;

        const title = propertyData.title || 'Untitled Property';
        const location = propertyData.location || 'Unknown Location';
        const imageURL = (propertyData.imageURLs && propertyData.imageURLs.length > 0)
                       ? propertyData.imageURLs[0]
                       : 'images/placeholder.png';
        const priceFormatted = formatCurrency(propertyData.price, propertyData.currency) + (propertyData.priceSuffix || '/mo');
        const tag = propertyData.tag || '';
        const bedrooms = propertyData.bedrooms;
        const bathrooms = propertyData.bathrooms;
        const area = propertyData.area;

        let featuresHTML = '';
        if (bedrooms) featuresHTML += `<span><i class="fas fa-bed"></i> ${bedrooms}</span>`;
        if (bathrooms) featuresHTML += `<span><i class="fas fa-bath"></i> ${bathrooms}</span>`;
        if (area) featuresHTML += `<span><i class="fas fa-ruler-combined"></i> ${area} sqft</span>`;

        let tagHTML = '';
        if (tag) {
             const tagClass = tag.toLowerCase().includes('popular') || tag.toLowerCase().includes('featured') ? 'primary-tag' : 'secondary-tag';
             tagHTML = `<span class="card-tag ${tagClass}">${tag}</span>`;
        }

        // Determine initial wishlist state based on current global set
        const isWishlisted = userWishlist.has(propertyId);
        const heartClass = isWishlisted ? 'fas' : 'far';
        const ariaLabel = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist';

        card.innerHTML = `
            <div class="card-image-container">
                <img src="${imageURL}" alt="${title}" class="card-image" loading="lazy">
                ${tagHTML}
                <div class="card-price">${priceFormatted}</div>
                <button class="wishlist-button on-card-wishlist ${isWishlisted ? 'active' : ''}" data-property-id="${propertyId}" aria-label="${ariaLabel}">
                    <i class="${heartClass} fa-heart"></i>
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
                 <!-- The whole card is linked, so use a span -->
                <span class="card-details-link-placeholder" aria-label="View details for ${title}"><i class="fas fa-arrow-right"></i></span>
             </div>
        `;
        link.appendChild(card);
        return link;
    };


    // ==========================================
    // 6. PAGE-SPECIFIC LOGIC
    // ==========================================

    // --- Homepage (index.html) Specific ---
    const featuredGrid = document.querySelector('.featured-rentals .rental-cards-grid');
    const searchFormHero = document.getElementById('search-form-hero');

    if (featuredGrid && searchFormHero && db) {
        console.log("Index page: Loading featured rentals from Firestore...");

        const loadFeaturedRentals = async () => {
            featuredGrid.innerHTML = '<p class="loading-message" style="/* styles */">Loading featured properties...</p>';
            try {
                const querySnapshot = await db.collection('properties')
                                              .where('tag', 'in', ['Featured', 'Popular'])
                                              .orderBy('createdAt', 'desc')
                                              .limit(4)
                                              .get();
                featuredGrid.innerHTML = ''; // Clear loading
                if (querySnapshot.empty) {
                    featuredGrid.innerHTML = '<p>No featured properties available.</p>';
                } else {
                    querySnapshot.forEach(doc => {
                        const cardElement = createPropertyCardElement(doc.data(), doc.id);
                        if (cardElement) featuredGrid.appendChild(cardElement);
                    });
                    // Don't need to call updateWishlistButtonsVisualState here
                    // because createPropertyCardElement now uses the global userWishlist set for initial state,
                    // and the auth listener already called updateWishlistButtonsVisualState after fetching the list.
                }
            } catch (error) {
                console.error("Error loading featured rentals:", error);
                featuredGrid.innerHTML = `<p class="error-message">Could not load properties.</p>`;
            }
        };

        // Search Form Logic (remains the same, redirects with params)
        const priceRangeInputHero = document.getElementById('price-range-hero');
         if (priceRangeInputHero) {
            // ... validation listeners ...
         }
        searchFormHero.addEventListener('submit', function(e) {
           // ... validation and redirect logic ...
            e.preventDefault();
            if (priceRangeInputHero && !priceRangeInputHero.checkValidity()) {
               priceRangeInputHero.reportValidity(); return;
            }
            const location = document.getElementById('location-hero')?.value.trim();
            const category = document.getElementById('category-hero')?.value;
            const max_price = priceRangeInputHero?.value;
            const queryParams = new URLSearchParams();
            if (location) queryParams.set('location', location);
            if (category) queryParams.set('category', category);
            if (max_price) queryParams.set('max_price', max_price);
            const targetPage = 'search-results.html';
            console.log(`Redirecting to ${targetPage}?${queryParams.toString()}`);
            window.location.href = `${targetPage}?${queryParams.toString()}`;
        });

        // Trigger loading
        loadFeaturedRentals();

    } else if (searchFormHero && !db) { /* Handle DB not available */ }


    // --- Property Details Page (property.html) Specific ---
    const propertyContent = document.getElementById('property-content');
    if (propertyContent && db) {
        console.log("Property details page: Loading details...");

        const loadPropertyDetails = async () => {
            // ... (Keep the existing implementation for fetching/populating details) ...
            // It correctly gets ID, fetches doc, populates fields.
            // Make sure to call updateWishlistButtonsVisualState() *after* the wishlist button in the actions section has its data-property-id set.
             const urlParams = new URLSearchParams(window.location.search);
            const propertyId = urlParams.get('id');

            if (!propertyId) { /* ... handle no ID ... */ return; }

            propertyContent.innerHTML = '<p class="loading-message">Loading details...</p>';

            try {
                const docRef = db.collection('properties').doc(propertyId);
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    const property = docSnap.data();
                    propertyContent.innerHTML = ''; // Clear loading

                    // Populate standard fields (title, desc, rent, main image)
                    document.querySelector('.property-info-column h1').textContent = property.title || 'Property Details';
                    document.querySelector('.property-description').innerHTML = property.description?.replace(/\n/g, '<br>') || 'No description available.';
                    document.querySelector('.property-rent').textContent = formatCurrency(property.price, property.currency) + (property.priceSuffix || '/mo');
                    document.querySelector('.property-image-column img').src = (property.imageURLs && property.imageURLs.length > 0) ? property.imageURLs[0] : 'images/placeholder.png';
                    document.querySelector('.property-image-column img').alt = property.title || 'Property Image';

                    // Populate Features
                    const featuresGrid = document.querySelector('.features-grid');
                    if (featuresGrid) {
                        featuresGrid.innerHTML = '';
                        if(property.bedrooms) featuresGrid.insertAdjacentHTML('beforeend', createFeatureHTML('fa-bed', `${property.bedrooms} Bedrooms`));
                        if(property.bathrooms) featuresGrid.insertAdjacentHTML('beforeend', createFeatureHTML('fa-bath', `${property.bathrooms} Bathrooms`));
                        if(property.area) featuresGrid.insertAdjacentHTML('beforeend', createFeatureHTML('fa-ruler-combined', `${property.area} sqft Area`));
                        // Add other features from property.features array if it exists
                        if(property.features && Array.isArray(property.features)) {
                            property.features.forEach(f => featuresGrid.insertAdjacentHTML('beforeend', createFeatureHTML(f.icon, f.text)));
                        }
                    }

                    // Populate Gallery
                     const galleryGrid = document.querySelector('.property-gallery-grid');
                     if (galleryGrid && property.imageURLs && property.imageURLs.length > 1) {
                         galleryGrid.innerHTML = '';
                         property.imageURLs.forEach(url => {
                             galleryGrid.innerHTML += `<div class="gallery-image"><img src="${url}" alt="${property.title || 'Gallery image'}" loading="lazy"></div>`;
                         });
                     } else if (galleryGrid) {
                        galleryGrid.innerHTML = '<p>No additional images available.</p>';
                     }

                    // Populate Map
                    const mapContainerImg = document.querySelector('.property-map-section .map-container img');
                     if (mapContainerImg && property.mapImage) {
                         mapContainerImg.src = property.mapImage;
                         mapContainerImg.closest('.property-map-section').style.display = 'block'; // Ensure section is visible
                     } else if (mapContainerImg) {
                        mapContainerImg.closest('.property-map-section').style.display = 'none'; // Hide if no map
                     }

                    // TODO: Load and Populate Reviews (separate query usually needed)

                    // Set Wishlist Button ID and Update State
                    const detailWishlistButton = document.querySelector('#property-wishlist-btn'); // Give detail page button a unique ID
                     if (detailWishlistButton) {
                         detailWishlistButton.dataset.propertyId = propertyId;
                         updateWishlistButtonsVisualState(); // Update just this button (and others if they exist)
                     }

                     // Set hidden Property ID for Inquiry Form
                     const hiddenPropIdInput = inquiryForm?.querySelector('input[name="propertyId"]');
                     if (hiddenPropIdInput) hiddenPropIdInput.value = propertyId;

                } else { /* ... handle not found ... */
                    propertyContent.innerHTML = '<p class="error-message">Property not found.</p>';
                }
            } catch (error) { /* ... handle error ... */
                 console.error("Error getting property details:", error);
                 propertyContent.innerHTML = '<p class="error-message">Could not load details.</p>';
            }
        };

        // Helper for Features (reuse from previous version)
         function createFeatureHTML(iconClass, text) { /* ... implementation ... */
             return `
                 <article class="feature-item">
                    <div class="feature-icon">
                         <i class="fas ${iconClass || 'fa-check'}"></i>
                    </div>
                    <div class="feature-text">
                        <h4>${text || 'Feature'}</h4>
                    </div>
                 </article>
             `;
         }

        // Inquiry Form Submission Logic (reuse from previous version, ensure it uses global `db`)
        const inquiryForm = document.getElementById('inquiry-form');
        if (inquiryForm && db) {
             // ... keep the async submit handler ...
             const inquiryResetButton = inquiryForm.querySelector('.btn-reset');
             inquiryForm.addEventListener('submit', async function(e) {
                 e.preventDefault();
                 if (!inquiryForm.checkValidity()) { inquiryForm.reportValidity(); return; }

                 const submitButton = inquiryForm.querySelector('button[type="submit"]');
                 const originalButtonText = submitButton.textContent;
                 submitButton.disabled = true; submitButton.textContent = 'Sending...';

                 const name = inquiryForm.querySelector('#inquiry-name')?.value;
                 const email = inquiryForm.querySelector('#inquiry-email')?.value;
                 const message = inquiryForm.querySelector('#inquiry-message')?.value;
                 const urlParams = new URLSearchParams(window.location.search);
                 const propertyId = urlParams.get('id');

                 if (!propertyId) { /* ... handle missing ID ... */ submitButton.disabled = false; submitButton.textContent = originalButtonText; return; }

                 try {
                     await db.collection('inquiries').add({
                         propertyName: document.querySelector('.property-info-column h1')?.textContent || 'N/A',
                         propertyId: propertyId, name, email, message,
                         submittedAt: firebase.firestore.FieldValue.serverTimestamp()
                     });
                     alert('Inquiry sent!'); inquiryForm.reset();
                 } catch (error) { console.error('Error saving inquiry:', error); alert('Error sending inquiry.'); }
                 finally { submitButton.disabled = false; submitButton.textContent = originalButtonText; }
             });
             if(inquiryResetButton) { inquiryResetButton.addEventListener('click', () => inquiryForm.reset()); }
        }

        // Trigger loading details
        loadPropertyDetails();

    } // End Property Details Page Specific


    // --- Contact Page (contact.html) Specific ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm && db) {
        // ... keep the async submit handler ...
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true; submitButton.textContent = 'Sending...';

            const name = contactForm.querySelector('#contact-name')?.value;
            const email = contactForm.querySelector('#contact-email')?.value;
            const message = contactForm.querySelector('#contact-purpose')?.value;

            try {
                 await db.collection('contactMessages').add({ name, email, message, submittedAt: firebase.firestore.FieldValue.serverTimestamp() });
                 window.location.href = 'message.html?type=contact_sent';
            } catch (error) {
                 console.error('Error saving contact message:', error); alert('Error sending message.');
                 submitButton.disabled = false; submitButton.textContent = originalButtonText;
            }
        });
    } else if (contactForm && !db) { /* Handle DB not available */ }

    // --- Other Page Placeholders (Add logic as needed) ---
    if (document.body.contains(document.getElementById('wishlist-grid')) && db) {
        console.log("Wishlist page specific JS running - Needs implementation");
        // TODO: Implement loadWishlistItems() to fetch properties based on userWishlist IDs
    }
    if (document.body.contains(document.getElementById('booking-form')) && db) {
        console.log("Booking page specific JS running - Needs implementation");
        // TODO: Implement booking form logic, availability checks, saving bookings
    }
     if (document.body.contains(document.getElementById('search-results-grid')) && db) {
        console.log("Search results page specific JS running - Needs implementation");
        // TODO: Implement logic to:
        // 1. Read search parameters from URL (location, category, max_price)
        // 2. Build a Firestore query based on these parameters
        // 3. Fetch matching properties
        // 4. Display results using createPropertyCardElement
        // 5. Handle pagination if necessary
        // 6. Handle "no results found"
    }


    // ==========================================
    // 7. FINAL UI INITIALIZATION (Redundant - Handled by Auth Listener)
    // ==========================================
    // console.log("Final UI state already set by Auth Listener.");
    // updateWishlistButtonsVisualState(); // No longer needed here
    // updateWishlistBadges(); // No longer needed here


}); // === End of DOMContentLoaded ===