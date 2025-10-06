// Main JavaScript for Cat Supplies Store

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Auto-dismiss alerts
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Image Preview for File Upload
function previewImage(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById('imagePreview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Format Currency
function formatCurrency(amount) {
    return '฿' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '// Main,');
}

// Confirm Delete
function confirmDelete(message) {
    return confirm(message || 'Are you sure you want to delete this item?');
}

// Loading Spinner
function showLoading() {
    const loadingHtml = `
        <div class="loading-overlay" id="loadingOverlay">
            <div class="spinner-border text-light" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

// Toast Notification
function showToast(message, type = 'success') {
    const toastHtml = `
        <div class="position-fixed top-0 end-0 p-3" style="z-index: 11">
            <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.querySelector('.toast:last-child');
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Remove after hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.parentElement.remove();
    });
}

// Form Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{9,10}$/;
    return re.test(phone.replace(/[-\s]/g, ''));
}

// Add to Cart with Animation
function addToCartAnimation(button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    
    setTimeout(function() {
        button.innerHTML = '<i class="fas fa-check"></i> Added!';
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
        
        setTimeout(function() {
            button.innerHTML = originalText;
            button.classList.remove('btn-success');
            button.classList.add('btn-primary');
            button.disabled = false;
        }, 2000);
    }, 1000);
}

// Update Cart Count
function updateCartCount() {
    fetch('/api/cart/count')
        .then(response => response.json())
        .then(data => {
            const cartBadge = document.getElementById('cartCount');
            if (cartBadge) {
                cartBadge.textContent = data.count;
            }
        })
        .catch(error => console.error('Error updating cart count:', error));
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search with Autocomplete
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keyup', debounce(function(e) {
        const query = e.target.value;
        if (query.length >= 3) {
            fetch(`/api/search?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    // Display autocomplete results
                    console.log('Search results:', data);
                })
                .catch(error => console.error('Search error:', error));
        }
    }, 300));
}

// Print Receipt
function printReceipt() {
    window.print();
}

// Export to CSV
function exportToCSV(data, filename) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Copy to Clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showToast('Copied to clipboard!', 'success');
    }, function(err) {
        showToast('Failed to copy', 'danger');
    });
}

// Number Input Increment/Decrement
document.querySelectorAll('.number-input').forEach(function(input) {
    const minusBtn = input.previousElementSibling;
    const plusBtn = input.nextElementSibling;
    
    if (minusBtn) {
        minusBtn.addEventListener('click', function() {
            let value = parseInt(input.value) || 0;
            const min = parseInt(input.min) || 0;
            if (value > min) {
                input.value = value - 1;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
    
    if (plusBtn) {
        plusBtn.addEventListener('click', function() {
            let value = parseInt(input.value) || 0;
            const max = parseInt(input.max) || Infinity;
            if (value < max) {
                input.value = value + 1;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
});

// Image Lazy Loading
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img.lazy').forEach(img => {
        imageObserver.observe(img);
    });
}

// Back to Top Button
const backToTopButton = document.getElementById('backToTop');
if (backToTopButton) {
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });

    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Form Submit with AJAX
function submitFormAjax(formId, successCallback, errorCallback) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        showLoading();
        
        const formData = new FormData(form);
        
        fetch(form.action, {
            method: form.method,
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                if (successCallback) successCallback(data);
                showToast(data.message || 'Success!', 'success');
            } else {
                if (errorCallback) errorCallback(data);
                showToast(data.message || 'Error occurred', 'danger');
            }
        })
        .catch(error => {
            hideLoading();
            if (errorCallback) errorCallback(error);
            showToast('Network error occurred', 'danger');
        });
    });
}

// Auto-save Form (Draft)
function enableAutoSave(formId, storageKey) {
    const form = document.getElementById(formId);
    if (!form) return;

    // Load saved data
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        const data = JSON.parse(savedData);
        Object.keys(data).forEach(key => {
            const input = form.elements[key];
            if (input) input.value = data[key];
        });
    }

    // Save on change
    form.addEventListener('change', debounce(function() {
        const formData = {};
        Array.from(form.elements).forEach(element => {
            if (element.name) {
                formData[element.name] = element.value;
            }
        });
        localStorage.setItem(storageKey, JSON.stringify(formData));
    }, 1000));

    // Clear on submit
    form.addEventListener('submit', function() {
        localStorage.removeItem(storageKey);
    });
}

// Console Log (Development Only)
if (window.location.hostname === 'localhost') {
    console.log('%c🐱 Cat Supplies Store', 'color: #0d6efd; font-size: 20px; font-weight: bold;');
    console.log('%cDevelopment Mode', 'color: #28a745; font-size: 14px;');
}

// Global Error Handler
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    if (window.location.hostname === 'localhost') {
        showToast('An error occurred. Check console for details.', 'danger');
    }
});

// Service Worker Registration (Optional for PWA)
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.log('ServiceWorker registration failed'));
    });
}

// Export functions for use in other scripts
window.catStore = {
    showLoading,
    hideLoading,
    showToast,
    formatCurrency,
    confirmDelete,
    copyToClipboard,
    exportToCSV,
    validateEmail,
    validatePhone,
    addToCartAnimation,
    updateCartCount
};