// js/booking.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Booking JS Initializing...");

    // --- DOM Element Selection ---
    // Essential elements - script should stop if these are missing
    const bookingForm = document.getElementById('booking-form');
    const paymentModal = document.getElementById('payment-modal');
    if (!bookingForm || !paymentModal) {
        console.error("Essential elements #booking-form or #payment-modal not found. Booking script cannot run.");
        return; // Stop execution if core elements are missing
    }

    // Buttons
    const proceedToPaymentBtn = document.getElementById('proceed-to-payment-btn');
    const closeModalBtn = paymentModal.querySelector('.modal-close-btn');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');

    // Messages & Indicators
    const paymentProcessingMsg = document.getElementById('payment-processing-msg');
    const paymentErrorMsg = document.getElementById('payment-error-msg');

    // Property details display elements
    const propertyIdInput = document.getElementById('booking-property-id');
    const propertyImageElem = document.getElementById('booking-property-image');
    const propertyTitleElem = document.getElementById('booking-property-title');
    const baseRateDisplayElem = document.getElementById('base-rate-display');
    const baseRateValueInput = document.getElementById('base-rate-value');

    // Date input elements
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    // Guest input elements
    const adultsCountSpan = document.getElementById('adults-count');
    const childrenCountSpan = document.getElementById('children-count');
    const petsCountSpan = document.getElementById('pets-count');
    const adultsInput = document.getElementById('adults-input');
    const childrenInput = document.getElementById('children-input');
    const petsInput = document.getElementById('pets-input');
    const guestCounters = document.querySelectorAll('.guest-counter .counter-btn');

    // Summary display elements
    const summaryStartDateElem = document.getElementById('summary-start-date');
    const summaryEndDateElem = document.getElementById('summary-end-date');
    const summaryDurationElem = document.getElementById('summary-duration');
    const summaryOccupantsElem = document.getElementById('summary-occupants');
    const priceCalcTextElem = document.getElementById('price-calc-text');
    const summaryBasePriceElem = document.getElementById('summary-base-price');
    const summaryTaxesElem = document.getElementById('summary-taxes');
    const summaryTotalPriceElem = document.getElementById('summary-total-price');

    // Payment input elements (inside modal)
    const cardNumberInput = document.getElementById('card-number');
    const expiryDateInput = document.getElementById('expiry-date');
    const cvvInput = document.getElementById('cvv');
    const cardNameInput = document.getElementById('card-name');

    // --- State Variables ---
    let propertyData = null; // To store fetched property details
    let pricePerUnit = 0;
    let rateType = 'night'; // Default 'night', can be 'month'
    const SERVICE_FEE_PERCENTAGE = 0.05; // Example: 5% service fee
    const VAT_PERCENTAGE = 0.13;       // Example: 13% VAT on service fee or total (adjust as needed)

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    const formatDate = (dateStr) => {
        if (!dateStr) return '-- / -- / ----';
        try {
            const date = new Date(dateStr);
            const offsetDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            if (isNaN(offsetDate.getTime())) return '-- / -- / ----';
            const year = offsetDate.getFullYear();
            const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
            const day = String(offsetDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) { return '-- / -- / ----'; }
    };

    const formatCurrency = (amount, currency = 'NPR') => {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) return `${currency} N/A`;
        return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const calculateDuration = (startStr, endStr) => {
        if (!startStr || !endStr) return { nights: 0, months: 0, display: 'N/A' };
        try {
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);
            const offsetStartDate = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000);
            const offsetEndDate = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000);

            if (isNaN(offsetStartDate.getTime()) || isNaN(offsetEndDate.getTime()) || offsetEndDate <= offsetStartDate) {
                return { nights: 0, months: 0, display: 'Invalid Dates' };
            }

            const diffTime = offsetEndDate.getTime() - offsetStartDate.getTime();
            const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let months = (offsetEndDate.getFullYear() - offsetStartDate.getFullYear()) * 12;
            months -= offsetStartDate.getMonth();
            months += offsetEndDate.getMonth();
            if (offsetEndDate.getDate() < offsetStartDate.getDate()) {
                months = Math.max(0, months - 1);
            }
            months = months <= 0 ? 0 : months;

            let display = `${nights} night${nights !== 1 ? 's' : ''}`;
            // Use monthly display if rate is monthly OR if stay is clearly a month+
            if (rateType === 'month' && months > 0) {
                 display = `${months} month${months !== 1 ? 's' : ''}`;
                 // Optional: Add remaining days for clarity if significant
                 // const approxDaysInMonths = months * 30; // Approximation
                 // if (nights > approxDaysInMonths + 3) { // More than 3 extra days?
                 //     display += ` & ${nights - approxDaysInMonths} days`;
                 // }
            } else if (months >= 1 && nights > 27) { // Also show months for long nightly stays
                 display += ` (~${months} month${months !== 1 ? 's' : ''})`;
            }

            return { nights, months, display };
        } catch (e) { return { nights: 0, months: 0, display: 'Error' }; }
    };

    const calculateRentalCost = (startStr, endStr) => {
        if (!propertyData || !startStr || !endStr) {
            return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Select dates' };
        }
        const { nights, months } = calculateDuration(startStr, endStr);
        let base = 0;
        let calcText = '';

        if (nights <= 0) return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Invalid dates' };

        if (rateType === 'month') {
            // Simplistic monthly calc: charge full months. Assumes minimum 1 month charge.
            // Real world needs prorating or specific rules.
            const chargedMonths = Math.max(1, months); // Charge at least 1 month if rate is monthly
            base = chargedMonths * pricePerUnit;
            calcText = `${formatCurrency(pricePerUnit)}/mo x ${chargedMonths} month${chargedMonths !== 1 ? 's' : ''}`;
        } else { // Nightly rate
            base = nights * pricePerUnit;
            calcText = `${formatCurrency(pricePerUnit)}/night x ${nights} night${nights !== 1 ? 's' : ''}`;
        }

        const serviceFee = base * SERVICE_FEE_PERCENTAGE;
        const taxes = (base + serviceFee) * VAT_PERCENTAGE; // Example: VAT on base + service fee
        const total = base + serviceFee + taxes;

        return { base, serviceFee, taxes, total, calcText };
    };

    // ==========================================
    // UPDATE UI FUNCTIONS
    // ==========================================
    const updateSummary = () => {
        if (!propertyData || !bookingForm) return;
        console.log("Updating summary...");

        const startStr = startDateInput?.value;
        const endStr = endDateInput?.value;
        const duration = calculateDuration(startStr, endStr);
        const cost = calculateRentalCost(startStr, endStr);

        // Update Summary Elements safely
        if (summaryStartDateElem) summaryStartDateElem.textContent = formatDate(startStr);
        if (summaryEndDateElem) summaryEndDateElem.textContent = formatDate(endStr);
        if (summaryDurationElem) summaryDurationElem.textContent = duration.display;
        if (priceCalcTextElem) priceCalcTextElem.textContent = cost.calcText;
        if (summaryBasePriceElem) summaryBasePriceElem.textContent = formatCurrency(cost.base);
        if (summaryTaxesElem) summaryTaxesElem.textContent = formatCurrency(cost.serviceFee + cost.taxes);
        if (summaryTotalPriceElem) summaryTotalPriceElem.textContent = formatCurrency(cost.total);

        // Update Occupants String
        const adults = parseInt(adultsInput?.value || '1', 10);
        const children = parseInt(childrenInput?.value || '0', 10);
        const pets = parseInt(petsInput?.value || '0', 10);
        let occupantsString = `${adults} Adult${adults !== 1 ? 's' : ''}`;
        if (children > 0) occupantsString += `, ${children} Child${children !== 1 ? 'ren' : ''}`;
        if (pets > 0) occupantsString += `, ${pets} Pet${pets !== 1 ? 's' : ''}`;
        if (summaryOccupantsElem) summaryOccupantsElem.textContent = occupantsString;

        // Live Date Validation Feedback
        if (startDateInput && endDateInput) {
            endDateInput.min = startStr ? new Date(new Date(startStr).getTime() + 86400000).toISOString().split('T')[0] : '';
            const isValidEndDate = !(startStr && endStr && new Date(endStr) <= new Date(startStr));
            if (!isValidEndDate) {
                endDateInput.setCustomValidity('End date must be after start date.');
            } else {
                endDateInput.setCustomValidity('');
            }
            // Check if start date is selected (basic required check)
            if (!startStr) {
                startDateInput.setCustomValidity('Start date is required.');
            } else {
                 startDateInput.setCustomValidity('');
            }
        }
    };

    const populateStaticPropertyDetails = () => {
        if (!propertyData) {
             console.error("Cannot populate details, propertyData is null.");
             // Display error to user?
             if(propertyTitleElem) propertyTitleElem.textContent = "Error Loading Property";
             return;
        }
        console.log("Populating static details for:", propertyData.title);

        if (propertyIdInput) propertyIdInput.value = propertyData.id;
        if (propertyImageElem) {
            propertyImageElem.src = propertyData.image || 'images/placeholder.png';
            propertyImageElem.alt = propertyData.title || 'Property Thumbnail';
        }
        if (propertyTitleElem) propertyTitleElem.textContent = propertyData.title || 'Selected Rental Property';

        pricePerUnit = parseFloat(propertyData.price) || 0;
        rateType = propertyData.priceSuffix?.toLowerCase() === '/mo' ? 'month' : 'night';

        if (baseRateDisplayElem) {
            baseRateDisplayElem.textContent = `${formatCurrency(pricePerUnit)} ${rateType === 'month' ? '/ month' : '/ night'}`;
        }
        if (baseRateValueInput) {
             baseRateValueInput.value = pricePerUnit;
        }

        updateSummary(); // Initial summary update after data is loaded
    };

    // ==========================================
    // MODAL HANDLING FUNCTIONS
    // ==========================================
    const openPaymentModal = () => {
        if (paymentModal) {
            paymentModal.style.display = 'flex';
            setTimeout(() => { paymentModal.classList.add('active'); }, 10);
            if(paymentErrorMsg) paymentErrorMsg.textContent = '';
            if(paymentErrorMsg) paymentErrorMsg.style.display = 'none';
            if(confirmPaymentBtn) confirmPaymentBtn.disabled = false;
            if(paymentProcessingMsg) paymentProcessingMsg.style.display = 'none';
            // Focus the first input in the modal
             cardNumberInput?.focus();
        }
    };

    const closePaymentModal = () => {
        if (paymentModal) {
            paymentModal.classList.remove('active');
            // Use transitionend event for reliable hiding after transition
             const handleTransitionEnd = () => {
                 paymentModal.style.display = 'none';
                 paymentModal.removeEventListener('transitionend', handleTransitionEnd);
             }
             paymentModal.addEventListener('transitionend', handleTransitionEnd);
             // Fallback timeout in case transitionend doesn't fire reliably
             setTimeout(() => {
                  if (!paymentModal.classList.contains('active')) {
                     paymentModal.style.display = 'none';
                  }
             }, 400); // Slightly longer than CSS transition duration
        }
    };

    // ==========================================
    // EVENT LISTENERS SETUP
    // ==========================================

    // --- Guest Counter Logic ---
    guestCounters.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const targetId = button.dataset.target;
            const countSpan = document.getElementById(targetId);
            const input = document.getElementById(targetId.replace('-count', '-input'));
            if (!countSpan || !input) return;

            const currentCount = parseInt(input.value, 10);
            const isAdultCounter = input.id === 'adults-input';
            let newCount = currentCount;

            if (action === 'increment') { newCount++; }
            else if (action === 'decrement') { newCount--; }

            if ((isAdultCounter && newCount < 1) || (!isAdultCounter && newCount < 0)) return;

            countSpan.textContent = newCount;
            input.value = newCount;

            const decrementBtn = button.parentElement?.querySelector('[data-action="decrement"]');
            if (decrementBtn) {
                decrementBtn.disabled = (isAdultCounter && newCount <= 1) || (!isAdultCounter && newCount <= 0);
            }
            updateSummary();
        });
    });

    // --- Date Input Logic ---
    startDateInput?.addEventListener('input', updateSummary); // Use input for more responsive validation
    endDateInput?.addEventListener('input', updateSummary);
    startDateInput?.addEventListener('change', updateSummary); // Keep change for final calc
    endDateInput?.addEventListener('change', updateSummary);

    // --- Auto-format Expiry Date Input ---
    if (expiryDateInput) {
         expiryDateInput.addEventListener('input', (e) => {
             let value = e.target.value.replace(/[^\d]/g, ''); // Keep only digits initially
             let formattedValue = value;
             if (value.length > 2) {
                 // Add space and slash after month
                 formattedValue = value.substring(0, 2) + ' / ' + value.substring(2, 4);
             }
             // Only update if needed, prevents cursor jump
             if (e.target.value !== formattedValue) {
                 // Store cursor position
                 let cursorPos = e.target.selectionStart;
                 e.target.value = formattedValue;
                 // Restore cursor position carefully
                 if(cursorPos && formattedValue.length >= cursorPos) {
                     // Adjust cursor if slash was added/removed before it
                     if (e.target.value.length > formattedValue.length && cursorPos > 2) cursorPos++;
                     if (e.target.value.length < formattedValue.length && cursorPos > 3) cursorPos--;
                     try { e.target.setSelectionRange(cursorPos, cursorPos); } catch(err) {}
                 }
             }
             // Basic format check - more validation on submit
              const pattern = /^\d{2} \/ \d{2}$/;
              if (formattedValue.length === 7 && !pattern.test(formattedValue)) {
                  e.target.setCustomValidity("Use MM / YY format");
              } else {
                  e.target.setCustomValidity(""); // Clear custom error if format looks okay
              }
         });
          // Report validity on blur to show native messages if pattern/required fail
         expiryDateInput.addEventListener('blur', e => { e.target.reportValidity(); });
     }

    // --- "Proceed to Payment" Button Listener ---
    proceedToPaymentBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("Proceed to payment clicked. Validating main form...");

        // Clear previous invalid states on main form elements
        bookingForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        let isMainFormValid = true;
        // Check native validity for all required fields *except* payment ones
        const mainRequiredFields = bookingForm.querySelectorAll('section:not(.payment-info) [required], .date-selection input, .guest-info input[type="hidden"]');

        mainRequiredFields.forEach(input => {
             // Trigger validation check & update visual state
            if (!input.checkValidity()) {
                input.classList.add('is-invalid');
                 // For hidden inputs (like guests), maybe highlight the whole section?
                 if(input.type === 'hidden') {
                     input.closest('.guest-item')?.classList.add('is-invalid'); // Example
                 }
                isMainFormValid = false;
                console.log(`Main form invalid field: ${input.name || input.id}`);
            } else {
                 input.classList.remove('is-invalid');
                  if(input.type === 'hidden') {
                     input.closest('.guest-item')?.classList.remove('is-invalid'); // Example
                 }
            }
        });

        // Also specifically check the duration again
        const { nights } = calculateDuration(startDateInput?.value, endDateInput?.value);
        if (nights <= 0) {
            console.log("Duration invalid");
            if (startDateInput) startDateInput.classList.add('is-invalid');
            if (endDateInput) endDateInput.classList.add('is-invalid');
            isMainFormValid = false;
        }

        if (isMainFormValid) {
            console.log("Main form valid. Opening payment modal.");
            openPaymentModal();
        } else {
            console.log("Main form validation failed.");
            // Scroll to the first invalid field for better UX
            const firstInvalid = bookingForm.querySelector('.is-invalid, :invalid');
            firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid?.focus();
            alert("Please correct the highlighted rental details before proceeding.");
        }
    });

    // --- Modal Close Listeners ---
    closeModalBtn?.addEventListener('click', closePaymentModal);
    paymentModal?.addEventListener('click', (event) => {
        if (event.target === paymentModal) { closePaymentModal(); }
    });

    // --- FINAL Submit Button (Inside Modal) Listener ---
    confirmPaymentBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Confirm Payment button clicked. Validating payment details...");

        if (!propertyData) { alert("Error: Property data missing."); return; }
        if (paymentErrorMsg) paymentErrorMsg.style.display = 'none'; // Clear previous errors
        paymentModal.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid')); // Clear previous invalid states

        // --- Validate ONLY PAYMENT fields ---
        let isPaymentValid = true;
        const paymentRequiredFields = paymentModal.querySelectorAll('[required]');
        paymentRequiredFields.forEach(input => {
            if (!input.checkValidity()) {
                 input.classList.add('is-invalid');
                isPaymentValid = false;
                 console.log(`Payment form invalid field: ${input.name || input.id}`);
            } else {
                 input.classList.remove('is-invalid');
            }
        });

         // Add specific check for expiry date format and future date (basic)
         if (expiryDateInput) {
             const expiryPattern = /^(0[1-9]|1[0-2]) \/ (\d{2})$/;
             const match = expiryDateInput.value.match(expiryPattern);
             if (!match) {
                 expiryDateInput.classList.add('is-invalid');
                 expiryDateInput.setCustomValidity("Invalid expiry format (MM / YY)");
                 isPaymentValid = false;
                 console.log("Expiry date format invalid");
             } else {
                 // Basic future date check
                 const month = parseInt(match[1], 10);
                 const year = parseInt(`20${match[2]}`, 10); // Assume 20xx
                 const now = new Date();
                 const currentYear = now.getFullYear();
                 const currentMonth = now.getMonth() + 1; // JS month is 0-indexed
                 if (year < currentYear || (year === currentYear && month < currentMonth)) {
                    expiryDateInput.classList.add('is-invalid');
                    expiryDateInput.setCustomValidity("Card has expired");
                    isPaymentValid = false;
                    console.log("Expiry date is in the past");
                 } else {
                     expiryDateInput.setCustomValidity(""); // Clear custom error
                 }
             }
              // Report validity for expiry date to show message if needed
             if (!expiryDateInput.checkValidity()) isPaymentValid = false;

         }
        // --- End Payment Validation ---


        if (!isPaymentValid) {
            console.log("Payment validation failed.");
             if(paymentErrorMsg) paymentErrorMsg.textContent = 'Please correct the highlighted payment details.';
             if(paymentErrorMsg) paymentErrorMsg.style.display = 'block';
             const firstInvalidPayment = paymentModal.querySelector('.is-invalid');
             firstInvalidPayment?.focus();
             firstInvalidPayment?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // --- If All Valid, Proceed with Submission ---
        console.log("Payment details valid. Submitting full request to backend...");
        confirmPaymentBtn.disabled = true;
        if(paymentProcessingMsg) paymentProcessingMsg.style.display = 'block';

        // Prepare Full Payload from the original form
        const finalFormData = new FormData(bookingForm);
        const bookingRequestPayload = {
            propertyId: propertyData.id,
            propertyTitle: propertyData.title,
            startDate: finalFormData.get('start_date'),
            endDate: finalFormData.get('end_date'),
            adults: finalFormData.get('adults'),
            children: finalFormData.get('children'),
            pets: finalFormData.get('pets'),
            renterName: finalFormData.get('full_name'),
            renterEmail: finalFormData.get('email'),
            renterPhone: finalFormData.get('phone') || null,
            requests: finalFormData.get('requests') || null,
            // DO NOT SEND full card details
            // paymentMethodNonce: "nonce_or_token_from_payment_gateway" // Example
        };

        try {
            // --- !!! REPLACE WITH YOUR ACTUAL BACKEND FETCH CALL !!! ---
            console.log("Sending payload to backend:", bookingRequestPayload);
            // Example fetch structure:
             const response = await fetch('/api/request-booking', { // YOUR ENDPOINT
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(bookingRequestPayload)
             });

            // Simulate response for demo purposes (REMOVE IN PRODUCTION)
            // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            // const simulatedResponse = { ok: true, status: 200, json: async () => ({ success: true, message: "Request Received!", bookingId: `BK-${Date.now()}` }) };
            // const response = simulatedResponse; // Use simulation

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Server error. Please try again.' }));
                throw new Error(`Request failed: ${response.status}. ${errorData.message || ''}`);
            }
            // --- End Backend Call ---

            const result = await response.json();
            console.log('Backend success response:', result);

            // --- Prepare for Confirmation Page ---
             sessionStorage.setItem('prata_rentalRequestDetails', JSON.stringify({
                title: bookingRequestPayload.propertyTitle,
                checkin: formatDate(bookingRequestPayload.startDate),
                checkout: formatDate(bookingRequestPayload.endDate),
                duration: calculateDuration(bookingRequestPayload.startDate, bookingRequestPayload.endDate).display,
                occupantsDisplay: summaryOccupantsElem?.textContent || '',
                totalPrice: summaryTotalPriceElem?.textContent || 'N/A', // Get calculated total
                bookingId: result.bookingId || null
            }));

            // --- Redirect ---
             window.location.href = 'booking-confirmation.html';

        } catch (error) {
            console.error('Error during final booking submission:', error);
            if(paymentErrorMsg) paymentErrorMsg.textContent = `Submission Failed: ${error.message}`;
            if(paymentErrorMsg) paymentErrorMsg.style.display = 'block';
            confirmPaymentBtn.disabled = false; // Re-enable button on error
             if(paymentProcessingMsg) paymentProcessingMsg.style.display = 'none';
        }
    });

    // ==========================================
    // INITIALIZATION FUNCTION
    // ==========================================
    const initializeBookingPage = async () => {
        console.log("Initializing booking page...");
        if (!bookingForm) return; // Stop if form isn't present

        const params = new URLSearchParams(window.location.search);
        const propertyIdParam = params.get('propertyId');

        if (!propertyIdParam) {
            console.error("Missing propertyId in URL");
            bookingForm.innerHTML = '<p style="color:red; text-align:center;">Error: Cannot load booking form without a property ID.</p>';
            return;
        }
        const propertyId = parseInt(propertyIdParam, 10);
        if (isNaN(propertyId)) {
            console.error("Invalid propertyId in URL:", propertyIdParam);
            bookingForm.innerHTML = '<p style="color:red; text-align:center;">Error: Invalid property ID.</p>';
            return;
        }

        try {
            console.log(`Fetching details for property ID: ${propertyId}`);
            const response = await fetch('properties.json'); // Adjust path if needed
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const properties = await response.json();
            propertyData = properties.find(p => p.id === propertyId); // Store globally

            if (!propertyData) throw new Error(`Property with ID ${propertyId} not found.`);

            populateStaticPropertyDetails(); // Populate title, image, base rate

            // Set minimum start date to today
            if (startDateInput) {
                startDateInput.min = new Date().toISOString().split('T')[0];
            }
            // Initialize guest counter button states
            document.querySelectorAll('.guest-counter').forEach(counter => {
                const input = counter.querySelector('input[type="hidden"]');
                const decrementBtn = counter.querySelector('[data-action="decrement"]');
                if (input && decrementBtn) {
                    const isAdult = input.id === 'adults-input';
                    const currentValue = parseInt(input.value, 10);
                    decrementBtn.disabled = (isAdult && currentValue <= 1) || (!isAdult && currentValue <= 0);
                }
            });

        } catch (error) {
            console.error("Error initializing booking page:", error);
            // Display error state more prominently
            const headerElem = document.querySelector('.booking-header');
            const contentElem = document.querySelector('.booking-content');
            if (headerElem) headerElem.innerHTML = `<h1>Error Loading Booking</h1><p style="color:red;">${error.message}</p>`;
            if (contentElem) contentElem.style.display = 'none'; // Hide form area on error
        }
    };

    // --- Run Initialization ---
    initializeBookingPage();

}); // === End of DOMContentLoaded ===git