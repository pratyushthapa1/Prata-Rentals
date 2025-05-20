// js/property-details.js
console.log("Property Details JS Initialized - XAMPP/MySQL Mode");
const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

async function fetchPropertyDetails(id) {
  try {
    const res = await fetch(`php/get_property_details.php?id=${id}`);
    const data = await res.json();
    if (data.success && data.property) {
      renderProperty(data.property);
    } else {
      showError();
    }
  } catch (e) {
    showError();
  }
}

function renderProperty(prop) {
  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('property-content').style.display = 'block';
  document.title = `${prop.title} - PRATA`;
  document.getElementById('property-title').textContent = prop.title;
  document.getElementById('property-location').innerHTML = `<i class='fas fa-map-marker-alt'></i> ${prop.location}`;
  document.getElementById('property-description').textContent = prop.description;
  document.getElementById('property-rent').textContent = `${prop.currency} ${Number(prop.price).toLocaleString()}${prop.price_suffix || ''}`;
  document.getElementById('property-main-image').src = prop.image_url_1;
  document.getElementById('property-main-image').alt = prop.title;

  // Features
  const featuresGrid = document.getElementById('features-grid');
  featuresGrid.innerHTML = '';
  if (Array.isArray(prop.features_array)) {
    prop.features_array.forEach(f => {
      featuresGrid.innerHTML += `<div class="feature-item"><i class="fas ${f.icon||'fa-check'}"></i> <span>${f.text||f}</span></div>`;
    });
  } else {
    featuresGrid.innerHTML = '<div class="feature-item">No features listed.</div>';
  }

  // Gallery
  const galleryGrid = document.getElementById('property-gallery-grid');
  galleryGrid.innerHTML = '';
  if (Array.isArray(prop.image_urls_array) && prop.image_urls_array.length) {
    prop.image_urls_array.forEach((img, idx) => {
      galleryGrid.innerHTML += `<div class="gallery-image"><img src="${img}" alt="Gallery image ${idx+1}" loading="lazy"></div>`;
    });
  } else {
    galleryGrid.innerHTML = '<div>No gallery images available.</div>';
  }

  // Map
  const mapLink = document.getElementById('map-link');
  const mapImage = document.getElementById('map-image');
  if (prop.map_image_url) {
    mapImage.src = prop.map_image_url;
    mapImage.alt = `Map of ${prop.location}`;
  }
  if (prop.map_link) {
    mapLink.href = prop.map_link;
    mapLink.target = '_blank';
  } else {
    mapLink.href = '#';
    mapLink.target = '';
  }

  // Inquiry form hidden fields
  document.getElementById('inquiry-property-id').value = prop.id;
  document.getElementById('inquiry-property-title').value = prop.title;
}

function showError() {
  document.getElementById('loading-message').style.display = 'none';
  document.getElementById('error-message').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  if (propertyId) fetchPropertyDetails(propertyId);
  else showError();
});