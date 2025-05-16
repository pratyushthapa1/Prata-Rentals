// js/booking.js
console.log("Booking JS Initialized - XAMPP/MySQL Mode - Scenario 1 Only");
const API_BASE_URL = "php";

// // --- Helper function to get logged-in username ---
// function getLoggedInUsername() {
//     return localStorage.getItem('loggedInUsername');
// }

// --- DOM Element References ---
// These will be assigned INSIDE initializeBookingPage or by event listener setup functions
let bookingForm;
let paymentModal;
let proceedToPaymentBtn;
let closeModalBtn;
let confirmPaymentBtn;
let paymentProcessingMsg;
let paymentErrorMsg;
let propertyIdInput;
let propertyImageElem;
let propertyTitleElem;
let propertyIdDisplayElem;
let baseRateDisplayElem;
let baseRateValueInput;
let startDateInput;
let endDateInput;
let adultsInput;
let childrenInput;
let petsInput;
// guestCounters will be selected when setting up listeners
let summaryStartDateElem;
let summaryEndDateElem;
let summaryDurationElem;
let summaryOccupantsElem;
let priceCalcTextElem;
let summaryBasePriceElem;
let summaryTaxesElem;
let summaryTotalPriceElem;
let cardNumberInput;
let expiryDateInput;
let cvvInput;
let cardNameInput;
let esewaIdInput;
let khaltiIdInput;
let fullNameInput;
let emailInput;
let phoneInput;
let requestsInput;

// --- State Variables ---
let propertyDataForBooking = null;
const SERVICE_FEE_PERCENTAGE = 0.05;
const VAT_PERCENTAGE = 0.13;

// --- Helper Functions (localFormatDate, localFormatCurrency, localCalculateDuration, callApi) ---
const localFormatDate = (dateString) => {
    if (!dateString) return '-- / -- / ----';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const localFormatCurrency = (amount, currencyCode = 'NPR') => {
    return `${currencyCode} ${typeof amount === 'number' ? amount.toFixed(2) : '0.00'}`;
};

const localCalculateDuration = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return { nights: 0, months: 0, display: 'N/A' };
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
        return { nights: 0, months: 0, display: 'Invalid Dates' };
    }
    const millisecondsPerDay = 86400000;
    const nights = Math.ceil((endDate - startDate) / millisecondsPerDay);
    const months = Math.floor(nights / 30);
    return { nights: nights > 0 ? nights : 0, months, display: `${nights > 0 ? nights : 0} night(s)` };
};

const callApi = async (endpoint, options = {}) => {
    if (!options.credentials) options.credentials = 'include';
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
    if (!response.ok) {
        let errorData = { message: `HTTP Error ${response.status} (${response.statusText}) accessing ${endpoint}` };
        try { errorData = await response.json(); } catch (e) { /* Response not JSON */ }
        throw new Error(errorData.message || errorData.error || `API request failed: ${response.status}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") return { success: true };
    return await response.json();
};

// --- Core Logic Functions (calculateRentalCost, updateSummary, populateStaticPropertyDetails, openPaymentModal, closePaymentModal) ---
const calculateRentalCost = (startDateStr, endDateStr) => {
    // This function relies on propertyDataForBooking, startDateInput, endDateInput being available
    if (!propertyDataForBooking || !startDateInput?.value || !endDateInput?.value) { // Check inputs directly
        return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Select valid dates' };
    }
    const { nights } = localCalculateDuration(startDateInput.value, endDateInput.value);
    if (nights <= 0) {
        return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Invalid date range' };
    }

    const pricePerUnit = parseFloat(propertyDataForBooking.price) || 0;
    const priceSuffix = propertyDataForBooking.price_suffix || 'night';
    const currency = propertyDataForBooking.currency || 'NPR'; // Ensure currency is available
    const rateType = priceSuffix.toLowerCase().includes('/mo') ? 'month' : 'night';

    let baseCost = 0;
    let calculationText = '';
    const DAYS_IN_MONTH_FOR_CALC = 30.0; // Standard number of days in a month for this calculation. Use float for precision.

    if (rateType === 'month') {
        // Property is priced per month. Calculate cost based on an effective daily rate.
        const effectiveDailyRate = pricePerUnit / DAYS_IN_MONTH_FOR_CALC;
        baseCost = nights * effectiveDailyRate;
        
        // Update calculationText to explain how the cost is derived
        calculationText = `${localFormatCurrency(effectiveDailyRate, currency)}/day x ${nights} night${nights !== 1 ? 's' : ''} (Rate from ${localFormatCurrency(pricePerUnit, currency)}/mo)`;
    } else { // rateType is 'night'
        baseCost = nights * pricePerUnit;
        calculationText = `${localFormatCurrency(pricePerUnit, currency)}/night x ${nights} night${nights !== 1 ? 's' : ''}`;
    }

    const serviceFee = baseCost * SERVICE_FEE_PERCENTAGE;
    const taxes = (baseCost + serviceFee) * VAT_PERCENTAGE; // VAT is typically on (base + service fee)
    const totalCost = baseCost + serviceFee + taxes;

    return { base: baseCost, serviceFee, taxes, total: totalCost, calcText: calculationText };
};


const updateSummary = () => {
    // This function relies on many DOM elements being assigned
    if (!propertyDataForBooking || !bookingForm || !startDateInput || !endDateInput ||
        !summaryStartDateElem || !summaryEndDateElem || !summaryDurationElem ||
        !priceCalcTextElem || !summaryBasePriceElem || !summaryTaxesElem ||
        !summaryTotalPriceElem || !adultsInput || !childrenInput || !petsInput || !summaryOccupantsElem) {
        console.warn("updateSummary: One or more required DOM elements not yet available.");
        return;
    }
    const startDateValue = startDateInput.value;
    const endDateValue = endDateInput.value;
    const durationDetails = localCalculateDuration(startDateValue, endDateValue);
    const costDetails = calculateRentalCost(startDateValue, endDateValue);

    summaryStartDateElem.textContent = localFormatDate(startDateValue);
    summaryEndDateElem.textContent = localFormatDate(endDateValue);
    summaryDurationElem.textContent = durationDetails.display;
    priceCalcTextElem.textContent = costDetails.calcText;
    summaryBasePriceElem.textContent = localFormatCurrency(costDetails.base, propertyDataForBooking.currency);
    summaryTaxesElem.textContent = localFormatCurrency(costDetails.serviceFee + costDetails.taxes, propertyDataForBooking.currency);
    summaryTotalPriceElem.textContent = localFormatCurrency(costDetails.total, propertyDataForBooking.currency);

    const adultsCount = parseInt(adultsInput.value || '1', 10);
    const childrenCount = parseInt(childrenInput.value || '0', 10);
    const petsCount = parseInt(petsInput.value || '0', 10);
    let occupantsString = `${adultsCount} Adult${adultsCount !== 1 ? 's' : ''}`;
    if (childrenCount > 0) occupantsString += `, ${childrenCount} Child${childrenCount !== 1 ? 'ren' : ''}`;
    if (petsCount > 0) occupantsString += `, ${petsCount} Pet${petsCount !== 1 ? 's' : ''}`;
    summaryOccupantsElem.textContent = occupantsString;

    if (startDateValue) {
        const minEndDate = new Date(new Date(startDateValue).getTime() + 86400000);
        endDateInput.min = minEndDate.toISOString().split('T')[0];
    } else {
        endDateInput.min = '';
    }
    const isEndDateInvalid = startDateValue && endDateValue && new Date(endDateValue) <= new Date(startDateValue);
    endDateInput.setCustomValidity(isEndDateInvalid ? 'End date must be after start date.' : '');
    startDateInput.setCustomValidity(startDateValue ? '' : 'Start date is required.');
};

const populateStaticPropertyDetails = () => {
    // Relies on propertyDataForBooking and specific DOM elements
    if (!propertyDataForBooking) {
        if (propertyTitleElem) propertyTitleElem.textContent = "Error: Property Data Unavailable";
        console.error("populateStaticPropertyDetails called without propertyDataForBooking");
        return;
    }
    if (propertyIdInput) propertyIdInput.value = propertyDataForBooking.id;
    if (propertyIdDisplayElem) propertyIdDisplayElem.textContent = propertyDataForBooking.id;
    if (propertyImageElem) {
        propertyImageElem.src = propertyDataForBooking.imageURL || propertyDataForBooking.image_url_1 || 'images/placeholder.png';
        propertyImageElem.alt = propertyDataForBooking.title || 'Property Thumbnail';
    }
    if (propertyTitleElem) propertyTitleElem.textContent = propertyDataForBooking.title || 'Selected Property';

    const price = parseFloat(propertyDataForBooking.price) || 0;
    const priceSuffix = propertyDataForBooking.price_suffix || 'night';
    const rateTypeDisplay = priceSuffix.toLowerCase().includes('/mo') ? '/ month' : '/ night';
    if (baseRateDisplayElem) baseRateDisplayElem.textContent = `${localFormatCurrency(price, propertyDataForBooking.currency)} ${rateTypeDisplay}`;
    if (baseRateValueInput) baseRateValueInput.value = price;
    updateSummary();
};

const openPaymentModal = () => {
    if (paymentModal) { // paymentModal should be assigned by now
        paymentModal.style.display = 'flex';
        setTimeout(() => paymentModal.classList.add('active'), 10);
        if (paymentErrorMsg) {
            paymentErrorMsg.textContent = '';
            paymentErrorMsg.style.display = 'none';
        }
        if (confirmPaymentBtn) confirmPaymentBtn.disabled = false;
        if (paymentProcessingMsg) paymentProcessingMsg.style.display = 'none';
        if (cardNumberInput) cardNumberInput.focus(); // cardNumberInput should be assigned
    }
};

const closePaymentModal = () => {
    if (paymentModal) { // paymentModal should be assigned
        paymentModal.classList.remove('active');
        const handleTransitionEnd = () => {
            paymentModal.style.display = 'none';
            paymentModal.removeEventListener('transitionend', handleTransitionEnd);
        };
        paymentModal.addEventListener('transitionend', handleTransitionEnd);
        setTimeout(() => {
            if (paymentModal && !paymentModal.classList.contains('active')) {
                paymentModal.style.display = 'none';
            }
        }, 400);
    }
};


// --- Function to set up all event listeners ---
// This will be called by initializeBookingPage AFTER main DOM elements are confirmed
const setupEventListeners = () => {
    console.log("booking.js: setupEventListeners called.");
    // Assign DOM elements needed for listeners if not already assigned globally
    // Or re-fetch them if you prefer to keep them local to this function.
    // For simplicity, we assume they are assigned to module-scoped vars by initializeBookingPage.

    const guestCounters = document.querySelectorAll('.guest-counter .counter-btn'); // Fetch here
    guestCounters.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const targetId = button.dataset.target;
            const countSpan = document.getElementById(targetId);
            // Ensure adultsInput, childrenInput, petsInput are assigned before this runs
            const inputField = document.getElementById(targetId.replace('-count', '-input'));
            if (!countSpan || !inputField) return;
            let currentValue = parseInt(inputField.value, 10);
            const isAdultsField = inputField.id === 'adults-input';
            if (action === 'increment') currentValue++;
            else if (action === 'decrement') currentValue--;
            if ((isAdultsField && currentValue < 1) || (!isAdultsField && currentValue < 0)) return;
            countSpan.textContent = currentValue;
            inputField.value = currentValue;
            const decrementButton = button.parentElement.querySelector('[data-action="decrement"]');
            if (decrementButton) decrementButton.disabled = (isAdultsField && currentValue <= 1) || (!isAdultsField && currentValue <= 0);
            updateSummary();
        });
    });

    if (startDateInput) startDateInput.addEventListener('input', updateSummary);
    if (endDateInput) endDateInput.addEventListener('input', updateSummary);
    if (startDateInput) startDateInput.addEventListener('change', updateSummary);
    if (endDateInput) endDateInput.addEventListener('change', updateSummary);

    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^\d]/g, '');
            let formattedValue = value;
            if (value.length > 2) formattedValue = value.substring(0, 2) + ' / ' + value.substring(2, 4);
            if (e.target.value !== formattedValue) {
                let cursorPos = e.target.selectionStart;
                e.target.value = formattedValue;
                if (cursorPos && formattedValue.length >= cursorPos) {
                    if (value.length === 2 && formattedValue.length > value.length && cursorPos === 2) cursorPos += 3;
                    try { e.target.setSelectionRange(cursorPos, cursorPos); } catch (err) { /* ignore */ }
                }
            }
        });
        expiryDateInput.addEventListener('blur', (e) => {
            const pattern = /^(0[1-9]|1[0-2]) \/ ([2-9][0-9])$/;
            if (e.target.value.length > 0 && !pattern.test(e.target.value)) {
                e.target.setCustomValidity("Invalid format. Use MM / YY (e.g., 03 / 28).");
            } else {
                e.target.setCustomValidity("");
            }
            e.target.reportValidity();
        });
    }

    if (proceedToPaymentBtn) {
        proceedToPaymentBtn.addEventListener('click', function(event) {
            event.preventDefault();
            if (!bookingForm) return; // bookingForm should be assigned
            bookingForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            let isFormValid = true;
            const requiredFields = bookingForm.querySelectorAll('section:not(.payment-info) [required], .date-selection input[type="date"]');
            requiredFields.forEach(field => {
                if (!field.checkValidity()) {
                    field.classList.add('is-invalid');
                    isFormValid = false;
                    field.reportValidity();
                }
            });
            const { nights } = localCalculateDuration(startDateInput?.value, endDateInput?.value);
            if (nights <= 0) {
                if (startDateInput) startDateInput.classList.add('is-invalid');
                if (endDateInput) endDateInput.classList.add('is-invalid');
                isFormValid = false;
                if (startDateInput && !startDateInput.checkValidity()) startDateInput.reportValidity();
                if (endDateInput && !endDateInput.checkValidity()) endDateInput.reportValidity();
            }
            if (isFormValid) openPaymentModal();
            else {
                const firstInvalidField = bookingForm.querySelector('.is-invalid, :invalid');
                firstInvalidField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalidField?.focus();
                alert("Please correct the highlighted rental details before proceeding to payment.");
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closePaymentModal);
    if (paymentModal) paymentModal.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (confirmPaymentBtn) {
      confirmPaymentBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!propertyDataForBooking) {
            alert("Error: Property data is missing. Cannot proceed with booking.");
            return;
        }
        // const username = getLoggedInUsername(); // Login check is bypassed
        // if (!username) {
        //     if (paymentErrorMsg) {
        //         paymentErrorMsg.textContent = 'Error: You must be logged in. Please log in and try again.';
        //         paymentErrorMsg.style.display = 'block';
        //     }
        //     return;
        // }

        if (paymentErrorMsg) {
            paymentErrorMsg.textContent = '';
            paymentErrorMsg.style.display = 'none';
        }
        if(paymentModal) paymentModal.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        let isPaymentSectionValid = true;
        const selectedPaymentMethodRadio = document.querySelector('input[name="payment_method"]:checked');
        const paymentMethodValue = selectedPaymentMethodRadio ? selectedPaymentMethodRadio.value : null;

        if (!paymentMethodValue) {
            if (paymentErrorMsg) {
                paymentErrorMsg.textContent = 'Please select a payment method.';
                paymentErrorMsg.style.display = 'block';
            }
            isPaymentSectionValid = false;
        } else {
            const paymentInputsToValidate = [];
            if (paymentMethodValue === 'card') {
                if (cardNumberInput) paymentInputsToValidate.push(cardNumberInput);
                if (expiryDateInput) paymentInputsToValidate.push(expiryDateInput);
                if (cvvInput) paymentInputsToValidate.push(cvvInput);
                if (cardNameInput) paymentInputsToValidate.push(cardNameInput);
            } else if (paymentMethodValue === 'esewa') {
                if (esewaIdInput) paymentInputsToValidate.push(esewaIdInput);
            } else if (paymentMethodValue === 'khalti') {
                if (khaltiIdInput) paymentInputsToValidate.push(khaltiIdInput);
            }
            paymentInputsToValidate.forEach(inputField => {
                if (inputField && !inputField.checkValidity()) {
                    inputField.classList.add('is-invalid');
                    isPaymentSectionValid = false;
                    inputField.reportValidity();
                }
            });
        }

        if (!isPaymentSectionValid) {
            if (paymentErrorMsg && !paymentErrorMsg.textContent) {
                paymentErrorMsg.textContent = 'Please correct highlighted payment details.';
                paymentErrorMsg.style.display = 'block';
            }
            const firstInvalidPaymentField = paymentModal?.querySelector('.is-invalid, :invalid');
            firstInvalidPaymentField?.focus();
            return;
        }

        if (confirmPaymentBtn) confirmPaymentBtn.disabled = true;
        if (paymentProcessingMsg) paymentProcessingMsg.style.display = 'block';

        const costDetails = calculateRentalCost(startDateInput?.value, endDateInput?.value);
        const numAdults = parseInt(adultsInput?.value || '1', 10);
        const numChildren = parseInt(childrenInput?.value || '0', 10);
        const numPets = parseInt(petsInput?.value || '0', 10);
        const totalGuests = numAdults + numChildren;

        // MODIFICATION: Provide a placeholder username since login is bypassed
        const usernameForSubmission = "guest_user"; // Or null, or an empty string, depending on backend handling

        const dataToSubmit = {
            username: usernameForSubmission, // Use the placeholder
            property_id: propertyIdInput?.value,
            checkin: startDateInput?.value,
            checkout: endDateInput?.value,
            guests: totalGuests,
            guests_adults: numAdults,
            guests_children: numChildren,
            guests_pets: numPets,
            full_name: fullNameInput?.value,
            email: emailInput?.value,
            phone: phoneInput?.value,
            requests: requestsInput?.value,
            payment_method: paymentMethodValue,
            property_title: propertyDataForBooking?.title || "Unknown Property",
            total_amount: costDetails.total?.toFixed(2) || "0.00",
            currency: propertyDataForBooking?.currency || 'NPR'
        };
        // Add payment specific details
        if (paymentMethodValue === 'card') {
            dataToSubmit.card_number = cardNumberInput?.value;
            dataToSubmit.expiry_date = expiryDateInput?.value;
            dataToSubmit.cvv = cvvInput?.value;
            dataToSubmit.card_name = cardNameInput?.value;
        } else if (paymentMethodValue === 'esewa') {
            dataToSubmit.esewa_id = esewaIdInput?.value;
        } else if (paymentMethodValue === 'khalti') {
            dataToSubmit.khalti_id = khaltiIdInput?.value;
        }
        console.log("Data being sent to backend (FINAL CHECK):", JSON.stringify(dataToSubmit));
        try {
            const result = await callApi('submit_booking.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit)
            });
            if (result.success) {
                sessionStorage.setItem('prata_bookingDetails', JSON.stringify({
                    title: dataToSubmit.property_title,
                    checkin: localFormatDate(dataToSubmit.checkin),
                    checkout: localFormatDate(dataToSubmit.checkout),
                    nights: localCalculateDuration(dataToSubmit.checkin, dataToSubmit.checkout).nights,
                    guests: summaryOccupantsElem?.textContent || '',
                    totalPrice: summaryTotalPriceElem?.textContent || 'N/A',
                    bookingId: result.bookingId || null
                }));
                window.location.href = 'booking-confirmation.html';
            } else {
                throw new Error(result.message || "Booking submission failed.");
            }
        } catch (error) {
            console.error('Error submitting booking:', error);
            if (paymentErrorMsg) {
                paymentErrorMsg.textContent = `Submission Failed: ${error.message}`;
                paymentErrorMsg.style.display = 'block';
            }
        } finally {
            if (confirmPaymentBtn) confirmPaymentBtn.disabled = false;
            if (paymentProcessingMsg) paymentProcessingMsg.style.display = 'none';
        }
      });
    }

    document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
      radio.addEventListener('change', function() {
        const cardFieldsDiv = document.getElementById('card-payment-fields');
        const esewaFieldsDiv = document.getElementById('esewa-payment-fields');
        const khaltiFieldsDiv = document.getElementById('khalti-payment-fields');
        // Ensure these inputs are assigned before this runs
        const paymentInputs = [cardNumberInput, expiryDateInput, cvvInput, cardNameInput, esewaIdInput, khaltiIdInput];
        paymentInputs.forEach(input => { if (input) input.required = false; });

        if (cardFieldsDiv) cardFieldsDiv.style.display = 'none';
        if (esewaFieldsDiv) esewaFieldsDiv.style.display = 'none';
        if (khaltiFieldsDiv) khaltiFieldsDiv.style.display = 'none';

        if (this.value === 'card') {
            if (cardFieldsDiv) cardFieldsDiv.style.display = '';
            if (cardNumberInput) cardNumberInput.required = true;
            if (expiryDateInput) expiryDateInput.required = true;
            if (cvvInput) cvvInput.required = true;
            if (cardNameInput) cardNameInput.required = true;
        } else if (this.value === 'esewa') {
            if (esewaFieldsDiv) esewaFieldsDiv.style.display = '';
            if (esewaIdInput) esewaIdInput.required = true;
        } else if (this.value === 'khalti') {
            if (khaltiFieldsDiv) khaltiFieldsDiv.style.display = '';
            if (khaltiIdInput) khaltiIdInput.required = true;
        }
        if (paymentModal) paymentModal.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        if (paymentErrorMsg) paymentErrorMsg.style.display = 'none';
      });
    });

    const defaultPaymentMethod = document.querySelector('input[name="payment_method"]:checked');
    if (defaultPaymentMethod) {
        defaultPaymentMethod.dispatchEvent(new Event('change'));
    }
    console.log("booking.js: Event listeners setup complete.");
};


// --- Initialize Page Function (Called by main.js) ---
const initializeBookingPage = async () => {
    console.log("booking.js: initializeBookingPage started.");

    // --- Assign core DOM elements needed for page structure and initial checks ---
    bookingForm = document.getElementById('booking-form');
    paymentModal = document.getElementById('payment-modal');

    // CRITICAL CHECK: Ensure bookingForm and paymentModal exist before proceeding
    if (!bookingForm || !paymentModal) {
        console.error("CRITICAL ERROR: Essential HTML elements (booking-form or payment-modal) are missing. initializeBookingPage cannot run.");
        const errorContainer = document.querySelector('.booking-container') || document.body;
        if (errorContainer && typeof errorContainer.insertAdjacentHTML === 'function') {
            errorContainer.innerHTML = '<p style="color:red; font-weight:bold; text-align:center; padding: 20px; border: 1px solid red; background-color: #ffe0e0;">A critical error occurred setting up the booking page. Required HTML elements (booking form or payment modal) are missing. Please contact support or try reloading.</p>';
        }
        return; // Stop execution if core elements are missing
    }
    console.log("booking.js: Core elements (bookingForm, paymentModal) found.");

    // Assign other DOM elements now that we know bookingForm and paymentModal exist
    proceedToPaymentBtn = document.getElementById('proceed-to-payment-btn');
    closeModalBtn = paymentModal.querySelector('.modal-close-btn');
    confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    paymentProcessingMsg = document.getElementById('payment-processing-msg');
    paymentErrorMsg = document.getElementById('payment-error-msg');
    propertyIdInput = document.getElementById('booking-property-id');
    propertyImageElem = document.getElementById('booking-property-image');
    propertyTitleElem = document.getElementById('booking-property-title');
    propertyIdDisplayElem = document.getElementById('booking-property-id-display');
    baseRateDisplayElem = document.getElementById('base-rate-display');
    baseRateValueInput = document.getElementById('base-rate-value');
    startDateInput = document.getElementById('start-date');
    endDateInput = document.getElementById('end-date');
    adultsInput = document.getElementById('adults-input');
    childrenInput = document.getElementById('children-input');
    petsInput = document.getElementById('pets-input');
    summaryStartDateElem = document.getElementById('summary-start-date');
    summaryEndDateElem = document.getElementById('summary-end-date');
    summaryDurationElem = document.getElementById('summary-duration');
    summaryOccupantsElem = document.getElementById('summary-occupants');
    priceCalcTextElem = document.getElementById('price-calc-text');
    summaryBasePriceElem = document.getElementById('summary-base-price');
    summaryTaxesElem = document.getElementById('summary-taxes');
    summaryTotalPriceElem = document.getElementById('summary-total-price');
    cardNumberInput = document.getElementById('card-number');
    expiryDateInput = document.getElementById('expiry-date');
    cvvInput = document.getElementById('cvv');
    cardNameInput = document.getElementById('card-name');
    esewaIdInput = document.getElementById('esewa-id');
    khaltiIdInput = document.getElementById('khalti-id');
    fullNameInput = document.getElementById('full-name');
    emailInput = document.getElementById('email');
    phoneInput = document.getElementById('phone');
    requestsInput = document.getElementById('requests');
    // End of DOM element assignments

    const params = new URLSearchParams(window.location.search);
    const propertyIdParam = params.get('propertyId');
    const bookingFormArea = document.querySelector('.booking-form-area'); // Used for display logic
    const bookingSummaryArea = document.querySelector('.booking-summary'); // Used for display logic
    const bookingPageHeaderElem = document.querySelector('.booking-header h1');
    const bookingPageSubHeaderElem = document.querySelector('.booking-header p');
    const bookingContent = document.querySelector('.booking-content');

    // const loggedInUsername = getLoggedInUsername(); // Login check is bypassed
    // MODIFICATION: Comment out or remove console.log referencing undefined loggedInUsername
    // console.log(`booking.js: initializeBookingPage - Checking login. Username: ${loggedInUsername}`);
    console.log(`booking.js: initializeBookingPage - Login check bypassed.`);


    // if (!loggedInUsername) { // Login check is bypassed
    //     console.warn("booking.js: User not logged in. Booking page access denied.");
    //     if (bookingFormArea) bookingFormArea.style.display = 'none';
    //     if (bookingSummaryArea) bookingSummaryArea.style.display = 'none';
    //     if (bookingPageHeaderElem) bookingPageHeaderElem.textContent = "Login Required";
    //     if (bookingPageSubHeaderElem) bookingPageSubHeaderElem.textContent = "You must be logged in to make a booking.";
    //     if (bookingContent && !bookingContent.querySelector('.alert-login-required')) {
    //          bookingContent.innerHTML = `<div class="alert-login-required" style="color: #856404; background-color: #fff3cd; border-color: #ffeeba; padding: 30px; border: 1px solid; text-align: center; margin: 20px auto; max-width: 700px; border-radius: 8px;"><h2 style="margin-top:0; color: #856404;"><i class="fas fa-sign-in-alt"></i> Login Required</h2><p>Please log in to your account to proceed with booking this property.</p><p style="margin-top:25px;"><a href="login.html" class="btn btn-primary" style="text-decoration:none; padding: 10px 20px; background-color: #007bff; color: white; border-radius: 5px;">Go to Login Page</a></p></div>`;
    //     }
    //     return;
    // }

    if (!propertyIdParam) {
        if (bookingFormArea) bookingFormArea.style.display = 'none';
        if (bookingSummaryArea) bookingSummaryArea.style.display = 'none';
        if (bookingPageHeaderElem) bookingPageHeaderElem.textContent = "Booking Error";
        if (bookingPageSubHeaderElem) bookingPageSubHeaderElem.textContent = "A property was not specified for booking.";
        if (bookingContent && !bookingContent.querySelector('.alert-no-property-id')) {
             bookingContent.innerHTML = `<div class="alert-no-property-id" style="color: red; font-weight: normal; padding: 30px; border: 1px solid #ffb3b3; text-align: center; margin: 20px auto; max-width: 700px; background-color: #fff0f0; border-radius: 8px;"><h2 style="margin-top:0; color: #d9534f;"><i class="fas fa-exclamation-triangle"></i> Property Not Specified!</h2><p>This booking page requires a property to be specified in the URL (e.g., booking.html?propertyId=123).</p><p>Please navigate from a property details page or use a valid booking link.</p><p style="margin-top:25px;"><a href="index.html" class="btn btn-primary" style="text-decoration:none; padding: 10px 20px; background-color: #007bff; color: white; border-radius: 5px;">Go to Homepage</a></p></div>`;
        }
        return;
    }

    if (bookingFormArea) bookingFormArea.style.display = '';
    if (bookingSummaryArea) bookingSummaryArea.style.display = '';
    const propertyId = parseInt(propertyIdParam, 10);

    if (isNaN(propertyId) || propertyId <= 0) {
        // ... (error display logic for invalid property ID)
        if (bookingFormArea) bookingFormArea.style.display = 'none';
        if (bookingSummaryArea) bookingSummaryArea.style.display = 'none';
        if (bookingPageHeaderElem) bookingPageHeaderElem.textContent = "Booking Error";
        if (bookingPageSubHeaderElem) bookingPageSubHeaderElem.textContent = "The property ID provided is invalid.";
        if (bookingContent && !bookingContent.querySelector('.alert-invalid-property-id')) {
            bookingContent.innerHTML = `<div class="alert-invalid-property-id" style="color: red; padding: 30px; border: 1px solid #ffb3b3; text-align: center; margin: 20px auto; max-width: 700px; background-color: #fff0f0; border-radius: 8px;"><h2 style="margin-top:0; color: #d9534f;"><i class="fas fa-times-circle"></i> Invalid Property ID!</h2><p>The property ID (<code>${propertyIdParam}</code>) provided in the URL is not valid.</p><p>Please check the link or navigate from a property details page.</p><p style="margin-top:25px;"><a href="index.html" class="btn btn-primary" style="text-decoration:none; padding: 10px 20px; background-color: #007bff; color: white; border-radius: 5px;">Go to Homepage</a></p></div>`;
        }
        return;
    }

    if (bookingPageHeaderElem) bookingPageHeaderElem.textContent = "Confirm Your Rental Details";
    if (bookingPageSubHeaderElem) bookingPageSubHeaderElem.textContent = "Please review and confirm the details for your rental request.";

    try {
        console.log(`booking.js: Initializing page for property ID: ${propertyId}`);
        const apiResponse = await callApi(`get_property_details.php?id=${propertyId}`);
        if (!apiResponse || !apiResponse.success || !apiResponse.property || !apiResponse.property.id) {
            throw new Error(apiResponse.message || `Property with ID ${propertyId} not found or API response was invalid.`);
        }
        propertyDataForBooking = apiResponse.property;
        console.log("booking.js: Fetched propertyDataForBooking:", JSON.parse(JSON.stringify(propertyDataForBooking)));

        populateStaticPropertyDetails(); // This will call updateSummary

        if (startDateInput) {
            const today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            startDateInput.min = today.toISOString().split('T')[0];
        }
        document.querySelectorAll('.guest-counter').forEach(counter => { // For initial button state
            const currentInputField = counter.querySelector('input[type="hidden"]');
            const decrementButton = counter.querySelector('[data-action="decrement"]');
            if (currentInputField && decrementButton) {
                const currentValue = parseInt(currentInputField.value, 10);
                const isAdultsField = currentInputField.id === 'adults-input';
                decrementButton.disabled = (isAdultsField && currentValue <= 1) || (!isAdultsField && currentValue <= 0);
            }
        });
        // updateSummary(); // Called by populateStaticPropertyDetails already

        // NOW that all essential data is loaded and elements are assigned, set up event listeners
        setupEventListeners();

    } catch (error) {
        console.error(`booking.js: Error initializing booking page for property ID ${propertyId}:`, error);
        // ... (error display logic for API failure)
        if (bookingFormArea) bookingFormArea.style.display = 'none';
        if (bookingSummaryArea) bookingSummaryArea.style.display = 'none';
        if (bookingPageHeaderElem) bookingPageHeaderElem.textContent = "Booking Error";
        if (bookingPageSubHeaderElem) bookingPageSubHeaderElem.textContent = "Could not load property details.";
        const errorMessage = error.message || "An unexpected error occurred.";
        if (bookingContent && !bookingContent.querySelector('.alert-load-error')) {
            bookingContent.innerHTML = `<div class="alert-load-error" style="color: red; padding: 30px; border: 1px solid #ffb3b3; text-align: center; margin: 20px auto; max-width: 700px; background-color: #fff0f0; border-radius: 8px;"><h2 style="margin-top:0; color: #d9534f;"><i class="fas fa-sync-alt fa-spin"></i> Error Loading Details</h2><p>We encountered a problem fetching details for property ID: <strong>${propertyId}</strong>.</p><p><strong>Details:</strong> ${errorMessage}</p><p>Please try refreshing. If the problem persists, the property might be unavailable.</p><p style="margin-top:25px;"><a href="index.html" class="btn btn-primary" style="text-decoration:none; padding: 10px 20px; background-color: #007bff; color: white; border-radius: 5px;">Go to Homepage</a></p></div>`;
        }
    }
    console.log("booking.js: initializeBookingPage finished.");
};

// --- REMOVE DOMContentLoaded listener from booking.js ---
// Event listeners are now set up by `setupEventListeners` which is called by `initializeBookingPage`
// document.addEventListener('DOMContentLoaded', () => { ... });

// --- Export the function to be called by main.js ---
export { initializeBookingPage };