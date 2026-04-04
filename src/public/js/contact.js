// Client-side JavaScript for contact form enhancement using async/await pattern
document.addEventListener('DOMContentLoaded', async function() {
    const contactForm = document.getElementById('contact-form');
    const submitButton = document.querySelector('.btn[type="submit"]');
    const originalButtonText = submitButton.textContent.trim();
    const emailInput = document.getElementById('email');

    // Track validation state
    let isEmailValid = false;

    /**
     * Show loading state on submit button
     */
    function setLoadingState(isLoading) {
        if (isLoading) {
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
        } else {
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
        }
    }

    /**
     * Display message to user
     */
    function showMessage(message, isError = false) {
        // Remove existing message
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message ${isError ? 'error' : 'success'}`;
        messageDiv.textContent = message;

        // Insert message before the form
        contactForm.parentNode.insertBefore(messageDiv, contactForm);

        // Scroll to message
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Auto-hide success messages after 5 seconds
        if (!isError) {
            setTimeout(() => {
                messageDiv.style.transition = 'opacity 0.5s';
                messageDiv.style.opacity = '0';
                setTimeout(() => messageDiv.remove(), 500);
            }, 5000);
        }
    }

    /**
     * Validate email format using async/await
     */
    async function validateEmail(email) {
        // Simulate async operation (can be removed if not needed)
        await new Promise(resolve => setTimeout(resolve, 300));

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Real-time email validation with debouncing
     */
    let validationTimeout;
    emailInput.addEventListener('input', async function() {
        clearTimeout(validationTimeout);

        const email = this.value;

        if (email.length === 0) {
            this.style.borderColor = '';
            isEmailValid = false;
            return;
        }

        // Debounce validation (wait for user to stop typing)
        validationTimeout = setTimeout(async () => {
            try {
                const valid = await validateEmail(email);
                isEmailValid = valid;
                this.style.borderColor = valid ? '#28a745' : '#dc3545';
            } catch (error) {
                console.error('Validation error:', error);
                this.style.borderColor = '#dc3545';
                isEmailValid = false;
            }
        }, 500);
    });

    /**
     * Form submission handler using async/await
     */
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name').trim(),
            email: formData.get('email').trim(),
            message: formData.get('message').trim()
        };

        // Client-side validation
        if (!data.name || !data.email || !data.message) {
            showMessage('Please fill in all fields.', true);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            showMessage('Please enter a valid email address.', true);
            return;
        }

        try {
            setLoadingState(true);

            // Send AJAX request using async/await
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage(result.message);
                contactForm.reset();
                emailInput.style.borderColor = '';
                isEmailValid = false;
            } else {
                showMessage(result.message, true);
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            showMessage('Network error. Please check your connection and try again.', true);

        } finally {
            setLoadingState(false);
        }
    });

    console.log('✅ Contact form initialized with async/await pattern');
});
