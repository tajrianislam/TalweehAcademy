(()=>{"use strict";var t={};// The module cache
var r={};// The require function
function e(o){// Check if module is in cache
var a=r[o];if(a!==undefined){return a.exports}// Create a new module (and put it into the cache)
var n=r[o]={exports:{}};// Execute the module function
t[o](n,n.exports,e);// Return the exports of the module
return n.exports}// webpack/runtime/rspack_version
(()=>{e.rv=()=>"1.6.5"})();// webpack/runtime/rspack_unique_id
(()=>{e.ruid="bundler=rspack@1.6.5"})();// CONCATENATED MODULE: ./node_modules/@swc/helpers/esm/_async_to_generator.js
function o(t,r,e,o,a,n,i){try{var u=t[n](i);var s=u.value}catch(t){e(t);return}if(u.done)r(s);else Promise.resolve(s).then(o,a)}function a(t){return function(){var r=this,e=arguments;return new Promise(function(a,n){var i=t.apply(r,e);function u(t){o(i,a,n,u,s,"next",t)}function s(t){o(i,a,n,u,s,"throw",t)}u(undefined)})}};// CONCATENATED MODULE: ./assets/react/lib/ajax-handler.js
function n(t){return a(function*(){try{var r=yield fetch(window._tutorobject.ajaxurl,{method:"POST",body:t});return r}catch(t){tutor_toast(__("Operation failed","tutor-pro"),t,"error")}})()};// CONCATENATED MODULE: ./assets/react/utils.js
/**
 * Converts a local date to GMT (Greenwich Mean Time).
 * 
 * @param {Date} date - The local date to convert to GMT
 * @param {string} [dateFormat='yyyy-MM-dd HH:mm:ss'] - The format string for the output date
 * @returns {string} The formatted GMT date string
 * 
 * @since v3.8.0
 */var i=function(t){var r=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"yyyy-MM-dd HH:mm:ss";var e=t.getTimezoneOffset();var o=addMinutes(t,e);return format(o,r)};/**
 * Converts a GMT date to local date based on the user's timezone.
 * 
 * @param {string|Date} date - The GMT date to convert to local time
 * @returns {Date} The converted local date object
 * 
 * @since v3.8.0
 */var u=t=>{var r=new Date(t);var e=r.getTimezoneOffset();return addMinutes(r,-e)};/**
 * Validates if a string is a valid email address format.
 * 
 * @param {string} email - The email string to validate
 * @returns {boolean} True if the email format is valid, false otherwise
 * 
 * @since v3.8.1
 */var s=t=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);/**
 * Creates a FormData object from a data object and automatically adds security nonce.
 * 
 * @param {Object} [data={}] - The data object to convert to FormData
 * @returns {FormData} A FormData object with the provided data and security nonce
 * 
 * @example
 * const formData = tutorFormData({
 *   action: 'save_lesson_note',
 *   lesson_id: 123,
 *   note_text: 'My note content'
 * });
 * 
 * @since v3.9.0
 */function d(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};var r=new FormData;Object.keys(t).forEach(e=>r.set(e,t[e]));r.set(window.tutor_get_nonce_data(true).key,window.tutor_get_nonce_data(true).value);return r}/**
 * Handles AJAX requests to the WordPress admin-ajax.php endpoint.
 * 
 * @param {FormData} formData - The FormData object containing the request data
 * @returns {Promise<Response|undefined>} The fetch Response object, or undefined if an error occurs
 * 
 * @example
 * const formData = tutorFormData({ action: 'get_lesson_data', lesson_id: 123 });
 * const response = await ajaxHandler(formData);
 * const data = await response.json();
 * 
 * @since v3.9.0
 */function c(t){return _async_to_generator(function*(){try{var r=yield fetch(window._tutorobject.ajaxurl,{method:"POST",body:t});return r}catch(t){tutor_toast(__("Operation failed","tutor-pro"),t,"error")}})()};// CONCATENATED MODULE: ./addons/auth/assets/react/change-email.js
/**
 * Handle email change request from frontend dashboard.
 *
 * @since 3.8.2
 */var l=document.getElementById("tutor-change-email-modal");if(l){l.addEventListener("submit",t=>a(function*(){var{__}=wp.i18n;t.preventDefault();var r=l.querySelector('button[type="submit"]');var e=new FormData(t.target);var o=e.get("new_email");var a=e.get("new_email_confirmation");if(!s(o)){tutor_toast(__("Sorry","tutor-pro"),__("Please enter a valid email","tutor-pro"),"error");return}if(o!==a){tutor_toast(__("Sorry","tutor-pro"),__("New email and confirm new email do not match","tutor-pro"),"error");return}r.disabled=true;r.classList.add("is-loading");try{var i=yield n(e);var u=yield i.json();if(i.ok){tutor_toast(__("Success","tutor-pro"),u.message,"success");setTimeout(()=>window.location.reload(true),1e3)}else{tutor_toast(__("Failed","tutor-pro"),u.message,"error")}}catch(t){tutor_toast(__("Failed","tutor-pro"),t.message,"error")}finally{r.disabled=false;r.classList.remove("is-loading")}})())}})();