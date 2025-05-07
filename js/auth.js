// js/auth.js
import { makeApiCall } from './utils.js';
import * as state from './state.js';
import { fetchUserWishlistFromServer, updateWishlistButtonsVisualState, updateWishlistBadges } from './wishlist.js';

// UI Selectors (can be passed in or defined here)
const getProfileLinkElement = () => document.querySelector('.profile-icon') || document.querySelector('.profile-link');
const getListPropertyBtn = () => document.querySelector('.btn-header-cta');
const getLogoutButton = () => document.getElementById('logout-btn');

export function updateUIAfterAuthChange(userData) {
    const isLoggedIn = userData && userData.id;
    const profileLinkElement = getProfileLinkElement();
    const listPropertyBtn = getListPropertyBtn();
    const logoutButton = getLogoutButton();

    if (isLoggedIn) {
        state.setCurrentUserId(userData.id);
        state.setCurrentUsername(userData.username || (userData.email ? userData.email.split('@')[0] : 'User'));
        console.log("UI Update: User LOGGED IN", state.currentUserId, state.currentUsername);

        if (profileLinkElement) {
            const profileLinkTextElement = profileLinkElement.querySelector('.nav-text');
            const profileIconItself = profileLinkElement.querySelector('i.fa-user-circle');
            profileLinkElement.classList.add('logged-in');
            profileLinkElement.setAttribute('aria-label', `Profile Menu for ${state.currentUsername}`);
            if (profileLinkTextElement) profileLinkTextElement.textContent = state.currentUsername;
            if (profileIconItself) profileIconItself.className = 'fas fa-user-circle';
            const profileAnchor = profileLinkElement.closest('a') || profileLinkElement;
            if (profileAnchor && profileAnchor.tagName === 'A') profileAnchor.href = 'profile.html';
        }
        if (listPropertyBtn) listPropertyBtn.style.display = 'inline-block';
        if (logoutButton) logoutButton.style.display = 'inline-block';

        document.querySelectorAll('.show-when-logged-out').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.show-when-logged-in').forEach(el => el.style.display = 'inline-block');

        fetchUserWishlistFromServer();
    } else {
        state.clearUserSessionState();
        console.log("UI Update: User LOGGED OUT");

        if (profileLinkElement) {
            const profileLinkTextElement = profileLinkElement.querySelector('.nav-text');
            const profileIconItself = profileLinkElement.querySelector('i.fa-user-circle');
            profileLinkElement.classList.remove('logged-in');
            profileLinkElement.setAttribute('aria-label', 'Profile Menu / Login');
            if (profileLinkTextElement) profileLinkTextElement.textContent = 'Profile';
            if (profileIconItself) profileIconItself.className = 'far fa-user-circle';
            const profileAnchor = profileLinkElement.closest('a') || profileLinkElement;
            if (profileAnchor && profileAnchor.tagName === 'A') profileAnchor.href = 'login.html';
        }
        if (listPropertyBtn) listPropertyBtn.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';

        document.querySelectorAll('.show-when-logged-out').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.show-when-logged-in').forEach(el => el.style.display = 'none');

        updateWishlistButtonsVisualState();
        updateWishlistBadges();
    }
}

export async function checkUserSession() {
    console.log("Checking user session with backend...");
    try {
        const data = await makeApiCall('check_session.php');
        updateUIAfterAuthChange(data.loggedIn && data.user ? data.user : null);
    } catch (error) {
        console.error("Error checking user session:", error.message);
        updateUIAfterAuthChange(null);
    }
}

export function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return; // Prevents error if form is not found
    const errorDiv = document.getElementById('login-error');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDiv.style.display = 'none';
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        if (!email || !password) {
            errorDiv.textContent = 'Please enter both email and password.';
            errorDiv.style.display = 'block';
            return;
        }
        try {
            const response = await fetch('php/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                // Optionally store user info in localStorage or sessionStorage
                localStorage.setItem('prata_loggedIn', 'true');
                localStorage.setItem('prata_userEmail', data.user.email);
                localStorage.setItem('prata_userName', data.user.name || data.user.email.split('@')[0]);
                window.location.href = 'profile.html';
            } else {
                errorDiv.textContent = data.message || 'Login failed. Please try again.';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Server error. Please try again later.';
            errorDiv.style.display = 'block';
        }
    });
}

export function initSignupForm() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = signupForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton?.textContent;
        const username = signupForm.querySelector('[name="username"]').value.trim();
        const email = signupForm.querySelector('[name="email"]').value.trim();
        const password = signupForm.querySelector('[name="password"]').value;
        const confirmPassword = signupForm.querySelector('[name="confirm_password"]').value;
        const passwordErrorEl = document.getElementById('password-error');
        if (passwordErrorEl) passwordErrorEl.style.display = 'none';

        // Enhanced client-side validation
        if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
            const message = "Username must be 3-32 characters, letters, numbers, or underscores.";
            if (passwordErrorEl) { passwordErrorEl.textContent = message; passwordErrorEl.style.display = 'block'; }
            else { alert(message); }
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            const message = "Invalid email format.";
            if (passwordErrorEl) { passwordErrorEl.textContent = message; passwordErrorEl.style.display = 'block'; }
            else { alert(message); }
            return;
        }
        if (password !== confirmPassword) {
            const message = "Passwords do not match.";
            if (passwordErrorEl) { passwordErrorEl.textContent = message; passwordErrorEl.style.display = 'block'; }
            else { alert(message); }
            return;
        }
        if (password.length < 8 || password.length > 64) {
            const message = "Password must be 8-64 characters long.";
            if (passwordErrorEl) { passwordErrorEl.textContent = message; passwordErrorEl.style.display = 'block'; }
            else { alert(message); }
            return;
        }
        if (submitButton) { submitButton.disabled = true; submitButton.textContent = "Signing up..."; }
        try {
            // Send JSON body to match PHP backend
            const result = await makeApiCall('signup.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            if (result.success) {
                alert(result.message);
                window.location.href = 'login.html';
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

export function initLogoutButton() {
    const logoutButton = getLogoutButton();
    if (!logoutButton) return;

    logoutButton.addEventListener('click', async () => {
        console.log("Logout button clicked");
        try {
            await makeApiCall('logout.php', { method: 'POST' });
        } catch (error) {
            console.error("Logout API error:", error.message);
        } finally {
            await checkUserSession();
            window.location.href = 'index.html';
        }
    });
}