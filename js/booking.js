document.addEventListener('DOMContentLoaded', () => {
    console.log("Booking JS Loaded");

    // --- DOM Element Selection ---
    const bookingForm = document.getElementById('booking-form');
    const propertyIdInput = document.getElementById('booking-property-id');
    const propertyImageElem = document.getElementById('booking-property-image');
    const propertyTitleElem = document.getElementById('booking-property-title');
    const baseRateDisplayElem = document.getElementById('base-rate-display');
    const baseRateValueInput = document.getElementById('base-rate-value'); // Hidden input to store numeric rate

    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    const adultsCountSpan = document.getElementById('adults-count');
    const childrenCountSpan = document.getElementById('children-count');
    const petsCountSpan = document.getElementById('pets-count');
    const adultsInput = document.getElementById('adults-input');
    const childrenInput = document.getElementById('children-input');
    const petsInput = document.getElementById('pets-input');
    const guestCounters = document.querySelectorAll('.guest-counter .counter-btn');

    const summaryStartDateElem = document.getElementById('summary-start-date');
    const summaryEndDateElem = document.getElementById('summary-end-date');
    const summaryDurationElem = document.getElementById('summary-duration');
    const summaryOccupantsElem = document.getElementById('summary-occupants');
    const priceCalcTextElem = document.getElementById('price-calc-text');
    const summaryBasePriceElem = document.getElementById('summary-base-price');
    const summaryTaxesElem = document.getElementById('summary-taxes');
    const summaryTotalPriceElem = document.getElementById('summary-total-price');

    const confirmButton = bookingForm?.querySelector('.confirm-button');

    // --- State Variables ---
    let propertyData = null; // To store fetched property details
    let pricePerUnit = 0;
    let rateType = 'night'; // Default 'night', can be 'month'
    const SERVICE_FEE_PERCENTAGE = 0.05; // Example: 5% service fee
    const VAT_PERCENTAGE = 0.13;       // Example: 13% VAT on service fee or total

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    const formatDate = (dateStr) => {
        if (!dateStr) return '-- / -- / ----';
        try {
            const date = new Date(dateStr);
            // Add time zone offset to prevent day-before issues in some timezones
            const offsetDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
            if (isNaN(offsetDate)) return '-- / -- / ----';
            const year = offsetDate.getFullYear();
            const month = String(offsetDate.getMonth() + 1).padStart(2, '0');
            const day = String(offsetDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return '-- / -- / ----';
        }
    };

    const formatCurrency = (amount, currency = 'NPR') => {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) return `${currency} N/A`;
        return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Calculates duration in both nights and approximate months
    const calculateDuration = (startStr, endStr) => {
        if (!startStr || !endStr) return { nights: 0, months: 0, display: 'N/A' };
        try {
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);
            if (isNaN(startDate) || isNaN(endDate) || endDate <= startDate) {
                return { nights: 0, months: 0, display: 'Invalid Dates' };
            }

            // Calculate nights
            const diffTime = endDate.getTime() - startDate.getTime();
            const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Calculate approximate months (can be complex, this is simplified)
            let months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
            months -= startDate.getMonth();
            months += endDate.getMonth();
             // Basic adjustment for partial months (consider days?)
            if (endDate.getDate() < startDate.getDate()) {
                 months = Math.max(0, months - 1); // Don't count if end date is earlier in the month
            }
             months = months <= 0 ? 0 : months; // Ensure non-negative

             // Determine display string
             let display = `${nights} night${nights !== 1 ? 's' : ''}`;
             if (months > 0 && nights >= 28) { // Prioritize month display for longer stays
                 // Refine this logic based on how you want to display mixed durations
                 display = `${months} month${months !== 1 ? 's' : ''}`;
                 if (nights % 30 > 5) { // Add days if significant remainder
                    display += ` & ${nights - (months * 30)} days`; // Approx days
                 }
             }

            return { nights, months, display };
        } catch (e) {
            return { nights: 0, months: 0, display: 'Error' };
        }
    };

    // Calculates estimated rental cost based on rate type
    const calculateRentalCost = (startStr, endStr) => {
        if (!propertyData || !startStr || !endStr) {
            return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Select dates' };
        }

        const { nights, months } = calculateDuration(startStr, endStr);
        let base = 0;
        let calcText = '';

        if (nights <= 0) {
             return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Invalid dates' };
        }

        if (rateType === 'month') {
            // More complex monthly calculation needed for accuracy (prorating?)
            // Simple approach: Charge full months + potentially a nightly rate for extra days
            const fullMonths = Math.max(1, Math.floor(nights / 28)); // Assume minimum 1 month if rate is monthly
            base = fullMonths * pricePerUnit;
            calcText = `${formatCurrency(pricePerUnit)}/mo x ${fullMonths} month${fullMonths !== 1 ? 's' : ''}`;
             // Add logic here for partial months or extra days if needed
        } else { // Default to nightly
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
        console.log("Updating summary...");
        if (!propertyData) {
            console.log("No property data yet, cannot update summary fully.");
            return; // Don't update if property data isn't loaded
        }

        const startStr = startDateInput?.value;
        const endStr = endDateInput?.value;

        // Update Dates
        if (summaryStartDateElem) summaryStartDateElem.textContent = formatDate(startStr);
        if (summaryEndDateElem) summaryEndDateElem.textContent = formatDate(endStr);

        // Update Duration
        const duration = calculateDuration(startStr, endStr);
        if (summaryDurationElem) summaryDurationElem.textContent = duration.display;

        // Update Occupants
        const adults = parseInt(adultsInput?.value || '1', 10);
        const children = parseInt(childrenInput?.value || '0', 10);
        const pets = parseInt(petsInput?.value || '0', 10);
        let occupantsString = `${adults} Adult${adults !== 1 ? 's' : ''}`;
        if (children > 0) occupantsString += `, ${children} Child${children !== 1 ? 'ren' : ''}`;
        if (pets > 0) occupantsString += `, ${pets} Pet${pets !== 1 ? 's' : ''}`;
        if (summaryOccupantsElem) summaryOccupantsElem.textContent = occupantsString;

        // Update Price Breakdown
        const cost = calculateRentalCost(startStr, endStr);
        if (priceCalcTextElem) priceCalcTextElem.textContent = cost.calcText;
        if (summaryBasePriceElem) summaryBasePriceElem.textContent = formatCurrency(cost.base);
        // Display service fee and taxes clearly
        if (summaryTaxesElem) summaryTaxesElem.textContent = formatCurrency(cost.serviceFee + cost.taxes);
        if (summaryTotalPriceElem) summaryTotalPriceElem.textContent = formatCurrency(cost.total);

        // --- Date Validation Feedback ---
        if (startDateInput && endDateInput) {
            // Set min attribute for end date dynamically
            endDateInput.min = startStr ? new Date(new Date(startStr).getTime() + 86400000).toISOString().split('T')[0] : '';

             // Check validity
            if (startStr && endStr && new Date(endStr) <= new Date(startStr)) {
                endDateInput.setCustomValidity('End date must be after start date.');
                // Optionally add visual invalid class
                 endDateInput.classList.add('is-invalid');
            } else {
                endDateInput.setCustomValidity('');
                 endDateInput.classList.remove('is-invalid');
            }
        }
    };

    const populateStaticPropertyDetails = () => {
        if (!propertyData) return;
        console.log("Populating static property details:", propertyData.title);

        if (propertyIdInput) propertyIdInput.value = propertyData.id;
        if (propertyImageElem) {
            propertyImageElem.src = propertyData.image || 'images/placeholder.png';
            propertyImageElem.alt = propertyData.title || 'Property Thumbnail';
        }
        if (propertyTitleElem) propertyTitleElem.textContent = propertyData.title || 'Selected Rental Property';

        // Determine rate type and store numeric price
        pricePerUnit = parseFloat(propertyData.price) || 0;
        if (propertyData.priceSuffix?.toLowerCase() === '/mo') {
            rateType = 'month';
        } else {
            rateType = 'night'; // Default
        }

        // Display base rate clearly
        if (baseRateDisplayElem) {
            baseRateDisplayElem.textContent = `${formatCurrency(pricePerUnit)} ${rateType === 'month' ? '/ month' : '/ night'}`;
        }
        if (baseRateValueInput) {
             baseRateValueInput.value = pricePerUnit; // Store numeric value if needed later
        }

        // Initial summary update after data is loaded
        updateSummary();
    };


    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    // --- Guest Counter Logic ---
    guestCounters.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            const targetId = button.dataset.target; // e.g., "adults-count"
            const countSpan = document.getElementById(targetId);
            const input = document.getElementById(targetId.replace('-count', '-input')); // e.g., "adults-input"

            if (!countSpan || !input) return;

            const currentCount = parseInt(input.value, 10);
            const isAdultCounter = input.id === 'adults-input';
            let newCount = currentCount;

            if (action === 'increment') { newCount++; }
            else if (action === 'decrement') { newCount--; }

            // Validation: Adults >= 1, Others >= 0
            if ((isAdultCounter && newCount < 1) || (!isAdultCounter && newCount < 0)) {
                return; // Do nothing if trying to go below limit
            }

            countSpan.textContent = newCount;
            input.value = newCount;

            // Enable/Disable Decrement Button
            const decrementBtn = button.parentElement.querySelector('[data-action="decrement"]');
            if (decrementBtn) {
                decrementBtn.disabled = (isAdultCounter && newCount <= 1) || (!isAdultCounter && newCount <= 0);
            }

            updateSummary(); // Recalculate summary when occupants change
        });
    });

    // --- Date Input Logic ---
    startDateInput?.addEventListener('change', updateSummary);
    endDateInput?.addEventListener('change', updateSummary);


    // --- Form Submission Logic ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default POST/GET
            console.log("Submit button clicked");

            if (!propertyData) {
                 alert("Property details haven't loaded yet. Please wait or refresh.");
                 return;
            }

            // --- Comprehensive Validation ---
            let isValid = true;
            const requiredInputs = bookingForm.querySelectorAll('[required]');

            // 1. Check basic HTML5 required fields
            requiredInputs.forEach(input => {
                input.classList.remove('is-invalid'); // Reset visual state
                if (!input.checkValidity()) {
                    console.log(`Invalid field: ${input.name || input.id}`);
                    input.classList.add('is-invalid'); // Add visual indicator
                    isValid = false;
                }
            });

            // 2. Check custom date validation
             if (endDateInput && !endDateInput.checkValidity()) {
                console.log("End date invalid");
                 endDateInput.classList.add('is-invalid');
                 isValid = false;
             } else if (endDateInput) {
                 endDateInput.classList.remove('is-invalid');
             }
             // Ensure start date is also selected
             if (!startDateInput || !startDateInput.value) {
                 console.log("Start date missing");
                 if(startDateInput) startDateInput.classList.add('is-invalid');
                 isValid = false;
             } else if (startDateInput) {
                  startDateInput.classList.remove('is-invalid');
             }


            // 3. Check if duration is valid (more than 0 nights)
            const { nights } = calculateDuration(startDateInput?.value, endDateInput?.value);
            if (nights <= 0) {
                 console.log("Duration is zero or less");
                 if(startDateInput) startDateInput.classList.add('is-invalid');
                 if(endDateInput) endDateInput.classList.add('is-invalid');
                 isValid = false;
                 // Show specific message if dates are the issue
                 if (endDateInput?.customValidity) {
                     alert(endDateInput.customValidity);
                 } else {
                     alert("Please select a valid rental period (at least one night).");
                 }
            }

            // 4. Add specific payment validation if needed (basic pattern check is done by HTML5)


            if (!isValid) {
                 // Optionally scroll to the first invalid field
                 const firstInvalid = bookingForm.querySelector('.is-invalid, :invalid');
                 firstInvalid?.focus();
                 alert("Please correct the errors marked in the form.");
                 return; // Stop submission
             }
            // --- End Validation ---


            console.log("Form is valid, proceeding...");
            if (confirmButton) {
                confirmButton.disabled = true;
                confirmButton.textContent = 'Processing...';
            }

            // --- Prepare Data for Confirmation/Backend ---
            const formData = new FormData(bookingForm); // Collects all form input values
            const bookingRequestDetails = {
                propertyId: propertyData.id,
                propertyTitle: propertyData.title,
                startDate: formatDate(formData.get('start_date')),
                endDate: formatDate(formData.get('end_date')),
                duration: calculateDuration(formData.get('start_date'), formData.get('end_date')).display,
                adults: formData.get('adults'),
                children: formData.get('children'),
                pets: formData.get('pets'),
                occupantsDisplay: summaryOccupantsElem?.textContent || '', // Get formatted string
                totalCostDisplay: summaryTotalPriceElem?.textContent || '', // Get formatted total cost
                renterName: formData.get('full_name'),
                renterEmail: formData.get('email'),
                // Note: NEVER store full card details like this. This is just for display on confirmation.
                 // In a real app, only pass necessary non-sensitive info.
                 cardLast4: formData.get('card_number')?.slice(-4) // Example: just last 4 digits
            };

            // Simulate backend interaction (replace with actual fetch call)
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

            try {
                // Save details for the confirmation page
                sessionStorage.setItem('prata_rentalRequestDetails', JSON.stringify(bookingRequestDetails));
                console.log('Rental request details saved to sessionStorage:', bookingRequestDetails);

                // Redirect to confirmation page
                window.location.href = 'booking-confirmation.html'; // Make sure this page exists

            } catch (error) {
                console.error('Failed to save details to sessionStorage or redirect:', error);
                alert('An error occurred while confirming the request. Please try again.');
                if (confirmButton) {
                    confirmButton.disabled = false;
                    confirmButton.textContent = 'Request to Book';
                }
            }
        });
    } // End Form Submission Logic


    // ==========================================
    // INITIALIZATION FUNCTION
    // ==========================================

    const initializeBookingPage = async () => {
        console.log("Initializing booking page...");
        const params = new URLSearchParams(window.location.search);
        const propertyIdParam = params.get('propertyId'); // Match URL param name

        if (!propertyIdParam) {
            console.error("Missing propertyId in URL");
            alert("Could not load booking details: Property ID is missing.");
            // Optionally redirect back or show error state
            return;
        }

        const propertyId = parseInt(propertyIdParam, 10);
        if (isNaN(propertyId)) {
            console.error("Invalid propertyId in URL");
            alert("Could not load booking details: Invalid Property ID.");
            return;
        }

        try {
            console.log(`Fetching details for property ID: ${propertyId}`);
            const response = await fetch('properties.json'); // Adjust path if needed
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const properties = await response.json();

            propertyData = properties.find(p => p.id === propertyId); // Store globally

            if (!propertyData) {
                throw new Error(`Property with ID ${propertyId} not found.`);
            }

            populateStaticPropertyDetails(); // Populate title, image, base rate
            updateSummary(); // Initial summary calc (will show 0/N/A until dates picked)

            // Set minimum start date to today
            if (startDateInput) {
                startDateInput.min = new Date().toISOString().split('T')[0];
            }
             // Initialize guest counter button states
            document.querySelectorAll('.guest-counter').forEach(counter => {
                const input = counter.querySelector('input');
                const decrementBtn = counter.querySelector('[data-action="decrement"]');
                if (input && decrementBtn) {
                    const isAdult = input.id === 'adults-input';
                    decrementBtn.disabled = (isAdult && parseInt(input.value, 10) <= 1) || (!isAdult && parseInt(input.value, 10) <= 0);
                }
            });


        } catch (error) {
            console.error("Error initializing booking page:", error);
            alert(`Failed to load property details: ${error.message}`);
            // Display error state on the page
            if (propertyTitleElem) propertyTitleElem.textContent = "Error Loading Details";
            if (bookingForm) bookingForm.style.display = 'none'; // Hide form on error
        }
    };

    // --- Run Initialization ---
    initializeBookingPage();

}); // === End of DOMContentLoaded ===