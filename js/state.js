// js/state.js
export let currentUserId = null;
export let currentUsername = null;
export let userWishlist = new Set(); // Stores property IDs (as strings)

export function setCurrentUserId(id) {
    currentUserId = id;
}
export function setCurrentUsername(name) {
    currentUsername = name;
}
export function setUserWishlist(wishlistSet) {
    userWishlist = wishlistSet;
}
export function clearUserSessionState() {
    currentUserId = null;
    currentUsername = null;
    userWishlist = new Set();
}