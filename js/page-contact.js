// js/page-contact.js
import { makeApiCall } from './utils.js';

export function initContactPage() {
    const contactPageForm = document.getElementById('contact-form');
    if (!contactPageForm) return;

    console.log("Contact page: Initializing form...");
    const contactParams = new URLSearchParams(window.location.search);
    const contactSubjectFromUrl = contactParams.get('subject');
    const contactPropertyId = contactParams.get('propertyId');

    const contactSubjectLineEl = document.getElementById('contact-subject-line');
    const contactSubjectInputEl = document.getElementById('contact-subject');
    const contactMessageTextarea = document.getElementById('contact-message');

    let finalSubject = contactSubjectFromUrl || "General Inquiry";

    if (contactPropertyId) {
        finalSubject = `Inquiry about Property ID: ${contactPropertyId}`;
        if (contactMessageTextarea) {
            contactMessageTextarea.placeholder = `Please enter your message regarding property ID ${contactPropertyId}...`;
        }
    }

    if (contactSubjectLineEl) contactSubjectLineEl.textContent = `Regarding: ${finalSubject}`;
    if (contactSubjectInputEl) contactSubjectInputEl.value = finalSubject;


    contactPageForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!contactPageForm.checkValidity()) {
            contactPageForm.reportValidity();
            return;
        }

        const submitButton = contactPageForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        const formData = new FormData(contactPageForm);

        try {
            const result = await makeApiCall('submit_contact_message.php', { method: 'POST', body: formData });
            if (result.success) {
                // Show popup/modal instead of redirect
                showContactSuccessModal(result.message || 'Your message has been sent successfully!');
            } else {
                throw new Error(result.message || "Failed to send message. Please try again.");
            }
        } catch (error) {
            console.error('Error sending contact message:', error.message);
            alert(`Error: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}


function showContactSuccessModal(message) {
    let modal = document.getElementById('contact-success-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'contact-success-modal';
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">
                <div style="background:#fff;padding:32px 24px;border-radius:12px;max-width:90vw;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,0.2);">
                    <i class='fas fa-check-circle' style='font-size:48px;color:green;margin-bottom:20px;'></i>
                    <h2>Thank You!</h2>
                    <p>${message}</p>
                    <button id="close-contact-success-modal" style="margin-top:20px;padding:8px 24px;font-size:16px;">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('close-contact-success-modal').onclick = function() {
            modal.remove();
        };
    }
}
