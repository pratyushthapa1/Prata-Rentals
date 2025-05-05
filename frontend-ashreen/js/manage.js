document.addEventListener('DOMContentLoaded', () => {
    // --- Basic Authentication (NOT SECURE) ---
    const authOverlay = document.getElementById('auth-overlay');
    const adminContent = document.querySelector('.admin-content');
    const passwordInput = document.getElementById('admin-password');
    const authSubmit = document.getElementById('auth-submit');
    const authError = document.getElementById('auth-error');
    const adminLogout = document.getElementById('admin-logout');

    const CORRECT_PASSWORD = 'admin'; // CHANGE THIS! Keep it simple for demo.

    authSubmit.addEventListener('click', () => {
        if (passwordInput.value === CORRECT_PASSWORD) {
            authOverlay.style.display = 'none';
            adminContent.style.display = 'block';
            loadProperties(); // Load data only after successful auth
        } else {
            authError.style.display = 'block';
        }
    });

    adminLogout.addEventListener('click', () => {
        // Simulate logout by showing the overlay again
        passwordInput.value = '';
        authError.style.display = 'none';
        authOverlay.style.display = 'flex'; // Use flex to center
        adminContent.style.display = 'none';
        // In a real app, you'd clear tokens/session data
    });

    // --- Property Management ---
    const propertyListTbody = document.getElementById('property-list-tbody');
    const addPropertyBtn = document.getElementById('add-property-btn');
    const propertyModal = document.getElementById('property-modal');
    const propertyForm = document.getElementById('property-form');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const propertyIdInput = document.getElementById('property-id');

    let propertiesData = []; // Holds the loaded properties

    // Function to format currency (reuse or adapt)
    const formatCurrency = (amount) => {
        if (isNaN(amount)) return 'N/A';
        return `NPR ${Number(amount).toLocaleString('en-NP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Function to display properties in the table
    const displayProperties = (properties) => {
        propertyListTbody.innerHTML = ''; // Clear existing rows
        if (!properties || properties.length === 0) {
            propertyListTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No properties found.</td></tr>';
            return;
        }

        properties.forEach(prop => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prop.id}</td>
                <td><img src="${prop.image || 'images/placeholder.png'}" alt="${prop.title}" class="thumbnail"></td>
                <td>${prop.title || 'N/A'}</td>
                <td>${prop.location || 'N/A'}</td>
                <td>${formatCurrency(prop.price)}${prop.priceSuffix || ''}</td>
                <td class="actions">
                    <button class="btn-edit" data-id="${prop.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-delete" data-id="${prop.id}"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            propertyListTbody.appendChild(row);
        });
    };

    // Function to load properties from JSON
    const loadProperties = async () => {
        try {
            const response = await fetch('properties.json'); // Ensure this path is correct
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            propertiesData = await response.json();
            displayProperties(propertiesData);
        } catch (error) {
            console.error("Error loading properties:", error);
            propertyListTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Error loading properties: ${error.message}</td></tr>`;
        }
    };

    // Function to open the Add/Edit modal
    const openPropertyModal = (property = null) => {
        propertyForm.reset(); // Clear the form
        if (property) {
            // Editing existing property
            modalTitle.textContent = 'Edit Property';
            propertyIdInput.value = property.id;
            // Populate form fields
            document.getElementById('property-title').value = property.title || '';
            document.getElementById('property-location').value = property.location || '';
            document.getElementById('property-price').value = property.price || '';
            document.getElementById('property-priceSuffix').value = property.priceSuffix || '/mo';
            document.getElementById('property-image').value = property.image || '';
            document.getElementById('property-tag').value = property.tag || '';
            document.getElementById('property-description').value = property.description || '';
            // Handle features (assuming JSON string or simple text)
            try {
                 document.getElementById('property-features').value = Array.isArray(property.features) ? JSON.stringify(property.features, null, 2) : property.features || '';
            } catch {
                document.getElementById('property-features').value = property.features || ''; // Fallback if stringify fails
            }
             // Handle gallery (assuming array or comma-separated)
             document.getElementById('property-gallery').value = Array.isArray(property.gallery) ? property.gallery.join(',') : property.gallery || '';
             document.getElementById('property-mapLink').value = property.mapLink || '';

        } else {
            // Adding new property
            modalTitle.textContent = 'Add New Property';
            propertyIdInput.value = ''; // Ensure ID is empty for 'add'
        }
        propertyModal.showModal(); // Show the dialog
    };

    // --- Event Listeners ---

    // Open modal to Add Property
    addPropertyBtn.addEventListener('click', () => {
        openPropertyModal();
    });

    // Cancel button in modal
    cancelModalBtn.addEventListener('click', () => {
        propertyModal.close();
    });

    // Handle clicks within the property list (for Edit/Delete) - Event Delegation
    propertyListTbody.addEventListener('click', (e) => {
        const target = e.target;
        const editButton = target.closest('.btn-edit');
        const deleteButton = target.closest('.btn-delete');

        if (editButton) {
            const propertyId = parseInt(editButton.dataset.id, 10);
            const propertyToEdit = propertiesData.find(p => p.id === propertyId);
            if (propertyToEdit) {
                openPropertyModal(propertyToEdit);
            }
        } else if (deleteButton) {
            const propertyId = parseInt(deleteButton.dataset.id, 10);
            if (confirm(`Are you sure you want to delete property ID ${propertyId}? This action cannot be undone (simulation).`)) {
                // Simulate deletion by filtering the array
                propertiesData = propertiesData.filter(p => p.id !== propertyId);
                displayProperties(propertiesData); // Re-render the table
                alert(`Property ID ${propertyId} deleted (simulated).`);
                 // In a real app, send DELETE request to backend here.
            }
        }
    });

    // Handle form submission (Add/Edit)
    propertyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(propertyForm);
        const property = Object.fromEntries(formData.entries());
        const id = parseInt(property.id, 10); // Get ID from hidden input

        // Basic conversion/cleanup
        property.price = parseFloat(property.price) || 0;
        // Attempt to parse features JSON, fallback to string
         try {
            const featuresInput = property.features.trim();
            if(featuresInput.startsWith('[')) { // Basic check for JSON array
                 property.features = JSON.parse(featuresInput);
            } else if (featuresInput){ // Treat as comma-separated if not JSON array
                property.features = featuresInput.split(',').map(f => ({ text: f.trim() })); // Simple conversion
            } else {
                property.features = [];
            }
         } catch (error) {
             console.warn("Could not parse features JSON, treating as text:", error);
             // Keep as string or split simple text
             property.features = property.features ? property.features.split(',').map(f => ({ text: f.trim() })) : [];
         }
        // Convert gallery string to array
        property.gallery = property.gallery ? property.gallery.split(',').map(url => url.trim()) : [];


        if (!isNaN(id) && id > 0) {
            // --- Simulate Update ---
            const index = propertiesData.findIndex(p => p.id === id);
            if (index !== -1) {
                propertiesData[index] = { ...propertiesData[index], ...property }; // Merge changes
                alert(`Property ID ${id} updated (simulated).`);
                 // In a real app, send PUT/PATCH request to backend here.
            }
        } else {
            // --- Simulate Add ---
            property.id = Date.now(); // Generate a temporary unique ID
            propertiesData.push(property);
            alert(`New property added with temporary ID ${property.id} (simulated).`);
             // In a real app, send POST request to backend here.
        }

        displayProperties(propertiesData); // Re-render the table
        propertyModal.close(); // Close the modal
    });

    // Initial check: If password was already entered (e.g., page refresh), skip auth overlay
    // This uses sessionStorage, cleared when browser tab closes. Use localStorage for persistence.
    // if (sessionStorage.getItem('prata_admin_auth') === 'true') {
    //     authOverlay.style.display = 'none';
    //     adminContent.style.display = 'block';
    //     loadProperties();
    // }


}); // End DOMContentLoaded