/* globals jQuery:true, security_ninja_coupon:true */
/**
 * Security Ninja - WooCommerce Blocks Coupon Protection
 * 
 * This script provides client-side coupon protection for WooCommerce blocks
 */

(function($) {
    'use strict';

    // Check if user is banned from server-side data
    function checkIfBanned() {
        const isBanned = typeof security_ninja_coupon !== 'undefined' && (
            security_ninja_coupon.is_banned === true || 
            security_ninja_coupon.is_banned === "1" || 
            security_ninja_coupon.is_banned === 1
        );
        return isBanned;
    }

    // Function to show ban message
    function showBanMessage() {
        const message = typeof security_ninja_coupon !== 'undefined' ? security_ninja_coupon.ban_message : 'Coupon application is temporarily disabled due to too many invalid attempts. Please wait before trying again.';
        
        // Try to show error in WooCommerce blocks format
        if (typeof wc_add_to_cart_params !== 'undefined') {
            // Use WooCommerce notice system
            $(document.body).trigger('added_to_cart', [null, null, null, message]);
        } else {
            // Fallback to alert
            alert(message);
        }
    }

    // Function to disable coupon forms
    function disableCouponForms() {
        // Disable traditional coupon inputs
        const traditionalInputs = $('input[name="coupon_code"], .coupon-code-input');
        traditionalInputs.prop('disabled', true);
        
        // Disable traditional coupon buttons
        const traditionalButtons = $('.woocommerce-apply-coupon, .apply-coupon');
        traditionalButtons.prop('disabled', true);
        
        // Disable blocks coupon inputs and buttons
        const blockInputs = $('[data-block-name="woocommerce/cart-order-summary-coupon-form-block"] input, [data-block-name="woocommerce/checkout-order-summary-coupon-form-block"] input');
        blockInputs.prop('disabled', true);
        
        const blockButtons = $('[data-block-name="woocommerce/cart-order-summary-coupon-form-block"] button, [data-block-name="woocommerce/checkout-order-summary-coupon-form-block"] button');
        blockButtons.prop('disabled', true);
        
        // Replace coupon form content with ban message
        const blocks = $('[data-block-name="woocommerce/cart-order-summary-coupon-form-block"], [data-block-name="woocommerce/checkout-order-summary-coupon-form-block"]');
        
        blocks.each(function() {
            const $block = $(this);
            
            if (!$block.hasClass('security-ninja-banned')) {
                $block.addClass('security-ninja-banned');
                const banMessage = typeof security_ninja_coupon !== 'undefined' ? security_ninja_coupon.ban_message : 'Coupon application is temporarily disabled due to too many invalid attempts. Please wait before trying again.';
                $block.html('<div class="woocommerce-info">' + banMessage + '</div>');
            }
        });
        
        // Also try to target any coupon-related elements with broader selectors
        const allCouponInputs = $('input[placeholder*="coupon"], input[placeholder*="Coupon"], input[name*="coupon"]');
        allCouponInputs.prop('disabled', true);
        
        const allCouponButtons = $('button[value*="coupon"], button:contains("Apply"), button:contains("Coupon")');
        allCouponButtons.prop('disabled', true);
    }

    // Check for existing ban on page load
    $(document).ready(function() {
        if (checkIfBanned()) {
            disableCouponForms();
            showBanMessage();
        }
        
        // Also check periodically for dynamically loaded blocks
        setInterval(function() {
            if (checkIfBanned()) {
                const newBlocks = $('[data-block-name*="coupon-form"]:not(.security-ninja-banned)');
                if (newBlocks.length > 0) {
                    disableCouponForms();
                }
            }
        }, 1000); // Check every second
    });

    // Intercept traditional coupon form submissions
    $(document).on('submit', 'form.woocommerce-coupon-form, .woocommerce-coupon-form form', function(e) {
        if (checkIfBanned()) {
            e.preventDefault();
            showBanMessage();
            return false;
        }
    });

    // Intercept traditional AJAX coupon requests
    $(document).on('click', '.woocommerce-apply-coupon, .apply-coupon', function(e) {
        if (checkIfBanned()) {
            e.preventDefault();
            showBanMessage();
            return false;
        }
    });

    // Monitor for coupon code input in traditional forms
    $(document).on('input', 'input[name="coupon_code"], .coupon-code-input', function(e) {
        if (checkIfBanned()) {
            $(this).val('').prop('disabled', true);
            showBanMessage();
        }
    });

    // Intercept blocks coupon form submissions
    $(document).on('submit', '[data-block-name="woocommerce/cart-order-summary-coupon-form-block"] form, [data-block-name="woocommerce/checkout-order-summary-coupon-form-block"] form', function(e) {
        if (checkIfBanned()) {
            e.preventDefault();
            showBanMessage();
            return false;
        }
    });

    // Intercept blocks coupon button clicks
    $(document).on('click', '[data-block-name="woocommerce/cart-order-summary-coupon-form-block"] button, [data-block-name="woocommerce/checkout-order-summary-coupon-form-block"] button', function(e) {
        if (checkIfBanned()) {
            e.preventDefault();
            showBanMessage();
            return false;
        }
    });

    // Monitor for coupon code input in blocks
    $(document).on('input', '[data-block-name="woocommerce/cart-order-summary-coupon-form-block"] input, [data-block-name="woocommerce/checkout-order-summary-coupon-form-block"] input', function(e) {
        if (checkIfBanned()) {
            $(this).val('').prop('disabled', true);
            showBanMessage();
        }
    });

    // Intercept WooCommerce blocks AJAX requests
    $(document).on('woocommerce_cart_coupon_errors', function(e, errors) {
        if (checkIfBanned()) {
            showBanMessage();
            return false;
        }
    });

    // Intercept fetch requests for coupon validation
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        
        // Check if this is a coupon-related request
        if (typeof url === 'string' && (
            url.includes('coupons') || 
            url.includes('cart') || 
            url.includes('checkout') ||
            url.includes('apply_coupon')
        )) {
            if (checkIfBanned()) {
                return Promise.reject(new Error('Too many invalid coupon attempts. Please wait before trying again.'));
            }
        }
        
        return originalFetch.apply(this, args);
    };

    // Monitor for dynamic content changes (for blocks that load after page load)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && checkIfBanned()) {
                // Check if new coupon forms were added
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        const $node = $(node);
                        if ($node.is('[data-block-name*="coupon-form"]') || $node.find('[data-block-name*="coupon-form"]').length) {
                            disableCouponForms();
                        }
                    }
                });
            }
        });
    });

    // Start observing
    if (checkIfBanned()) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Also add a more aggressive approach - replace any coupon-related content
    function replaceAllCouponContent() {
        if (!checkIfBanned()) return;
        
        // Find all elements that might contain coupon forms
        const couponContainers = $('[data-block-name*="coupon"], .coupon, [class*="coupon"], [id*="coupon"]');
        couponContainers.each(function() {
            const $container = $(this);
            if (!$container.hasClass('security-ninja-banned')) {
                $container.addClass('security-ninja-banned');
                const banMessage = typeof security_ninja_coupon !== 'undefined' ? security_ninja_coupon.ban_message : 'Coupon application is temporarily disabled due to too many invalid attempts. Please wait before trying again.';
                $container.html('<div class="woocommerce-info">' + banMessage + '</div>');
            }
        });
    }
    
    // Run the aggressive replacement periodically
    if (checkIfBanned()) {
        setInterval(replaceAllCouponContent, 2000); // Check every 2 seconds
    }

})(jQuery); 