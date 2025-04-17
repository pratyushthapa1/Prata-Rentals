document.addEventListener('DOMContentLoaded', () => {

    // --- Common Navigation & Utility ---
    const logoLink = document.querySelector('.header-logo'); // Use class on <a> tag
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            // Allow normal navigation if href is not just "#"
            if (logoLink.getAttribute('href') === '#') {
                e.preventDefault();
            }
            window.location.href = 'index.html'; // Always go to home on logo click
        });
    }

    // Function to format date as YYYY-MM-DD
    const formatDate = (date) => {
        if (!date) return '-- / -- / ----';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`; // Consistent format
    };

    // Function to calculate nights
    const calculateNights = (checkin, checkout) => {
        if (!checkin || !checkout) return 0;
        const date1 = new Date(checkin);
        const date2 = new Date(checkout);
        if (isNaN(date1) || isNaN(date2) || date2 <= date1) return 0;
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Function to format currency (simple example)
    const formatCurrency = (amount) => {
        if (isNaN(amount)) return 'NPR 0.00';
        return `NPR ${Number(amount).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };


    // --- Homepage (index.html) Specific ---
    if (document.body.contains(document.getElementById('search-form-hero'))) {
        const propertyCardLinks = document.querySelectorAll('.property-card-link');
        propertyCardLinks.forEach(link => {
            // The link already handles navigation, no extra JS needed unless for SPA behavior
        });

        // Price Range Validation (Hero Search)
        const priceRangeInputHero = document.getElementById('price-range-hero');
        if (priceRangeInputHero) {
            priceRangeInputHero.addEventListener('input', function() {
                this.setCustomValidity(''); // Clear previous custom validity
                if (this.value && parseInt(this.value, 10) < 0) {
                    this.setCustomValidity('Price cannot be negative.');
                }
            });
            priceRangeInputHero.addEventListener('blur', function() {
                if (!this.checkValidity()) {
                    this.reportValidity();
                }
            });
        }

        // Hero Search Form Submission (Redirects via HTML action/method)
        const searchFormHero = document.getElementById('search-form-hero');
        if(searchFormHero) {
             searchFormHero.addEventListener('submit', function(e) {
                // Optional: Add validation before allowing HTML form submission
                 if (priceRangeInputHero && !priceRangeInputHero.checkValidity()) {
                    e.preventDefault(); // Stop submission if price is invalid
                    priceRangeInputHero.reportValidity();
                 }
                 // Otherwise, allow default GET submission to search-results.html
             });
        }
    }


    // --- Property Page (property.html) Specific ---
    // NOTE: This assumes a separate js/property-details.js will handle fetching
    // data and setting the correct hrefs dynamically based on property ID.
    // This section just handles generic actions if those elements exist.

    if (document.body.contains(document.getElementById('property-content'))) {
        const contactOwnerLink = document.getElementById('contact-owner-link');
        const bookNowLink = document.getElementById('book-now-link');
        const inquiryForm = document.getElementById('inquiry-form');

        // Event listeners might be added by property-details.js after setting hrefs.
        // Example placeholder if property-details.js doesn't exist:
        if (contactOwnerLink) {
            contactOwnerLink.addEventListener('click', (e) => {
                if (contactOwnerLink.getAttribute('href') === '#') { // Check if href wasn't set dynamically
                    e.preventDefault();
                     alert('Property details needed to contact owner.');
                    // In real scenario, href would be set by property-details.js like:
                    // contactOwnerLink.href = `contact.html?propertyId=${propertyId}&subject=Inquiry about ${propertyTitle}`;
                }
            });
        }
        if (bookNowLink) {
            bookNowLink.addEventListener('click', (e) => {
                 if (bookNowLink.getAttribute('href') === '#') { // Check if href wasn't set dynamically
                    e.preventDefault();
                     alert('Property details needed to book.');
                     // In real scenario, href would be set by property-details.js like:
                     // bookNowLink.href = `booking.html?propertyId=${propertyId}`;
                 }
            });
        }


         if (inquiryForm) {
            const resetButton = inquiryForm.querySelector('.btn-reset');
            inquiryForm.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('Inquiry submitted!');
                // Add actual form submission logic (e.g., AJAX using fetch)
                // Example: Collect data including hidden property ID/Title
                // const formData = new FormData(inquiryForm);
                // fetch('/api/inquiry', { method: 'POST', body: formData }) ...

                alert('Inquiry form submission simulated. Redirecting...');
                // Redirect to a generic message page or confirmation
                 window.location.href = 'message.html?type=inquiry_sent'; // Example redirect
            });

            if(resetButton) {
                // Reset button type="reset" works natively, extra JS only needed if doing custom reset actions
                resetButton.addEventListener('click', () => {
                    // inquiryForm.reset(); // Native reset is usually sufficient
                    console.log('Inquiry form reset.');
                });
            }
         }
    }

     // --- Booking Page (booking.html) Specific ---
    if (document.body.contains(document.getElementById('booking-form'))) {
        const bookingForm = document.getElementById('booking-form');
        const checkinInput = document.getElementById('checkin-date');
        const checkoutInput = document.getElementById('checkout-date');
        const guestCounters = document.querySelectorAll('.guest-counter .counter-btn');

        // Elements for summary update
        const summaryCheckin = document.getElementById('summary-checkin');
        const summaryCheckout = document.getElementById('summary-checkout');
        const summaryNights = document.getElementById('summary-nights');
        const summaryGuests = document.getElementById('summary-guests');
        const pricePerNightSpan = document.getElementById('price-per-night');
        const priceCalcText = document.getElementById('price-calc-text');
        const summaryBasePrice = document.getElementById('summary-base-price');
        const summaryTaxes = document.getElementById('summary-taxes'); // Assuming fixed tax or %
        const summaryTotalPrice = document.getElementById('summary-total-price');

        let pricePerNight = parseFloat(pricePerNightSpan?.textContent.replace(/,/g, '') || 0); // Get base price

        const updateBookingSummary = () => {
            const checkinDate = checkinInput.value;
            const checkoutDate = checkoutInput.value;
            const nights = calculateNights(checkinDate, checkoutDate);

            // Update Dates & Nights
            summaryCheckin.textContent = formatDate(checkinDate);
            summaryCheckout.textContent = formatDate(checkoutDate);
            summaryNights.textContent = nights;

            // Update Guests
            const adults = parseInt(document.getElementById('adults-input').value, 10);
            const children = parseInt(document.getElementById('children-input').value, 10);
            const pets = parseInt(document.getElementById('pets-input').value, 10);
            let guestString = `${adults} Adult${adults !== 1 ? 's' : ''}`;
            if (children > 0) guestString += `, ${children} Child${children !== 1 ? 'ren' : ''}`;
            if (pets > 0) guestString += `, ${pets} Pet${pets !== 1 ? 's' : ''}`;
            summaryGuests.textContent = guestString;

             // Update Price Calculation
             const basePrice = nights * pricePerNight;
             // Simple tax calculation (e.g., 10% - replace with actual logic)
             const taxes = basePrice * 0.10;
             const totalPrice = basePrice + taxes;

             priceCalcText.textContent = `NPR ${pricePerNight.toLocaleString()} x ${nights} night${nights !== 1 ? 's' : ''}`;
             summaryBasePrice.textContent = formatCurrency(basePrice);
             summaryTaxes.textContent = formatCurrency(taxes);
             summaryTotalPrice.textContent = formatCurrency(totalPrice);

             // Validate dates (basic: checkout must be after checkin)
             checkoutInput.min = checkinDate ? new Date(new Date(checkinDate).getTime() + 86400000).toISOString().split('T')[0] : '';
             if (checkinDate && checkoutDate && new Date(checkoutDate) <= new Date(checkinDate)) {
                 checkoutInput.setCustomValidity('Check-out date must be after check-in date.');
             } else {
                  checkoutInput.setCustomValidity('');
             }
        };

        // Guest Counter Logic
        guestCounters.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                const targetId = button.dataset.target;
                const countSpan = document.getElementById(targetId);
                const input = document.getElementById(targetId.replace('-count', '-input'));
                const currentCount = parseInt(input.value, 10);
                const isAdultCounter = targetId === 'adults-count';

                let newCount = currentCount;
                if (action === 'increment') {
                    newCount++;
                } else if (action === 'decrement') {
                    newCount--;
                }

                 // Prevent going below 1 for adults, 0 for others
                if ((isAdultCounter && newCount < 1) || (!isAdultCounter && newCount < 0)) {
                    return;
                }

                countSpan.textContent = newCount;
                input.value = newCount;

                // Enable/disable decrement buttons
                 const decrementBtn = button.parentElement.querySelector('[data-action="decrement"]');
                 if (decrementBtn) {
                     decrementBtn.disabled = (isAdultCounter && newCount <= 1) || (!isAdultCounter && newCount <= 0);
                 }


                updateBookingSummary(); // Update summary when guests change
            });
        });

        // Update summary on date change
        checkinInput?.addEventListener('change', updateBookingSummary);
        checkoutInput?.addEventListener('change', updateBookingSummary);


        // Booking Form Submission
        bookingForm?.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Booking form submitted!');

            // Simple Validation
            if (!checkinInput.value || !checkoutInput.value) {
                 alert('Please select check-in and check-out dates.');
                 checkinInput.reportValidity(); // Highlight if invalid
                 checkoutInput.reportValidity();
                return;
            }
             if (!checkoutInput.checkValidity()) {
                 alert('Please correct the date selection.');
                 checkoutInput.reportValidity();
                 return;
            }
             if (!bookingForm.checkValidity()) {
                 // Trigger browser validation UI for other required fields
                 bookingForm.reportValidity();
                 alert('Please fill in all required fields.');
                 return;
             }


            // Gather data for confirmation page
            const bookingDetails = {
                title: document.getElementById('booking-property-title')?.textContent || 'Selected Property',
                checkin: formatDate(checkinInput.value),
                checkout: formatDate(checkoutInput.value),
                nights: summaryNights?.textContent || '0',
                guests: summaryGuests?.textContent || '1 Adult',
                totalPrice: summaryTotalPrice?.textContent || 'NPR 0.00'
            };

            // Store in sessionStorage
            try {
                sessionStorage.setItem('prata_bookingDetails', JSON.stringify(bookingDetails));
                console.log('Booking details saved to sessionStorage:', bookingDetails);
                // Redirect to confirmation page
                window.location.href = 'booking-confirmation.html';
            } catch (error) {
                console.error('Failed to save booking details to sessionStorage:', error);
                alert('An error occurred while proceeding with the booking. Please try again.');
            }
        });

        // Initial summary calculation
        updateBookingSummary();
    }


    // --- Contact Page (contact.html) Specific ---
    if (document.body.contains(document.getElementById('contact-form'))) {
        const contactForm = document.getElementById('contact-form');
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default submission
            console.log('Contact form submitted!');

             // Simple validation
             if (!contactForm.checkValidity()) {
                 contactForm.reportValidity();
                 alert('Please fill in all required fields.');
                 return;
             }

            // Add real submission logic here (e.g., using fetch to send data)
            // Example:
            // const formData = new FormData(contactForm);
            // fetch('/api/contact', { method: 'POST', body: formData }) ...

            // For now, just navigate to the message page
             alert('Message sending simulated. Redirecting...');
            window.location.href = 'message.html'; // Redirect to generic message page
        });
    }

    // --- Login/Signup Pages ---
    if (document.body.contains(document.getElementById('login-form'))) {
        // Login logic is self-contained in login.html's script tag
    }
    if (document.body.contains(document.getElementById('signup-form'))) {
         // Signup logic is self-contained in signup.html's script tag
    }

    // --- Profile Page (profile.html) ---
     if (document.body.contains(document.getElementById('profile-content'))) {
        // Profile logic (login check, logout) is self-contained in profile.html's script tag
     }

     // --- Wishlist Page (wishlist.html) ---
     if (document.body.contains(document.getElementById('wishlist-grid'))) {
        // Wishlist logic (login check, remove item simulation) is self-contained in wishlist.html's script tag
     }


}); // End of DOMContentLoaded