document.addEventListener('DOMContentLoaded', () => {
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');
    const propertyContent = document.getElementById('property-content');

    // Elements to populate
    const propertyTitle = document.getElementById('property-title');
    const propertyLocation = document.getElementById('property-location');
    const propertyDescription = document.getElementById('property-description');
    const propertyRent = document.getElementById('property-rent');
    const propertyMainImage = document.getElementById('property-main-image');
    const featuresGrid = document.getElementById('features-grid');
    const galleryGrid = document.getElementById('property-gallery-grid');
    const mapLink = document.getElementById('map-link');
    const mapImage = document.getElementById('map-image');
    const mapInteractive = document.getElementById('map-interactive'); // For potential future use
    const bookNowLink = document.getElementById('book-now-link');
    const contactOwnerLink = document.getElementById('contact-owner-link');
    const inquiryPropertyIdInput = document.getElementById('inquiry-property-id');
    const inquiryPropertyTitleInput = document.getElementById('inquiry-property-title');

    const fetchPropertyData = async () => {
        try {
            // --- 1. Get Property ID from URL ---
            const params = new URLSearchParams(window.location.search);
            const propertyIdParam = params.get('id');

            if (!propertyIdParam) {
                throw new Error("Property ID not found in URL.");
            }
            const propertyId = parseInt(propertyIdParam, 10);
            if (isNaN(propertyId)) {
                 throw new Error("Invalid Property ID in URL.");
            }

            // --- 2. Fetch properties.json ---
            const response = await fetch('properties.json'); // Assumes properties.json is in the root
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const properties = await response.json();

            // --- 3. Find the specific property ---
            const property = properties.find(p => p.id === propertyId);

            if (!property) {
                throw new Error(`Property with ID ${propertyId} not found.`);
            }

             // --- 4. Populate the HTML ---
             document.title = `${property.title} - PRATA`; // Set page title
             propertyTitle.textContent = property.title;
             propertyLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${property.location || 'Location not specified'}`;
             propertyDescription.textContent = property.description || 'No description available.';
             propertyRent.textContent = formatCurrency(property.price) + (property.priceSuffix || '');
             propertyMainImage.src = property.image || 'images/placeholder.png';
             propertyMainImage.alt = property.title || 'Property Image';

             // Populate Features
             featuresGrid.innerHTML = ''; // Clear placeholder
             if (property.features && property.features.length > 0) {
                 property.features.forEach(feature => {
                    const featureItem = document.createElement('div');
                    featureItem.classList.add('feature-item');
                    // Using Font Awesome classes directly
                    featureItem.innerHTML = `<i class="fas ${feature.icon || 'fa-check'} feature-icon-fa"></i> <span>${feature.text || ''}</span>`;
                    featuresGrid.appendChild(featureItem);
                 });
             } else {
                featuresGrid.innerHTML = '<p>No specific features listed.</p>';
             }

             // Populate Gallery
             galleryGrid.innerHTML = ''; // Clear placeholder
             if (property.gallery && property.gallery.length > 0) {
                 property.gallery.forEach((imgSrc, index) => {
                     const galleryDiv = document.createElement('div');
                     galleryDiv.classList.add('gallery-image'); // Add class if needed for styling
                     const img = document.createElement('img');
                     img.src = imgSrc;
                     img.alt = `${property.title} - Gallery Image ${index + 1}`;
                      // Optional: Add click handler for lightbox/modal
                     // img.addEventListener('click', () => openImageModal(imgSrc));
                     galleryDiv.appendChild(img);
                     galleryGrid.appendChild(galleryDiv);
                 });
             } else {
                // Optionally show the main image again or a message
                 galleryGrid.innerHTML = '<p>No additional gallery images available.</p>';
             }

             // Populate Map Link
             if (property.mapLink) {
                 mapLink.href = property.mapLink;
                 mapLink.style.display = 'block'; // Show the link/image container
                 mapImage.src = 'images/basemap-image-2.png'; // Keep placeholder or update if specific map images exist
                 mapImage.alt = `Map location for ${property.title}`;
             } else {
                 // Hide the map section or show a message if no link
                 const mapSection = document.querySelector('.property-map-section');
                 if (mapSection) mapSection.style.display = 'none';
                 // mapLink.style.display = 'none'; // Hide just the link container
             }
             // Add interactive map logic here if using coordinates and a library like Leaflet

            // Update Button Links
            bookNowLink.href = `booking.html?propertyId=${property.id}`; // Pass ID to booking page
            contactOwnerLink.href = `contact.html?propertyId=${property.id}&subject=${encodeURIComponent('Inquiry about: ' + property.title)}`; // Pass ID and subject

            // Update Inquiry Form hidden fields
             if (inquiryPropertyIdInput) inquiryPropertyIdInput.value = property.id;
             if (inquiryPropertyTitleInput) inquiryPropertyTitleInput.value = property.title;


             // --- 5. Show Content, Hide Loading ---
             propertyContent.style.display = 'block'; // Or appropriate display value
             loadingMessage.style.display = 'none';
             errorMessage.style.display = 'none';

        } catch (error) {
            console.error("Error loading property details:", error);
            loadingMessage.style.display = 'none';
            errorMessage.textContent = `Error loading property details: ${error.message}`;
            errorMessage.style.display = 'block';
            propertyContent.style.display = 'none';
        }
    };

    // Helper function (ensure this is available or redefine it here)
    const formatCurrency = (amount) => {
        if (isNaN(amount)) return 'NPR 0.00';
        // Basic formatting, adjust as needed
        return `NPR ${Number(amount).toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    fetchPropertyData(); // Call the function to load data
});