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
    const mapInteractive = document.getElementById('map-interactive');
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
            const response = await fetch('properties.json'); // Ensure path is correct
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching properties.json`);
            }
            const properties = await response.json();

            // --- 3. Find the specific property ---
            const property = properties.find(p => p.id === propertyId);

            if (!property) {
                throw new Error(`Property with ID ${propertyId} not found.`);
            }

             // --- 4. Populate the HTML ---
             document.title = `${property.title} - PRATA`;
             propertyTitle.textContent = property.title;
             propertyLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${property.location || 'Location not specified'}`;
             propertyDescription.textContent = property.description || 'No description available.';
             propertyRent.textContent = formatCurrency(property.price, property.currency) + (property.priceSuffix || '');
             propertyMainImage.src = property.image || 'images/placeholder.png';
             propertyMainImage.alt = property.title || 'Property Image';

             // --- Populate Features ---
             featuresGrid.innerHTML = ''; // Clear placeholder/static examples
             let hasFeatures = false;

             // Add features from the 'features' array
             if (property.features && property.features.length > 0) {
                 property.features.forEach(feature => {
                    const featureItem = document.createElement('div');
                    featureItem.classList.add('feature-item');
                    featureItem.innerHTML = `<i class="fas ${feature.icon || 'fa-check'} feature-icon-fa"></i> <span>${feature.text || ''}</span>`;
                    featuresGrid.appendChild(featureItem);
                    hasFeatures = true;
                 });
             }

             // Add Floor Information Based on Property Type
             const floorFeatureItem = document.createElement('div');
             floorFeatureItem.classList.add('feature-item');
             let floorInfoAdded = false;

             if ((property.type === 'House' || property.type === 'Villa') && property.numberOfFloors !== undefined && property.numberOfFloors !== null) {
                 floorFeatureItem.innerHTML = `<i class="fas fa-layer-group feature-icon-fa"></i> <span>Floors: ${property.numberOfFloors}</span>`;
                 floorInfoAdded = true;
             } else if ((property.type === 'Apartment' || property.type === 'Flat') && property.floorNumber !== undefined && property.floorNumber !== null) {
                 floorFeatureItem.innerHTML = `<i class="fas fa-building feature-icon-fa"></i> <span>Floor: ${property.floorNumber}</span>`;
                 floorInfoAdded = true;
             }

             if (floorInfoAdded) {
                 featuresGrid.appendChild(floorFeatureItem);
                 hasFeatures = true;
             }

             // --- Add WiFi Information ---
             if (property.hasWifi !== undefined && property.hasWifi !== null) {
                 const wifiFeatureItem = document.createElement('div');
                 wifiFeatureItem.classList.add('feature-item');
                 const wifiText = property.hasWifi ? 'Yes' : 'No';
                 wifiFeatureItem.innerHTML = `<i class="fas fa-wifi feature-icon-fa"></i> <span>WiFi Access: ${wifiText}</span>`;
                 featuresGrid.appendChild(wifiFeatureItem);
                 hasFeatures = true; // Mark that we added WiFi info
             }
             // --- End WiFi Information ---


             // Show message only if NO features at all were added
             if (!hasFeatures) {
                featuresGrid.innerHTML = '<p>No specific features listed.</p>';
             }


             // Populate Gallery
             galleryGrid.innerHTML = '';
             if (property.gallery && property.gallery.length > 0) {
                 property.gallery.forEach((imgSrc, index) => {
                     const galleryDiv = document.createElement('div');
                     galleryDiv.classList.add('gallery-image');
                     const img = document.createElement('img');
                     img.src = imgSrc;
                     img.alt = `${property.title} - Gallery Image ${index + 1}`;
                     img.loading = 'lazy';
                     galleryDiv.appendChild(img);
                     galleryGrid.appendChild(galleryDiv);
                 });
             } else {
                 galleryGrid.innerHTML = '<p>No additional gallery images available.</p>';
             }

             // Populate Map Link
             if (property.mapLink) {
                 mapLink.href = property.mapLink;
                 mapLink.style.display = 'block';
                 mapImage.src = 'images/basemap-image-2.png';
                 mapImage.alt = `Map location for ${property.title}`;
                 const mapContainer = document.getElementById('map-container');
                 if (mapContainer) mapContainer.style.display = 'block';
             } else {
                 const mapSection = document.querySelector('.property-map-section');
                 if (mapSection) mapSection.style.display = 'none';
             }
             // Add interactive map logic here using property.coordinates if desired

            // Update Button Links
            bookNowLink.href = `booking.html?propertyId=${property.id}`;
            contactOwnerLink.href = `contact.html?propertyId=${property.id}&subject=${encodeURIComponent('Inquiry about: ' + property.title)}`;

            // Update Inquiry Form hidden fields
             if (inquiryPropertyIdInput) inquiryPropertyIdInput.value = property.id;
             if (inquiryPropertyTitleInput) inquiryPropertyTitleInput.value = property.title;


             // --- 5. Show Content, Hide Loading ---
             propertyContent.style.display = 'block';
             loadingMessage.style.display = 'none';
             errorMessage.style.display = 'none';

        } catch (error) {
            console.error("Error loading property details:", error);
            loadingMessage.style.display = 'none';
            errorMessage.textContent = `Error loading property details: ${error.message}. Please check the console and the property ID in the URL.`;
            errorMessage.style.display = 'block';
            propertyContent.style.display = 'none';
        }
    };

    // Updated helper function to include currency
    const formatCurrency = (amount, currency = 'NPR') => {
        const numericAmount = Number(amount);
        if (isNaN(numericAmount)) return `${currency} N/A`;

        return `${currency} ${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    fetchPropertyData();
});