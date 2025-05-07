// Dynamic All Properties Page Script
const PROPERTIES_API = 'php/get_all_property_details.php';
const grid = document.querySelector('.properties-grid');
const loading = document.getElementById('properties-loading');
const empty = document.getElementById('properties-empty');
const sortSelect = document.getElementById('sort-select');
const filterType = document.getElementById('filter-type');
const filterLocation = document.getElementById('filter-location');
const pagination = document.querySelector('.pagination-controls');

let allProperties = [];
let filtered = [];
let currentPage = 1;
const perPage = 6;

function formatCurrency(amount, currency = 'NPR') {
  const num = Number(amount);
  if (isNaN(num)) return `${currency} N/A`;
  return `${currency} ${num.toLocaleString('en-IN')}`;
}

async function fetchProperties() {
  loading.style.display = 'block';
  empty.style.display = 'none';
  try {
    const res = await fetch(PROPERTIES_API);
    const data = await res.json();
    if (data.success && Array.isArray(data.properties)) {
      allProperties = data.properties;
      filtered = [...allProperties];
      render();
      populateFilters();
    } else {
      throw new Error('No properties found');
    }
  } catch (e) {
    grid.innerHTML = '';
    empty.textContent = 'Failed to load properties.';
    empty.style.display = 'block';
  } finally {
    loading.style.display = 'none';
  }
}

function render() {
  grid.innerHTML = '';
  if (!filtered.length) {
    empty.textContent = 'No properties found.';
    empty.style.display = 'block';
    pagination.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  filtered.slice(start, end).forEach(prop => {
    grid.insertAdjacentHTML('beforeend', propertyCardHTML(prop));
  });
  renderPagination();
}

function propertyCardHTML(prop) {
  return `<div class="property-card" tabindex="0" onclick="location.href='property.html?id=${prop.id}'">
    <div class="card-image"><img src="${prop.image_url_1}" alt="${prop.title}" loading="lazy"></div>
    <div class="card-content">
      <h3>${prop.title}</h3>
      <div class="location"><i class="fas fa-map-marker-alt"></i> ${prop.location}</div>
      <div class="price">${formatCurrency(prop.price, prop.currency)}${prop.price_suffix || ''}</div>
      <div class="features">${(prop.features_array||[]).slice(0,3).map(f=>`<span class='feature'><i class='fas ${f.icon}'></i> ${f.text}</span>`).join('')}</div>
      <span class="tag tag-${(prop.tag||'').toLowerCase()}">${prop.tag||''}</span>
    </div>
  </div>`;
}

function renderPagination() {
  const total = Math.ceil(filtered.length / perPage);
  if (total <= 1) { pagination.innerHTML = ''; return; }
  let html = '';
  html += `<span class="${currentPage===1?'disabled':''}" onclick="goPage(${currentPage-1})">&laquo; Prev</span>`;
  for (let i=1; i<=total; i++) {
    html += `<span class="${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</span>`;
  }
  html += `<span class="${currentPage===total?'disabled':''}" onclick="goPage(${currentPage+1})">Next &raquo;</span>`;
  pagination.innerHTML = html;
}

window.goPage = function(page) {
  const total = Math.ceil(filtered.length / perPage);
  if (page < 1 || page > total || page === currentPage) return;
  currentPage = page;
  render();
};

function populateFilters() {
  // Types
  const types = [...new Set(allProperties.map(p=>p.category))];
  filterType.innerHTML = '<option value="">All Types</option>' + types.map(t=>`<option>${t}</option>`).join('');
  // Locations
  const locs = [...new Set(allProperties.map(p=>p.location))];
  filterLocation.innerHTML = '<option value="">All Locations</option>' + locs.map(l=>`<option>${l}</option>`).join('');
}

function applyFilters() {
  const t = filterType.value;
  const l = filterLocation.value;
  filtered = allProperties.filter(p =>
    (!t || p.category === t) && (!l || p.location === l)
  );
  currentPage = 1;
  applySort();
}

function applySort() {
  const s = sortSelect.value;
  if (s === 'price-asc') filtered.sort((a,b)=>a.price-b.price);
  else if (s === 'price-desc') filtered.sort((a,b)=>b.price-a.price);
  else if (s === 'title-az') filtered.sort((a,b)=>a.title.localeCompare(b.title));
  else if (s === 'title-za') filtered.sort((a,b)=>b.title.localeCompare(a.title));
  render();
}

sortSelect.addEventListener('change', applySort);
filterType.addEventListener('change', applyFilters);
filterLocation.addEventListener('change', applyFilters);

document.addEventListener('DOMContentLoaded', fetchProperties);
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.book-now-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const propertyId = this.getAttribute('data-property-id');
      if (propertyId) {
        window.location.href = `booking.html?propertyId=${propertyId}`;
      } else {
        alert('Property ID missing!');
      }
    });
  });
});