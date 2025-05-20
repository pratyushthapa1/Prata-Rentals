// js/utils.js
import { API_BASE_URL } from './config.js';

export const formatCurrency = (amount, currency = 'NPR') => {
    // ... (implementation as before)
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) return `${currency} N/A`;
    return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatReadableDate = (dateInput) => {
    // ... (implementation as before)
    if (!dateInput) return '--';
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '--';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
        console.error("Error formatting date:", e, "Input:", dateInput);
        return '--';
    }
};

export const calculateNights = (checkin, checkout) => {
    // ... (implementation as before)
    if (!checkin || !checkout) return 0;
    try {
        const date1 = new Date(checkin);
        const date2 = new Date(checkout);
        if (isNaN(date1.getTime()) || isNaN(date2.getTime()) || date2 <= date1) return 0;
        const diffTime = Math.abs(date2.getTime() - date1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {
        console.error("Error calculating nights:", e);
        return 0;
    }
};

export async function makeApiCall(endpoint, options = {}) {
    // ... (implementation as before, uses API_BASE_URL from import)
    if (!options.credentials) {
        options.credentials = 'include';
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);

    if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (typeof errorData === 'object' && errorData !== null) {
                errorMessage = errorData.message || errorData.error || errorMessage;
            } else if (typeof errorData === 'string' && errorData.trim() !== '') {
                errorMessage = errorData;
            }
        } catch (e) { /* Ignore */ }
        throw new Error(errorMessage);
    }

    try {
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return { success: true, message: "Operation successful with no content." };
        }
        return await response.json();
    } catch (e) {
        console.error("Invalid JSON response from server, despite OK status.", e, "Endpoint:", endpoint);
        throw new Error("Invalid JSON response from server.");
    }
}