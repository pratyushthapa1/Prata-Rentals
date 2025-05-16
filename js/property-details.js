// js/property-details.js
console.log("Property Details JS Initialized - XAMPP/MySQL Mode");

const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

async function fetchPropertyDetails(id) {
  const loadingMessageElem = document.getElementById('loading-message');
  const errorMessageElem = document.getElementById('error-message');
  const propertyContentElem = document.getElementById('property-content');

  loadingMessageElem.style.display = 'block';
  errorMessageElem.style.display = 'none';
  propertyContentElem.style.display = 'none';

  try {
    console.log(`Fetching details for property ID: ${id}`);
    const response = await fetch(`php/get_property_details.php?id=${id}`);
    if (!response.ok) {
      let errorMsg = `Error fetching property: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) { /* Ignore */ }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log("Data received from PHP:", JSON.stringify(data, null, 2)); // Log the full response

    if (data.success && data.property) {
      renderProperty(data.property);
    } else {
      throw new Error(data.message || 'Property data not found or API request failed.');
    }
  } catch (error) {
    console.error('Failed to fetch or render property details:', error);
    showError(error.message);
  }
}

function renderProperty(prop) {
  // !!!!! CRITICAL DEBUGGING STEP !!!!!
  console.log('Data passed to renderProperty:', JSON.stringify(prop, null, 2));
  // Check this log carefully in your browser console. It shows exactly what 'prop' contains.

  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  document.getElementById('property-content').style.display = 'block';

  document.title = `${prop.title || 'Property'} Details - PRATA`;
  document.getElementById('property-title').textContent = prop.title || 'N/A';
  document.getElementById('property-location').innerHTML = `<i class='fas fa-map-marker-alt'></i> ${prop.location_text || prop.location || prop.address || 'Location N/A'}`;
  document.getElementById('property-description').textContent = prop.description || 'No description available.';

  let rentText = 'Price N/A';
  if (prop.price !== undefined && prop.price !== null) {
    const currency = prop.currency || 'NPR';
    const priceSuffix = prop.priceSuffix || prop.price_suffix || '/month'; // Check for both camelCase and snake_case
    rentText = `${currency} ${Number(prop.price).toLocaleString()} ${priceSuffix}`;
  }
  document.getElementById('property-rent').textContent = rentText;

  const mainImage = document.getElementById('property-main-image');
  mainImage.src = prop.imageURL || prop.image_url_1 || prop.image || 'images/placeholder.png';
  mainImage.alt = prop.title ? `Main view of ${prop.title}` : 'Property Main View';

  const featuresGrid = document.getElementById('features-grid');
  if (!featuresGrid) {
    console.error("Element with ID 'features-grid' not found. Skipping features/amenities display.");
  } else {
    featuresGrid.innerHTML = '';
    let hasContentForGrid = false;

    const createFeatureItem = (iconClass, text, itemType = "feature") => {
      if (text && text.toString().trim() !== "") {
        const item = document.createElement('div');
        item.className = `feature-item ${itemType}-item`; // e.g. feature-item amenity-item
        item.innerHTML = `<i class="fas ${iconClass}"></i> <span>${text}</span>`;
        featuresGrid.appendChild(item);
        hasContentForGrid = true;
        console.log(`Added to grid: ${text} (Type: ${itemType})`);
      } else {
        console.log(`Skipped adding to grid (empty text): ${text} (Type: ${itemType})`);
      }
    };

    // 1. Structured, common features
    console.log("Processing structured features...");
    console.log(`prop.is_furnished: ${prop.is_furnished}, prop.furnished_status: ${prop.furnished_status}`);
    let furnishedText = null; // Default to null to avoid showing "N/A" unless explicitly set
    if (prop.is_furnished !== undefined && prop.is_furnished !== null) {
        furnishedText = prop.is_furnished ? "Furnished" : "Unfurnished";
    } else if (typeof prop.furnished_status === 'string' && prop.furnished_status.trim() !== '') {
        furnishedText = prop.furnished_status;
    } else if (Array.isArray(prop.features)) { // Check generic features for "Furnished" variants
        if (prop.features.some(f => typeof f === 'string' && f.toLowerCase() === 'fully furnished')) {
            furnishedText = "Fully Furnished";
        } else if (prop.features.some(f => typeof f === 'string' && f.toLowerCase() === 'furnished')) {
            furnishedText = "Furnished";
        } else if (prop.features.some(f => typeof f === 'string' && f.toLowerCase() === 'unfurnished')) {
            furnishedText = "Unfurnished";
        }
    }
    if (furnishedText) createFeatureItem('fa-couch', `Status: ${furnishedText}`);


    console.log(`prop.bedrooms: ${prop.bedrooms}`);
    if (prop.bedrooms) createFeatureItem('fa-bed', `${prop.bedrooms} Bed${Number(prop.bedrooms) !== 1 ? 's' : ''}`);

    console.log(`prop.bathrooms: ${prop.bathrooms}`);
    if (prop.bathrooms) createFeatureItem('fa-bath', `${prop.bathrooms} Bath${Number(prop.bathrooms) !== 1 ? 's' : ''}`);

    console.log(`prop.kitchens: ${prop.kitchens}`);
    if (prop.kitchens) createFeatureItem('fa-utensils', `${prop.kitchens} Kitchen${Number(prop.kitchens) !== 1 ? 's' : ''}`);
    
    console.log(`prop.living_rooms: ${prop.living_rooms}`);
    if (prop.living_rooms) createFeatureItem('fa-tv', `${prop.living_rooms} Living Room${Number(prop.living_rooms) !== 1 ? 's' : ''}`);

    console.log(`prop.area: ${prop.area}, prop.area_unit: ${prop.area_unit}`);
    if (prop.area) {
      const areaUnit = prop.area_unit || 'sq ft';
      createFeatureItem('fa-ruler-combined', `Area: ${prop.area} ${areaUnit}`);
    }

    const propertyType = (prop.type || '').toString().toLowerCase();
    if ((propertyType === 'apartment' || propertyType === 'flat') && prop.floor_no) {
      createFeatureItem('fa-building', `Floor No: ${prop.floor_no}`);
    }
    if (prop.total_floors || prop.numberOfFloors) {
      createFeatureItem('fa-layer-group', `Total Floors: ${prop.total_floors || prop.numberOfFloors}`);
    }
    if (prop.parking_available !== undefined) {
      createFeatureItem(prop.parking_available ? 'fa-car' : 'fa-times-circle', prop.parking_available ? 'Parking Available' : 'No Parking');
    } else if (prop.parking_details) {
      createFeatureItem('fa-car', `Parking: ${prop.parking_details}`);
    }
    if (prop.facing_direction) createFeatureItem('fa-compass', `Facing: ${prop.facing_direction}`);
    if (prop.road_access_ft) createFeatureItem('fa-road', `Road Access: ${prop.road_access_ft} ft`);
    if (prop.hasWifi !== undefined) { // From property id 9 example
        createFeatureItem('fa-wifi', prop.hasWifi ? 'Wi-Fi Available' : 'No Wi-Fi');
    }


    // 2. Process generic features (prop.features or prop.features_array)
    console.log("Processing generic features (prop.features or prop.features_array):", prop.features || prop.features_array);
    const genericFeaturesSource = prop.features || prop.features_array;
    const alreadyHandledFurnished = !!furnishedText; // true if furnishedText was set

    if (Array.isArray(genericFeaturesSource)) {
      genericFeaturesSource.forEach(feature => {
        let featureText = '';
        let featureIcon = 'fa-check-circle';

        if (typeof feature === 'string') {
          featureText = feature;
        } else if (typeof feature === 'object' && feature !== null && feature.text) {
          featureText = feature.text;
          featureIcon = feature.icon || 'fa-check-circle';
        }

        const lowerFeatureText = featureText.toLowerCase();
        // Filter out if already handled by structured fields or furnished status
        if (featureText.trim() !== '' &&
            !(alreadyHandledFurnished && (lowerFeatureText.includes('furnish'))) &&
            !(prop.bedrooms && lowerFeatureText.includes('bedroom') && lowerFeatureText.match(/\d+\s*bedroom/)) && // Avoid "X Bedrooms" if prop.bedrooms exists
            !(prop.bathrooms && lowerFeatureText.includes('bathroom') && lowerFeatureText.match(/\d+\s*bathroom/)) &&
            !(prop.kitchens && lowerFeatureText.includes('kitchen') && lowerFeatureText.match(/\d+\s*kitchen/)) &&
            !(prop.area && lowerFeatureText.includes('sq ft') && lowerFeatureText.match(/\d+\s*sq ft/)) &&
            !(prop.area && lowerFeatureText.includes('area') && lowerFeatureText.match(/area/i))
        ) {
          createFeatureItem(featureIcon, featureText, "feature");
        } else {
            console.log(`Filtered out generic feature (already handled or empty): "${featureText}"`);
        }
      });
    }

    // 3. Process specific amenities (prop.amenities)
    console.log("Processing amenities (prop.amenities):", prop.amenities);
    if (Array.isArray(prop.amenities)) {
      prop.amenities.forEach(amenity => {
        let amenityText = '';
        let amenityIcon = 'fa-star'; // Default icon for amenities

        if (typeof amenity === 'string') {
          amenityText = amenity;
        } else if (typeof amenity === 'object' && amenity !== null && amenity.text) {
          amenityText = amenity.text;
          amenityIcon = amenity.icon || 'fa-star';
        }

        if (amenityText.trim() !== '') {
          createFeatureItem(amenityIcon, amenityText, "amenity");
        } else {
            console.log(`Skipped amenity (empty text): "${amenityText}"`);
        }
      });
    }

    if (!hasContentForGrid && featuresGrid.childElementCount === 0) {
      featuresGrid.innerHTML = '<div class="feature-item">No specific features or amenities listed for this property.</div>';
    }
  }

  // Gallery
  const galleryGrid = document.getElementById('property-gallery-grid');
  galleryGrid.innerHTML = '';
  const gallerySource = prop.gallery || prop.image_urls_array; // Check for 'gallery' from id=9
  if (Array.isArray(gallerySource) && gallerySource.length > 0) {
    gallerySource.forEach((imgUrl, index) => {
      if (imgUrl) {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-image';
        galleryItem.innerHTML = `<img src="${imgUrl}" alt="Gallery image ${index + 1} for ${prop.title || 'property'}" loading="lazy">`;
        galleryGrid.appendChild(galleryItem);
      }
    });
  } else {
    galleryGrid.innerHTML = '<div>No additional gallery images available.</div>';
  }

  // Map
  const mapLinkEl = document.getElementById('map-link'); // Renamed to avoid conflict
  const mapImage = document.getElementById('map-image');
  const mapInteractiveContainer = document.getElementById('map-interactive');
  const mapDataSource = prop.mapLink || prop.google_maps_link; // Check for 'mapLink' from id=9
  const coords = prop.coordinates || { lat: prop.latitude, lng: prop.longitude };


  if (mapDataSource) {
    if(mapLinkEl) {
        mapLinkEl.href = mapDataSource;
        mapLinkEl.target = '_blank';
        mapLinkEl.style.display = 'block';
    }
    if(mapImage) mapImage.src = prop.map_image_url || 'images/basemap-image-2.png';
    if(mapInteractiveContainer) mapInteractiveContainer.style.display = 'none';
  } else if (coords && coords.lat && coords.lng) {
    if(mapLinkEl) mapLinkEl.style.display = 'none';
    if(mapInteractiveContainer) {
        mapInteractiveContainer.style.display = 'block';
        mapInteractiveContainer.innerHTML = `<p style="padding:20px; text-align:center;">Interactive map for coordinates (${coords.lat}, ${coords.lng}) would be displayed here.</p>`;
    }
  } else {
    if(mapLinkEl) mapLinkEl.style.display = 'none';
    if(mapImage) mapImage.style.display = 'none';
    if(mapInteractiveContainer) mapInteractiveContainer.style.display = 'none';
  }

  const bookNowButton = document.getElementById('book-now-link');
  if (bookNowButton && prop.id) {
    bookNowButton.href = `booking.html?propertyId=${prop.id}`;
  } else if (bookNowButton) {
    bookNowButton.href = '#';
    bookNowButton.style.pointerEvents = 'none';
    bookNowButton.classList.add('btn-disabled');
  }

  const inquiryPropertyIdInput = document.getElementById('inquiry-property-id');
  const inquiryPropertyTitleInput = document.getElementById('inquiry-property-title');
  if (inquiryPropertyIdInput) inquiryPropertyIdInput.value = prop.id || '';
  if (inquiryPropertyTitleInput) inquiryPropertyTitleInput.value = prop.title || '';

  const contactOwnerLink = document.getElementById('contact-owner-link');
  if (contactOwnerLink) {
      if (prop.owner_email) {
        contactOwnerLink.href = `mailto:${prop.owner_email}?subject=Inquiry about Property ID ${prop.id}: ${prop.title || 'N/A'}`;
      } else {
        contactOwnerLink.href = 'contact.html';
      }
  }
}

function showError(message = 'Could not load property details. Please check the URL or try again later.') {
  document.getElementById('loading-message').style.display = 'none';
  const errorElem = document.getElementById('error-message');
  errorElem.textContent = message;
  errorElem.style.display = 'block';
  document.getElementById('property-content').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  if (propertyId && !isNaN(parseInt(propertyId))) {
    fetchPropertyDetails(propertyId);
  } else {
    console.error('No valid property ID found in URL.');
    showError('Invalid or no property ID specified in the URL.');
  }

  const inquiryForm = document.getElementById('inquiry-form');
  if (inquiryForm) {
      inquiryForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          // ... (inquiry form submission logic remains the same)
          const formData = new FormData(inquiryForm);
          const submitButton = inquiryForm.querySelector('button[type="submit"]');
          const originalButtonText = submitButton.textContent;
          
          submitButton.disabled = true;
          submitButton.textContent = 'Sending...';

          try {
              await new Promise(resolve => setTimeout(resolve, 1000));
              const result = { success: true, message: "Your inquiry has been sent successfully!" };

              if (result.success) {
                  alert(result.message || "Inquiry sent!");
                  inquiryForm.reset();
                  document.getElementById('inquiry-property-id').value = propertyId || '';
                  document.getElementById('inquiry-property-title').value = document.getElementById('property-title').textContent || '';
              } else {
                  throw new Error(result.message || "Failed to send inquiry.");
              }
          } catch (error) {
              console.error("Inquiry submission error:", error);
              alert(`Error: ${error.message}`);
          } finally {
              submitButton.disabled = false;
              submitButton.textContent = originalButtonText;
          }
      });
  }
});