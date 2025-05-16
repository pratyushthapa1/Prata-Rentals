
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
import { initializeBookingPage } from './booking.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Fully Loaded - Initializing modules and page logic");

    ui.initPasswordToggle();
    ui.initSmoothScroll();
    wishlist.initWishlistGlobalClickHandler();

    auth.initLoginForm();
    auth.initSignupForm();
    auth.initLogoutButton();

    console.log("main.js: About to check user session...");
    const currentUsername = await auth.checkUserSession(); // <<< --- Get username from function's return
    console.log("main.js: User session check complete. Username from auth.checkUserSession:", currentUsername);
    // You can still log localStorage as a sanity check, but we'll rely on currentUsername
    console.log("main.js: localStorage username AFTER session check for reference:", localStorage.getItem('loggedInUsername'));

    const currentPath = window.location.pathname;
    console.log("main.js: Current path:", currentPath);

    if (currentPath.endsWith('/booking.html') || currentPath.endsWith('/booking')) {
        console.log("main.js: Detected booking page. Passing username to initializeBookingPage:", currentUsername);
        try {
           await initializeBookingPage(currentUsername); // <<< --- PASS THE USERNAME
           console.log("main.js: initializeBookingPage() finished.");
        } catch (error) {
            console.error("main.js: Error during initializeBookingPage execution:", error);
        }
    } else {
        console.log("main.js: Not on booking page, checking other initializers...");
        initHomepage();
        initContactPage();
        initSearchResultsPage();
    }

    console.log("All initializations complete.");
});
