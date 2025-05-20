// js/booking.js
console.log("Booking JS Initialized - XAMPP/MySQL Mode");
const API_BASE_URL = "php";
// Assume API_BASE_URL, formatCurrency, formatReadableDate, calculateNights
// are globally available from script.js (script.js MUST be loaded first).

document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('booking-form');
    const paymentModal = document.getElementById('payment-modal');
    if (!bookingForm || !paymentModal) {
        console.error("Essential elements for booking page are missing. Script cannot run.");
        return;
    }

    // --- DOM Element Selection (ensure these IDs exist in booking.html) ---
    const proceedToPaymentBtn = document.getElementById('proceed-to-payment-btn');
    const closeModalBtn = paymentModal.querySelector('.modal-close-btn');
    const confirmPaymentBtn = document.getElementById('confirm-payment-btn');
    const paymentProcessingMsg = document.getElementById('payment-processing-msg');
    const paymentErrorMsg = document.getElementById('payment-error-msg');
    const propertyIdInput = document.getElementById('booking-property-id');
    const propertyImageElem = document.getElementById('booking-property-image');
    const propertyTitleElem = document.getElementById('booking-property-title');
    const baseRateDisplayElem = document.getElementById('base-rate-display');
    const baseRateValueInput = document.getElementById('base-rate-value');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
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
    const cardNumberInput = document.getElementById('card-number');
    const expiryDateInput = document.getElementById('expiry-date');
    const cvvInput = document.getElementById('cvv');
    const cardNameInput = document.getElementById('card-name');

    let propertyDataForBooking = null;
    let pricePerUnit = 0;
    let rateType = 'night';
    const SERVICE_FEE_PERCENTAGE = 0.05;
    const VAT_PERCENTAGE = 0.13;

    // Use global helper functions if available, otherwise define local fallbacks
    const localFormatDate = (typeof formatReadableDate === 'function') ? formatReadableDate : (dStr) => dStr || '--';
    const localFormatCurrency = (typeof formatCurrency === 'function') ? formatCurrency : (amt, cur = 'NPR') => `${cur} ${amt || 'N/A'}`;
    const localCalculateDuration = (typeof calculateDuration === 'function') ? calculateDuration : (s, e) => {
        if (!s || !e) return { nights: 0, months: 0, display: 'N/A' };
        const n = Math.ceil((new Date(e) - new Date(s)) / 864e5);
        return { nights: n > 0 ? n : 0, months: Math.floor(n / 30), display: `${n > 0 ? n : 0} night(s)` };
    };
     const callApi = typeof makeApiCall === 'function' ? makeApiCall : async (endpoint, options = {}) => {
        if (!options.credentials) options.credentials = 'include';
        const resp = await fetch(`${API_BASE_URL}/${endpoint}`, options);
        if (!resp.ok) { let errD = {message: `HTTP Error ${resp.status}`}; try {errD = await resp.json();} catch(e){} throw new Error(errD.message || errD.error || `HTTP Error ${resp.status}`);}
        try { return await resp.json(); } catch (e) { if (resp.status === 204 || resp.headers.get("content-length") === "0") return {success:true}; throw new Error("Invalid JSON");}
    };


    const calculateRentalCost = (startStr, endStr) => { /* ... keep implementation, use localFormatCurrency ... */
        if (!propertyDataForBooking || !startStr || !endStr) return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Select dates' };
        const { nights, months } = localCalculateDuration(startStr, endStr); let base = 0; let calcText = '';
        if (nights <= 0) return { base: 0, serviceFee: 0, taxes: 0, total: 0, calcText: 'Invalid dates' };
        if (rateType === 'month') { const cM = Math.max(1, months); base = cM * pricePerUnit; calcText = `${localFormatCurrency(pricePerUnit, propertyDataForBooking.currency)}/mo x ${cM} month${cM!==1?'s':''}`; }
        else { base = nights * pricePerUnit; calcText = `${localFormatCurrency(pricePerUnit, propertyDataForBooking.currency)}/night x ${nights} night${nights!==1?'s':''}`; }
        const sF = base * SERVICE_FEE_PERCENTAGE; const tX = (base + sF) * VAT_PERCENTAGE; const total = base + sF + tX;
        return { base, serviceFee: sF, taxes: tX, total, calcText };
    };
    const updateSummary = () => { /* ... keep implementation, use localFormat... and propertyDataForBooking.currency ... */
        if (!propertyDataForBooking || !bookingForm) return;
        const startStr = startDateInput?.value; const endStr = endDateInput?.value;
        const duration = localCalculateDuration(startStr, endStr); const cost = calculateRentalCost(startStr, endStr);
        if(summaryStartDateElem) summaryStartDateElem.textContent = localFormatDate(startStr); if(summaryEndDateElem) summaryEndDateElem.textContent = localFormatDate(endStr);
        if(summaryDurationElem) summaryDurationElem.textContent = duration.display; if(priceCalcTextElem) priceCalcTextElem.textContent = cost.calcText;
        if(summaryBasePriceElem) summaryBasePriceElem.textContent = localFormatCurrency(cost.base, propertyDataForBooking.currency);
        if(summaryTaxesElem) summaryTaxesElem.textContent = localFormatCurrency(cost.serviceFee + cost.taxes, propertyDataForBooking.currency);
        if(summaryTotalPriceElem) summaryTotalPriceElem.textContent = localFormatCurrency(cost.total, propertyDataForBooking.currency);
        const adults = parseInt(adultsInput?.value||'1',10); const children = parseInt(childrenInput?.value||'0',10); const pets = parseInt(petsInput?.value||'0',10);
        let occStr = `${adults} Adult${adults!==1?'s':''}`; if(children>0)occStr+=`, ${children} Child${children!==1?'ren':''}`; if(pets>0)occStr+=`, ${pets} Pet${pets!==1?'s':''}`;
        if(summaryOccupantsElem)summaryOccupantsElem.textContent=occStr;
        if(startDateInput && endDateInput){endDateInput.min = startStr ? new Date(new Date(startStr).getTime()+864e5).toISOString().split('T')[0]:''; const iVED = !(startStr&&endStr&&new Date(endStr)<=new Date(startStr)); endDateInput.setCustomValidity(iVED?'':'End date must be after start date.'); startDateInput.setCustomValidity(startStr?'':'Start date is required.')}
    };
    const populateStaticPropertyDetails = () => { /* ... keep implementation ... */
        if(!propertyDataForBooking){if(propertyTitleElem)propertyTitleElem.textContent="Error Loading Property";return}
        if(propertyIdInput)propertyIdInput.value=propertyDataForBooking.id;
        if(propertyImageElem){propertyImageElem.src=propertyDataForBooking.imageURL||propertyDataForBooking.image_url_1||'images/placeholder.png';propertyImageElem.alt=propertyDataForBooking.title||'Property Thumbnail'}
        if(propertyTitleElem)propertyTitleElem.textContent=propertyDataForBooking.title||'Selected Property';
        pricePerUnit=parseFloat(propertyDataForBooking.price)||0;rateType=(propertyDataForBooking.price_suffix||propertyDataForBooking.priceSuffix)?.toLowerCase()==='/mo'?'month':'night';
        if(baseRateDisplayElem)baseRateDisplayElem.textContent=`${localFormatCurrency(pricePerUnit,propertyDataForBooking.currency)} ${rateType==='month'?'/ month':'/ night'}`;
        if(baseRateValueInput)baseRateValueInput.value=pricePerUnit;updateSummary()
    };
    const openPaymentModal = () => { /* ... keep implementation ... */ if(paymentModal){paymentModal.style.display='flex';setTimeout(()=>{paymentModal.classList.add('active')},10);if(paymentErrorMsg)paymentErrorMsg.textContent='';if(paymentErrorMsg)paymentErrorMsg.style.display='none';if(confirmPaymentBtn)confirmPaymentBtn.disabled=false;if(paymentProcessingMsg)paymentProcessingMsg.style.display='none';cardNumberInput?.focus()}};
    const closePaymentModal = () => { /* ... keep implementation ... */ if(paymentModal){paymentModal.classList.remove('active');const hTE=()=>{paymentModal.style.display='none';paymentModal.removeEventListener('transitionend',hTE)};paymentModal.addEventListener('transitionend',hTE);setTimeout(()=>{if(!paymentModal.classList.contains('active'))paymentModal.style.display='none'},400)}};

    guestCounters.forEach(button => { /* ... keep implementation ... */ button.addEventListener('click',()=>{const a=button.dataset.action;const t=button.dataset.target;const s=document.getElementById(t);const i=document.getElementById(t.replace('-count','-input'));if(!s||!i)return;const c=parseInt(i.value,10);const o=i.id==='adults-input';let n=c;if(a==='increment')n++;else if(a==='decrement')n--;if((o&&n<1)||(!o&&n<0))return;s.textContent=n;i.value=n;const d=button.parentElement?.querySelector('[data-action="decrement"]');if(d)d.disabled=(o&&n<=1)||(!o&&n<=0);updateSummary()})});
    if(startDateInput)startDateInput.addEventListener('input',updateSummary); if(endDateInput)endDateInput.addEventListener('input',updateSummary);
    if(startDateInput)startDateInput.addEventListener('change',updateSummary); if(endDateInput)endDateInput.addEventListener('change',updateSummary);
    if (expiryDateInput) { /* ... keep expiry format and blur validation ... */
        expiryDateInput.addEventListener('input',(e)=>{let v=e.target.value.replace(/[^\d]/g,'');let fV=v;if(v.length>2)fV=v.substring(0,2)+' / '+v.substring(2,4);if(e.target.value!==fV){let cP=e.target.selectionStart;e.target.value=fV;if(cP&&fV.length>=cP){if(e.target.value.length>fV.length&&cP>2)cP++;if(e.target.value.length<fV.length&&cP>3)cP--;try{e.target.setSelectionRange(cP,cP)}catch(err){}}}});
        expiryDateInput.addEventListener('blur',e=>{const p=/^(0[1-9]|1[0-2]) \/ (\d{2})$/;if(!p.test(e.target.value)&&e.target.value.length>0)e.target.setCustomValidity("MM / YY");else e.target.setCustomValidity("");e.target.reportValidity()});
    }
    proceedToPaymentBtn?.addEventListener('click', (e) => { /* ... keep main form validation ... */
        e.preventDefault(); bookingForm.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid')); let valid=true;
        const mainFields=bookingForm.querySelectorAll('section:not(.payment-info) [required], .date-selection input, .guest-info input[type="hidden"]');
        mainFields.forEach(i=>{if(!i.checkValidity()){i.classList.add('is-invalid');if(i.type==='hidden')i.closest('.guest-item')?.classList.add('is-invalid');valid=false}});
        const{nights}=localCalculateDuration(startDateInput?.value,endDateInput?.value);if(nights<=0){if(startDateInput)startDateInput.classList.add('is-invalid');if(endDateInput)endDateInput.classList.add('is-invalid');valid=false}
        if(valid)openPaymentModal();else{const inv=bookingForm.querySelector('.is-invalid,:invalid');inv?.scrollIntoView({behavior:'smooth',block:'center'});inv?.focus();alert("Please correct rental details.")}
    });
    closeModalBtn?.addEventListener('click',closePaymentModal); paymentModal?.addEventListener('click',(event)=>{if(event.target===paymentModal)closePaymentModal();});

    confirmPaymentBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!propertyDataForBooking) { alert("Error: Property data missing."); return; }
        if(paymentErrorMsg) paymentErrorMsg.style.display = 'none'; paymentModal.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid'));
        let isPaymentValid = true;
        const paymentMethod = bookingForm.querySelector('input[name="payment_method"]:checked')?.value;
        // Only validate fields for the selected payment method
        if (paymentMethod === 'card') {
            [cardNumberInput, expiryDateInput, cvvInput, cardNameInput].forEach(i => {
                if(i && !i.checkValidity()){i.classList.add('is-invalid');isPaymentValid=false;}
            });
            // ... expiry date validation as before ...
        } else if (paymentMethod === 'esewa') {
            const esewaId = document.getElementById('esewa-id');
            if (!esewaId.value) { esewaId.classList.add('is-invalid'); isPaymentValid = false; }
        } else if (paymentMethod === 'khalti') {
            const khaltiId = document.getElementById('khalti-id');
            if (!khaltiId.value) { khaltiId.classList.add('is-invalid'); isPaymentValid = false; }
        }
        if(!isPaymentValid){
            if(paymentErrorMsg){paymentErrorMsg.textContent='Correct payment details.';paymentErrorMsg.style.display='block'}
            const iPV=paymentModal.querySelector('.is-invalid');iPV?.focus();iPV?.scrollIntoView({behavior:'smooth',block:'center'});return;
        }

        confirmPaymentBtn.disabled = true; if(paymentProcessingMsg) paymentProcessingMsg.style.display = 'block';
        const finalBookingData = new FormData(bookingForm);
        const cost = calculateRentalCost(startDateInput?.value, endDateInput?.value);
        finalBookingData.append('property_id', propertyDataForBooking.id); // Ensure this matches PHP $_POST
        finalBookingData.append('property_title', propertyDataForBooking.title);
        finalBookingData.append('total_amount', cost.total.toFixed(2)); // Send as number string
        finalBookingData.append('currency', propertyDataForBooking.currency || 'NPR');
        // Add payment nonce if using a real gateway, for now, skip sending raw card details
        // finalBookingData.append('payment_method_nonce', 'mock_nonce_from_gateway');

        try {
            const result = await callApi('submit_booking_request.php', { method: 'POST', body: finalBookingData });
            if (result.success) {
                sessionStorage.setItem('prata_bookingDetails', JSON.stringify({ // Changed key for consistency
                    title: propertyDataForBooking.title,
                    checkin: localFormatDate(finalBookingData.get('start_date')),
                    checkout: localFormatDate(finalBookingData.get('end_date')),
                    nights: localCalculateDuration(finalBookingData.get('start_date'), finalBookingData.get('end_date')).nights, // Store nights
                    guests: summaryOccupantsElem?.textContent || '',
                    totalPrice: summaryTotalPriceElem?.textContent || 'N/A',
                    bookingId: result.bookingId || null
                }));
                window.location.href = 'booking-confirmation.html';
            } else { throw new Error(result.message || "Booking submission failed."); }
        } catch (error) {
            console.error('Error submitting booking:', error.message);
            if(paymentErrorMsg) { paymentErrorMsg.textContent = `Submission Failed: ${error.message}`; paymentErrorMsg.style.display = 'block';}
        } finally { confirmPaymentBtn.disabled = false; if(paymentProcessingMsg) paymentProcessingMsg.style.display = 'none'; }
    });

    const initializeBookingPage = async () => {
        const params = new URLSearchParams(window.location.search);
        const propertyIdParam = params.get('propertyId');
        if (!propertyIdParam) {
            // Hide the booking form and show the property selection dropdown if available
            bookingForm.style.display = 'none';
            const propertySelectSection = document.getElementById('property-select-section');
            if (propertySelectSection) {
                propertySelectSection.style.display = '';
            }
            return;
        }
        const propertyId = parseInt(propertyIdParam, 10);
        if (isNaN(propertyId)) { bookingForm.innerHTML = '<p>Error: Invalid Property ID.</p>'; return; }

        try {
            propertyDataForBooking = await callApi(`get_property_details.php?id=${propertyId}`);
            if (!propertyDataForBooking || !propertyDataForBooking.id) throw new Error(`Property ID ${propertyId} not found or invalid API response.`);
            const propertyIdDisplayElem = document.getElementById('booking-property-id-display');
            if(propertyIdDisplayElem && propertyDataForBooking.id) {
                propertyIdDisplayElem.textContent = propertyDataForBooking.id;
            }
            populateStaticPropertyDetails();
            if (startDateInput) startDateInput.min = new Date().toISOString().split('T')[0];
            document.querySelectorAll('.guest-counter').forEach(c=>{const i=c.querySelector('input[type="hidden"]');const d=c.querySelector('[data-action="decrement"]');if(i&&d){const o=i.id==='adults-input';const v=parseInt(i.value,10);d.disabled=(o&&v<=1)||(!o&&v<=0)}});
        } catch (error) {
            console.error("Error initializing booking page:", error.message);
            const hE=document.querySelector('.booking-header');const cE=document.querySelector('.booking-content');
            if(hE)hE.innerHTML=`<h1>Error Loading Booking</h1><p style="color:red;">${error.message}</p>`;if(cE)cE.style.display='none';
        }
    };
    initializeBookingPage();
});

document.getElementById('confirm-payment-btn').addEventListener('click', async function() {
    const form = document.getElementById('booking-form');
    const formData = new FormData(form);
    // Optionally, add extra validation here
    const payload = {};
    formData.forEach((value, key) => { payload[key] = value; });
    // Show processing message
    document.getElementById('payment-processing-msg').style.display = 'block';
    document.getElementById('payment-error-msg').style.display = 'none';
    try {
        const res = await fetch('php/submit_booking.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            window.location.href = 'booking-confirmation.html';
        } else {
            document.getElementById('payment-error-msg').textContent = data.message || 'Booking failed.';
            document.getElementById('payment-error-msg').style.display = 'block';
        }
    } catch (e) {
        document.getElementById('payment-error-msg').textContent = 'Network or server error.';
        document.getElementById('payment-error-msg').style.display = 'block';
    }
    document.getElementById('payment-processing-msg').style.display = 'none';
});

document.querySelectorAll('input[name="payment_method"]').forEach(el => {
  el.addEventListener('change', function() {
    document.getElementById('card-payment-fields').style.display = this.value === 'card' ? '' : 'none';
    document.getElementById('esewa-payment-fields').style.display = this.value === 'esewa' ? '' : 'none';
    document.getElementById('khalti-payment-fields').style.display = this.value === 'khalti' ? '' : 'none';
  });
});