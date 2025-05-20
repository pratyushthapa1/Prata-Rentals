// js/main.js
console.log("PRATA Master Script Initialized (Modular) - XAMPP/MySQL Mode");

// Import shared modules
import * as auth from './auth.js';
import * as wishlist from './wishlist.js';
import * as ui from './ui.js';

// Import page-specific modules
import { initHomepage } from './page-index.js';
import { initContactPage } from './page-contact.js';
import { initSearchResultsPage } from './page-search-results.js';
// Import other page-specific init functions as you create them

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Fully Loaded - Initializing modules and page logic");

    // Initialize global UI elements/handlers
    ui.initPasswordToggle();
    ui.initSmoothScroll();
    wishlist.initWishlistGlobalClickHandler(); // For wishlist buttons on cards

    // Initialize authentication (this will also fetch initial wishlist if logged in)
    auth.initLoginForm();
    auth.initSignupForm();
    auth.initLogoutButton();
    await auth.checkUserSession(); // Important: check session early

    // Initialize logic for the current page
    // You can detect the current page by body ID, specific element, or URL path
    // For simplicity, we'll just call all page initializers.
    // They should be written to do nothing if their specific page elements aren't found.
    initHomepage();
    initContactPage();
    initSearchResultsPage();
    // Call other page init functions here:
    // initPropertyDetailsPage(); (if you create a module for it)
    // initWishlistDisplayPage(); (if you create a module for the wishlist.html page content)

    console.log("All initializations complete.");
});