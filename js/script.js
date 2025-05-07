// js/script.js
console.log("PRATA Master Script Initialized - XAMPP/MySQL Mode");

// ==========================================
// 1. API ENDPOINT BASE URL
// ==========================================
const API_BASE_URL = 'php'; // e.g., results in 'api/login.php'

// ==========================================
// 2. GLOBAL STATE VARIABLES (will be updated by auth logic)
// ==========================================
let currentUserId = null;
let currentUsername = null;
let userWishlist = new Set(); // Stores property IDs (as strings)

// ==========================================
// 3. COMMON UTILITY FUNCTIONS
// ==========================================

/**
 * Formats a number as NPR currency.
 */
const formatCurrency = (amount, currency = 'NPR') => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return `${currency} N/A`;
    return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

/**
 * Formats date strings (e.g., YYYY-MM-DD from MySQL) into a readable string.
 */
const formatReadableDate = (dateInput) => {
    if (!dateInput) return '--';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '--'; // Check if date is valid
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        console.error("Error formatting date:", e, "Input:", dateInput);
        return '--';
    }
};

/**
 * Calculates the number of nights between two dates.
 */
const calculateNights = (checkin, checkout) => {
    if (!checkin || !checkout) return 0;
    try {
        const date1 = new Date(checkin);
        const date2 = new Date(checkout);
        if (isNaN(date1.getTime()) || isNaN(date2.getTime()) || date2 <= date1) return 0;
        const diffTime = Math.abs(date2.getTime() - date1.getTime()); // Use getTime() for robustness
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
        console.error("Error calculating nights:", e);
        return 0;
    }
};

/**
 * Helper function to make API calls and handle basic JSON response.
 * @param {string} endpoint - The API endpoint (e.g., 'login.php').
 * @param {object} [options={}] - Fetch options (method, body, headers).
 * @returns {Promise<object>} - The JSON response from the API.
 * @throws {Error} - If the network response is not ok or JSON parsing fails.
 */
async function makeApiCall(endpoint, options = {}) {
    if (!options.credentials) {
        options.credentials = 'include'; // Send cookies with requests for session management
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);

    if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
        try {
            // Try to parse error response as JSON
            const errorData = await response.json();
            if (typeof errorData === 'object' && errorData !== null) {
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (typeof errorData === 'string' && errorData.trim() !== '') {
                // If the API returns a plain string error message
                errorMessage = errorData;
            }
        } catch (e) {
            // If response is not JSON or another error occurs during parsing,
            // stick with the initial HTTP status error message.
            // console.warn("Could not parse error response as JSON for a non-OK response.", e);
        }
        throw new Error(errorMessage);
    }

    try {
        // Handle cases where response is ok but not JSON (e.g., 204 No Content for logout)
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return { success: true, message: "Operation successful with no content." };
        }
        return await response.json();
    } catch (e) {
        console.error("Invalid JSON response from server, despite OK status.", e, "Endpoint:", endpoint);
        throw new Error("Invalid JSON response from server.");
    }
}


// ==========================================
// 4. DOMContentLoaded - MAIN EXECUTION BLOCK
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Fully Loaded - Attaching Event Listeners and Running Page Logic");

    const logoLink = document.querySelector('.header-logo a');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => { /* Default navigation is fine */ });
    }

    // --- UI Element Selectors (used by auth and wishlist) ---
    const profileLinkElement = document.querySelector('.profile-icon') || document.querySelector('.profile-link');
    const profileLinkTextElement = profileLinkElement?.querySelector('.nav-text');
    const profileIconItself = profileLinkElement?.querySelector('i.fa-user-circle'); // More specific selector for the icon
    const listPropertyBtn = document.querySelector('.btn-header-cta');
    const logoutButton = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');


    // ==========================================
    // 4.1 AUTHENTICATION LOGIC
    // ==========================================

    function updateUIAfterAuthChange(userData) {
        const isLoggedIn = userData && userData.id;

        if (isLoggedIn) {
            currentUserId = userData.id;
            currentUsername = userData.username || (userData.email ? userData.email.split('@')[0] : 'User');
            console.log("UI Update: User LOGGED IN", currentUserId, currentUsername);

            if (profileLinkElement) {
                profileLinkElement.classList.add('logged-in');
                profileLinkElement.setAttribute('aria-label', `Profile Menu for ${currentUsername}`);
                if (profileLinkTextElement) {
                    profileLinkTextElement.textContent = currentUsername;
                }
                if (profileIconItself) {
                    profileIconItself.className = 'fas fa-user-circle'; // Solid icon for logged in
                }
                const profileAnchor = profileLinkElement.closest('a') || profileLinkElement;
                if (profileAnchor && profileAnchor.tagName === 'A') {
                    profileAnchor.href = 'profile.html';
                }
            }
            if (listPropertyBtn) listPropertyBtn.style.display = 'inline-block';
            if (logoutButton) logoutButton.style.display = 'inline-block';

            document.querySelectorAll('.show-when-logged-out').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.show-when-logged-in').forEach(el => el.style.display = 'inline-block'); // Adjust display type as needed

            fetchUserWishlistFromServer(); // Fetch wishlist after login
        } else {
            currentUserId = null;
            currentUsername = null;
            userWishlist = new Set(); // Clear local wishlist on logout
            console.log("UI Update: User LOGGED OUT");

            if (profileLinkElement) {
                profileLinkElement.classList.remove('logged-in');
                profileLinkElement.setAttribute('aria-label', 'Profile Menu / Login');
                if (profileLinkTextElement) {
                    profileLinkTextElement.textContent = 'Profile'; // Reset text
                }
                if (profileIconItself) {
                    profileIconItself.className = 'far fa-user-circle'; // Regular icon for logged out
                }
                const profileAnchor = profileLinkElement.closest('a') || profileLinkElement;
                if (profileAnchor && profileAnchor.tagName === 'A') {
                    profileAnchor.href = 'login.html';
                }
            }
            if (listPropertyBtn) listPropertyBtn.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';

            document.querySelectorAll('.show-when-logged-out').forEach(el => el.style.display = 'inline-block'); // Adjust display type as needed
            document.querySelectorAll('.show-when-logged-in').forEach(el => el.style.display = 'none');

            updateWishlistButtonsVisualState(); // Update button states (e.g., all hearts become 'far')
            updateWishlistBadges(); // Clear or hide wishlist badge
        }
    }

    async function checkUserSession() {
        console.log("Checking user session with backend...");
        try {
            const data = await makeApiCall('check_session.php');
            updateUIAfterAuthChange(data.loggedIn && data.user ? data.user : null);
        } catch (error) {
            console.error("Error checking user session:", error.message);
            updateUIAfterAuthChange(null); // Assume logged out on error
        }
    }
    checkUserSession(); // Check session on every page load

    // --- Login Form Handler ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton?.textContent;
            if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Logging in..."; }

            try {
                const result = await makeApiCall('login.php', { method: 'POST', body: formData });
                if (result.success && result.user) {
                    // alert(result.message); // Optional: show success message
                    await checkUserSession(); // Re-check session to update UI globally
                    window.location.href = result.redirectUrl || 'profile.html'; // Redirect based on API response or to default
                } else {
                    alert(result.message || "Login failed. Please check your credentials.");
                }
            } catch (error) {
                console.error("Login error:", error);
                alert(`Login failed: ${error.message}`);
            } finally {
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalButtonText; }
            }
        });
    }

    // --- Signup Form Handler ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const submitButton = signupForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton?.textContent;
            const password = formData.get('password');
            const confirmPassword = formData.get('confirm_password');
            const passwordErrorEl = document.getElementById('password-error'); // Assumes this element exists in signup.html

            if (passwordErrorEl) passwordErrorEl.style.display = 'none'; // Clear previous errors

            if (password !== confirmPassword) {
                const message = "Passwords do not match.";
                if (passwordErrorEl) { passwordErrorEl.textContent = message; passwordErrorEl.style.display = 'block'; }
                else { alert(message); }
                return;
            }
            if (password.length < 6) { // Example minimum length
                const message = "Password must be at least 6 characters long.";
                if (passwordErrorEl) { passwordErrorEl.textContent = message; passwordErrorEl.style.display = 'block'; }
                else { alert(message); }
                return;
            }

            if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Signing up..."; }

            try {
                const result = await makeApiCall('signup.php', { method: 'POST', body: formData });
                if (result.success) {
                    alert(result.message); // Or a more subtle notification
                    window.location.href = 'login.html'; // Redirect to login after successful signup
                } else {
                    alert(result.message || "Signup failed. Please try again.");
                }
            } catch (error) {
                console.error("Signup error:", error);
                alert(`Signup error: ${error.message}`);
            } finally {
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalButtonText; }
            }
        });
    }

    // --- Logout Button Handler ---
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log("Logout button clicked");
            try {
                const result = await makeApiCall('logout.php', { method: 'POST' });
                if (result.success) {
                    // alert(result.message); // Optional
                } else {
                    // Log non-critical failure, but proceed with client-side logout
                    console.warn("Logout API call reported failure or no success:", result.message);
                }
            } catch (error) {
                console.error("Logout API error:", error.message);
                // Proceed with client-side logout even if API call fails, to ensure user sees logged-out state
            } finally {
                await checkUserSession(); // This will call updateUIAfterAuthChange(null) if session is truly ended or API fails
                window.location.href = 'index.html'; // Redirect to homepage
            }
        });
    }

    // ==========================================
    // 4.2 WISHLIST MANAGEMENT (API Version)
    // ==========================================
    async function fetchUserWishlistFromServer() {
        if (!currentUserId) {
            userWishlist = new Set();
            updateWishlistButtonsVisualState();
            updateWishlistBadges();
            return;
        }
        console.log(`Fetching wishlist for user ${currentUserId} from server...`);
        try {
            const wishlistData = await makeApiCall('get_wishlist.php');
            userWishlist = new Set(Array.isArray(wishlistData) ? wishlistData.map(id => String(id)) : []);
            console.log("Fetched user wishlist from server:", Array.from(userWishlist));
        } catch (error) {
            console.error("Error fetching wishlist from server:", error.message);
            userWishlist = new Set(); // Reset on error
        } finally {
            updateWishlistButtonsVisualState();
            updateWishlistBadges();
        }
    }

    async function toggleWishlistOnServer(propertyIdStr) {
        if (!currentUserId) {
            alert("Please log in to manage your wishlist.");
            // Optionally redirect: window.location.href = `login.html?redirect=${encodeURIComponent(window.location.href)}`;
            return;
        }
        const propertyId = String(propertyIdStr);
        const button = document.querySelector(`.wishlist-button[data-property-id="${propertyId}"]`);
        const heartIcon = button?.querySelector('i');

        if (button) button.disabled = true;
        if (heartIcon) heartIcon.classList.add('fa-spin');

        const isCurrentlyWishlisted = userWishlist.has(propertyId);
        const action = isCurrentlyWishlisted ? 'remove' : 'add';

        try {
            const result = await makeApiCall('toggle_wishlist.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId: propertyId, action: action })
            });

            if (result.success) {
                if (action === 'add') {
                    userWishlist.add(propertyId);
                } else {
                    userWishlist.delete(propertyId);
                }
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

    window.updateWishlistButtonsVisualState = () => {
        const allWishlistButtons = document.querySelectorAll('.wishlist-button');
        allWishlistButtons.forEach(button => {
            const propertyId = button.dataset.propertyId;
            const heartIcon = button.querySelector('i');

            if (propertyId && heartIcon) {
                heartIcon.classList.remove('fas', 'far');
                button.classList.remove('active');

                if (currentUserId && userWishlist.has(String(propertyId))) {
                    heartIcon.classList.add('fas'); // Solid heart
                    button.classList.add('active');
                    button.setAttribute('aria-label', 'Remove from wishlist');
                } else {
                    heartIcon.classList.add('far'); // Regular heart
                    button.setAttribute('aria-label', 'Add to wishlist');
                }
            }
        });
    };

    window.updateWishlistBadges = () => {
        const count = userWishlist.size;
        const badgeElement = document.querySelector('.header-nav .wishlist-link .wishlist-count-badge');

        if (badgeElement) {
            if (count > 0 && currentUserId) {
                badgeElement.textContent = count;
                badgeElement.style.display = 'flex'; // Or 'inline-block', 'block'
            } else {
                badgeElement.style.display = 'none';
            }
        }
    };

    const handleWishlistClick = (event) => {
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
    };
    document.body.addEventListener('click', handleWishlistClick);


    // ==========================================
    // 5. HELPER FUNCTION - CREATE PROPERTY CARD (Make global)
    // ==========================================
    window.createPropertyCardElement = (propertyData, propertyIdFromArg) => {
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

        const isWishlisted = currentUserId && userWishlist.has(propertyId);
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
    };


    // ==========================================
    // 6. PAGE-SPECIFIC LOGIC INITIALIZATION
    // ==========================================

    // --- Homepage (index.html) Specific ---
    const featuredGrid = document.querySelector('.featured-rentals .rental-cards-grid');
    const heroSearchForm = document.getElementById('search-form-hero');

    if (featuredGrid && heroSearchForm) {
        console.log("Index page: Initializing featured rentals and hero search form...");

        const loadFeaturedRentalsFromServer = async () => {
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
                    updateWishlistButtonsVisualState(); // Ensure new card wishlist buttons are correct
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

    // --- Contact Page (contact.html) ---
    const contactPageForm = document.getElementById('contact-form');
    if (contactPageForm) {
        console.log("Contact page: Initializing form...");
        const contactParams = new URLSearchParams(window.location.search);
        const contactSubjectFromUrl = contactParams.get('subject');
        const contactPropertyId = contactParams.get('propertyId');

        const contactSubjectLineEl = document.getElementById('contact-subject-line');
        const contactSubjectInputEl = document.getElementById('contact-subject');
        const contactMessageTextarea = document.getElementById('contact-message');

        let finalSubject = contactSubjectFromUrl || "General Inquiry";

        if (contactPropertyId) {
            finalSubject = `Inquiry about Property ID: ${contactPropertyId}`;
            if (contactMessageTextarea) {
                contactMessageTextarea.placeholder = `Please enter your message regarding property ID ${contactPropertyId}...`;
            }
        }

        if (contactSubjectLineEl) contactSubjectLineEl.textContent = `Regarding: ${finalSubject}`;
        if (contactSubjectInputEl) contactSubjectInputEl.value = finalSubject;


        contactPageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (!contactPageForm.checkValidity()) {
                contactPageForm.reportValidity();
                return;
            }

            const submitButton = contactPageForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            const formData = new FormData(contactPageForm);
            // if (currentUserId) formData.append('userId', currentUserId); // Optionally add user info

            try {
                const result = await makeApiCall('submit_contact_message.php', { method: 'POST', body: formData });
                if (result.success) {
                    window.location.href = `message.html?type=contact_sent&message=${encodeURIComponent(result.message || 'Your message has been sent successfully!')}`;
                } else {
                    throw new Error(result.message || "Failed to send message. Please try again.");
                }
            } catch (error) {
                console.error('Error sending contact message:', error.message);
                alert(`Error: ${error.message}`);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // --- Search Results Page (search-results.html) ---
    const searchResultsGrid = document.getElementById('search-results-grid');
    if (searchResultsGrid) {
        console.log("Search results page: Loading results from API...");
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

    // --- Password Visibility Toggle (for login, signup, reset password forms) ---
    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const passwordInputId = this.dataset.togglePassword; // e.g., <button data-toggle-password="passwordFieldName">
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

    // --- Smooth Scroll for on-page anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const hrefAttribute = this.getAttribute('href');
            if (hrefAttribute && hrefAttribute.length > 1) { // Ensure it's not just "#"
                try {
                    const targetElement = document.querySelector(hrefAttribute);
                    if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                } catch (error) {
                    // Catch invalid selectors, but usually not an issue for simple IDs
                    console.warn("Smooth scroll target not found or invalid selector:", hrefAttribute, error);
                }
            }
        });
    });

    // --- Other page-specific initializations or deferred script logic would go here ---
    // e.g., if (document.getElementById('wishlist-page-container')) { import('./wishlist.js').then(module => module.initWishlistPage()); }
    // For now, assuming wishlist.js, property-details.js etc., are separate <script> tags that run after this one
    // and can access the global functions (like window.createPropertyCardElement).

}); // === End of DOMContentLoaded ===