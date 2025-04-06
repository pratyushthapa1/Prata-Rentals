
document.addEventListener('DOMContentLoaded', () => {

    // --- Common Navigation ---
    const logoLink = document.querySelector('.header-logo a');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            // Allow normal navigation if href is not just "#"
            if (logoLink.getAttribute('href') === '#') {
                e.preventDefault();
            }
            window.location.href = 'index.html'; // Always go to home on logo click
        });
    }

    // --- Homepage (index.html) Specific ---
    const propertyCards = document.querySelectorAll('.property-card');
    propertyCards.forEach(card => {
        card.addEventListener('click', () => {
            // In a real app, you'd pass an ID:
            // const propertyId = card.dataset.propertyId;
            // window.location.href = `property.html?id=${propertyId}`;
            window.location.href = 'property.html'; // Simple navigation for now
        });
    });

    // --- Homepage: Price Range Validation (for Hero Search) ---
    const priceRangeInputHero = document.getElementById('price-range-hero');
    if (priceRangeInputHero) {
        priceRangeInputHero.addEventListener('input', function() {
            // Clear previous custom validity on input change
            this.setCustomValidity('');

            // Only validate if there's a value
            if (this.value) {
                const value = parseInt(this.value, 10);
                const min = parseInt(this.min, 10);
                const max = parseInt(this.max, 10);

                if (isNaN(value)) return; // Ignore if not a number

                if (!isNaN(min) && value < min) {
                    this.setCustomValidity(`Price must be at least ${min.toLocaleString()}`);
                } else if (!isNaN(max) && value > max) {
                    this.setCustomValidity(`Price cannot exceed ${max.toLocaleString()}`);
                }
            }
        });

        // Add blur event listener to show validation message when user leaves field
        priceRangeInputHero.addEventListener('blur', function() {
            // Check validity and report if there's a custom error or native constraint violation
            if (!this.checkValidity()) {
                 this.reportValidity();
            }
        });
    }

    // --- Homepage: Hero Search Form ---
    const searchFormHero = document.getElementById('search-form-hero');
    if(searchFormHero) {
        searchFormHero.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent actual form submission for now
            console.log('Hero Search submitted!');

            // Validate price input before proceeding (optional, but good practice)
             if (priceRangeInputHero && !priceRangeInputHero.checkValidity()) {
                priceRangeInputHero.reportValidity();
                return; // Stop submission if price is invalid
             }

            // Collect data from hero form
             const location = document.getElementById('location-hero')?.value.trim();
             const category = document.getElementById('category-hero')?.value;
             const price = priceRangeInputHero?.value; // Use the potentially validated input

             console.log({ location, category, price });

             // Build query string for search results page
             const queryParams = new URLSearchParams();
             if (location) queryParams.set('location', location);
             if (category) queryParams.set('category', category);
             if (price) queryParams.set('max_price', price);

             // Redirect to a search results page (you'll need to create this page)
             // window.location.href = `search-results.html?${queryParams.toString()}`;

             alert(`Searching for: ${category || 'Any Type'} in ${location || 'Any Location'} up to NPR ${price || 'any price'}`);
        });
    }


    // --- Property Page (property.html) Specific ---
    const contactOwnerButton = document.getElementById('contact-owner-btn');
    if (contactOwnerButton) {
        contactOwnerButton.addEventListener('click', () => {
            window.location.href = 'contact.html';
        });
    }

    const bookNowButton = document.getElementById('book-now-btn');
    if (bookNowButton) {
        bookNowButton.addEventListener('click', () => {
            // Add booking logic or navigation here
            alert('Booking functionality not implemented yet.');
        });
    }

    const viewMoreImagesButton = document.getElementById('view-more-images-btn');
     if (viewMoreImagesButton) {
        viewMoreImagesButton.addEventListener('click', () => {
            // Add logic for image gallery/modal here
             alert('Image gallery viewing not implemented yet.');
         });
     }

     const inquiryForm = document.getElementById('inquiry-form');
     if (inquiryForm) {
        const resetButton = inquiryForm.querySelector('.btn-reset');
        inquiryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Inquiry submitted!');
            // Add actual form submission logic (e.g., AJAX using fetch)
             alert('Inquiry form submission not implemented yet.');
            // Example: Collect data
            // const formData = new FormData(inquiryForm);
            // fetch('/api/inquiry', { method: 'POST', body: formData })
            //   .then(response => response.json())
            //   .then(data => { console.log('Success:', data); window.location.href = 'message.html?type=inquiry'; })
            //   .catch(error => { console.error('Error:', error); alert('Failed to send inquiry.'); });

            // For now, redirect:
            // window.location.href = 'message.html?type=inquiry';
        });

        if(resetButton) {
            resetButton.addEventListener('click', () => {
                inquiryForm.reset();
            });
        }
     }

    // --- Contact Page (contact.html) Specific ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default submission
            console.log('Contact form submitted!');
            // Add real submission logic here (e.g., using fetch to send data)
            // Example:
            // const formData = new FormData(contactForm);
            // fetch('/api/contact', { method: 'POST', body: formData })
            //    .then(...) // Handle success/error
            //    .then(() => { window.location.href = 'message.html'; }) // Redirect on success
            //    .catch(...)

            // For now, just navigate to the message page
            window.location.href = 'message.html';
        });
    }

}); // End of DOMContentLoaded