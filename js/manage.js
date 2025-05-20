// js/manage.js
console.log("Manage JS Initialized - XAMPP/MySQL Mode");

// Assume API_BASE_URL is defined globally from script.js or define it here if script.js is not loaded
// const API_BASE_URL = 'api';

document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('auth-overlay');
    const adminContent = document.querySelector('.admin-content');
    const passwordInput = document.getElementById('admin-password');
    const authSubmit = document.getElementById('auth-submit');
    const authError = document.getElementById('auth-error');
    const adminLogoutBtn = document.getElementById('admin-logout');

    const propertyListTbody = document.getElementById('property-list-tbody');
    const addPropertyBtn = document.getElementById('add-property-btn');
    const propertyModal = document.getElementById('property-modal'); // Ensure this is a <dialog> element
    const propertyForm = document.getElementById('property-form');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const propertyIdInput = document.getElementById('property-id'); // Hidden input for ID

    let propertiesDataCache = [];

    // Use global makeApiCall if available from script.js
    const callAdminApi = typeof makeApiCall === 'function' ? makeApiCall : async (endpoint, options = {}) => {
        // Basic local fallback for makeApiCall if script.js isn't loaded first on this page
        if (!options.credentials) options.credentials = 'include';
        const resp = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        if (!resp.ok) { let errD={message:`HTTP Error ${resp.status}`}; try{errD=await resp.json();}catch(e){} throw new Error(errD.message||errD.error||`HTTP Error ${resp.status}`);}
        try { return await resp.json(); } catch (e) { if(resp.status===204||resp.headers.get("content-length")==="0")return{success:true}; throw new Error("Invalid JSON");}
    };
    const localFormatCurrency = (typeof formatCurrency === 'function') ? formatCurrency :
        (amount, currency = 'NPR') => { /* ... fallback definition ... */
            const n = Number(amount); if (isNaN(n)) return `${currency} N/A`;
            return `${currency} ${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        };


    async function checkAdminSession() {
        // In a real app, this calls a backend PHP script to check $_SESSION['is_admin']
        // For this demo, we'll use sessionStorage, but it's not secure.
        if (sessionStorage.getItem('prata_admin_auth_status') === 'authenticated') {
            authOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            loadPropertiesFromServer();
        } else {
            authOverlay.style.display = 'flex';
            adminContent.style.display = 'none';
        }
    }

    authSubmit.addEventListener('click', async () => {
        const enteredPassword = passwordInput.value;
        authError.style.display = 'none';
        // Replace with actual API call to admin_login.php
        // For this example, insecure direct password check
        if (enteredPassword === 'admin123') { // VERY INSECURE - REPLACE WITH API CALL
            sessionStorage.setItem('prata_admin_auth_status', 'authenticated');
            await checkAdminSession(); // Will hide overlay and load properties
        } else {
            authError.textContent = "Incorrect admin password.";
            authError.style.display = 'block';
        }
    });

    adminLogoutBtn.addEventListener('click', async () => {
        sessionStorage.removeItem('prata_admin_auth_status');
        // await callAdminApi('admin_logout.php', { method: 'POST' }); // Call backend logout
        await checkAdminSession(); // Will show overlay
        if(propertyListTbody) propertyListTbody.innerHTML = '<tr><td colspan="6">Please log in to manage properties.</td></tr>';
    });

    const displayProperties = (properties) => { /* ... keep implementation, adjust image path prefix ... */
        propertyListTbody.innerHTML = '';
        if (!properties || properties.length === 0) { propertyListTbody.innerHTML = '<tr><td colspan="6">No properties.</td></tr>'; return; }
        properties.forEach(prop => {
            const row = document.createElement('tr');
            // Image path needs to be relative to the root of your website, not the api folder
            const imageSrc = prop.imageURL || prop.image_url_1 || 'images/placeholder.png';
            row.innerHTML = `
                <td>${prop.id}</td>
                <td><img src="${imageSrc.startsWith('http') ? imageSrc : '../'+imageSrc}" alt="${prop.title}" class="thumbnail"></td>
                <td>${prop.title || 'N/A'}</td><td>${prop.location || 'N/A'}</td>
                <td>${localFormatCurrency(prop.price, prop.currency)}${prop.price_suffix || prop.priceSuffix || ''}</td>
                <td class="actions"><button class="btn-edit" data-id="${prop.id}"><i class="fas fa-edit"></i> Edit</button><button class="btn-delete" data-id="${prop.id}"><i class="fas fa-trash"></i> Delete</button></td>`;
            propertyListTbody.appendChild(row);
        });
    };

    const loadPropertiesFromServer = async () => { /* ... uses callAdminApi ... */
        propertyListTbody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
        try {
            propertiesDataCache = await callAdminApi('admin_get_all_properties.php'); // Create this PHP endpoint
            displayProperties(propertiesDataCache);
        } catch (error) { console.error("Error loading properties:", error); propertyListTbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error: ${error.message}</td></tr>`;}
    };

    const openPropertyModal = (property = null) => { /* ... keep implementation, ensure form field IDs match HTML ... */
        propertyForm.reset();
        if (property) {
            modalTitle.textContent = 'Edit Property'; propertyIdInput.value = property.id;
            document.getElementById('property-title').value = property.title || '';
            document.getElementById('property-description').value = property.description || '';
            document.getElementById('property-location').value = property.location || '';
            document.getElementById('property-category').value = property.category || ''; // Assuming select element
            document.getElementById('property-price').value = property.price || '';
            document.getElementById('property-currency').value = property.currency || 'NPR';
            document.getElementById('property-priceSuffix').value = property.price_suffix || property.priceSuffix || '/mo';
            document.getElementById('property-bedrooms').value = property.bedrooms || '';
            document.getElementById('property-bathrooms').value = property.bathrooms || '';
            document.getElementById('property-area').value = property.area || '';
            document.getElementById('property-main-image-url').value = property.imageURL || property.image_url_1 || ''; // For displaying current, file input is separate
            document.getElementById('property-gallery-urls').value = Array.isArray(property.image_urls_array) ? property.image_urls_array.join('\n') : ''; // Textarea for multiple URLs
            document.getElementById('property-features-json').value = Array.isArray(property.features_array) ? JSON.stringify(property.features_array, null, 2) : '[]'; // Textarea for JSON
            document.getElementById('property-map-image-url').value = property.map_image_url || '';
            document.getElementById('property-tag').value = property.tag || '';
        } else { modalTitle.textContent = 'Add New Property'; propertyIdInput.value = ''; }
        if (propertyModal.showModal) propertyModal.showModal(); else propertyModal.style.display = 'block';
    };

    addPropertyBtn.addEventListener('click', () => openPropertyModal());
    cancelModalBtn.addEventListener('click', () => { if (propertyModal.close) propertyModal.close(); else propertyModal.style.display = 'none'; });

    propertyListTbody.addEventListener('click', (e) => { /* ... keep edit/delete click logic ... */
        const editBtn = e.target.closest('.btn-edit'); const delBtn = e.target.closest('.btn-delete');
        if(editBtn){ const id = parseInt(editBtn.dataset.id); const prop = propertiesDataCache.find(p=>p.id===id); if(prop) openPropertyModal(prop); }
        else if(delBtn){ const id = parseInt(delBtn.dataset.id); if(confirm(`Delete property ID ${id}?`)) deletePropertyFromServer(id); }
    });

    propertyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(propertyForm); // This will collect all fields, including file input if added
        const propertyId = formData.get('id'); // From hidden input
        const submitButton = propertyForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true; submitButton.textContent = propertyId ? 'Updating...' : 'Adding...';

        // Prepare features_array and image_urls_array from textareas if needed by PHP
        const featuresJsonString = document.getElementById('property-features-json').value;
        const galleryUrlsString = document.getElementById('property-gallery-urls').value;
        formData.set('features_array_json', featuresJsonString); // Send as string, PHP will decode/re-encode
        formData.set('image_urls_array_string', galleryUrlsString); // Send as string, PHP will parse

        try {
            const endpoint = propertyId ? `admin_update_property.php` : `admin_add_property.php`;
            const result = await callAdminApi(endpoint, { method: 'POST', body: formData });
            if (result.success) {
                alert(result.message);
                loadPropertiesFromServer();
                if (propertyModal.close) propertyModal.close(); else propertyModal.style.display = 'none';
            } else { throw new Error(result.message || "Operation failed."); }
        } catch (error) { console.error("Error submitting property:", error.message); alert(`Error: ${error.message}`); }
        finally { submitButton.disabled = false; submitButton.textContent = originalButtonText; }
    });

    async function deletePropertyFromServer(propertyId) { /* ... uses callAdminApi ... */
        try {
            const result = await callAdminApi('admin_delete_property.php', {
                method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id:propertyId})
            });
            if (result.success) { alert(result.message); loadPropertiesFromServer(); }
            else { throw new Error(result.message || "Delete failed."); }
        } catch (error) { console.error("Error deleting:", error.message); alert(`Error: ${error.message}`);}
    }

    checkAdminSession(); // Initial check
});