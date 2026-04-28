(()=>{"use strict";var t={};// The module cache
var r={};// The require function
function e(o){// Check if module is in cache
var n=r[o];if(n!==undefined){return n.exports}// Create a new module (and put it into the cache)
var a=r[o]={exports:{}};// Execute the module function
t[o](a,a.exports,e);// Return the exports of the module
return a.exports}// webpack/runtime/rspack_version
(()=>{e.rv=()=>"1.6.5"})();// webpack/runtime/rspack_unique_id
(()=>{e.ruid="bundler=rspack@1.6.5"})();// CONCATENATED MODULE: ./node_modules/@swc/helpers/esm/_async_to_generator.js
function o(t,r,e,o,n,a,i){try{var u=t[a](i);var c=u.value}catch(t){e(t);return}if(u.done)r(c);else Promise.resolve(c).then(o,n)}function n(t){return function(){var r=this,e=arguments;return new Promise(function(n,a){var i=t.apply(r,e);function u(t){o(i,n,a,u,c,"next",t)}function c(t){o(i,n,a,u,c,"throw",t)}u(undefined)})}};// CONCATENATED MODULE: ./assets/lib/tutor-formdata.js
/**
 * Creates FormData object from array of data objects
 * @deprecated This function is deprecated and will be removed in a future version
 * @param {Array} data - Array of objects to convert to FormData
 * @returns {FormData} FormData object with nonce data included
 */function a(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:[];var r=new FormData;t.forEach(t=>{for(var[e,o]of Object.entries(t)){r.set(e,o)}});r.set(window.tutor_get_nonce_data(true).key,window.tutor_get_nonce_data(true).value);return r}/* export default */const i=a;// CONCATENATED MODULE: ./assets/react/lib/ajax-handler.js
function u(t){return n(function*(){try{var r=yield fetch(window._tutorobject.ajaxurl,{method:"POST",body:t});return r}catch(t){tutor_toast(__("Operation failed","tutor-pro"),t,"error")}})()};// CONCATENATED MODULE: ./addons/social-login/assets/react/scripts.js
/**
 * Social Login Scripts
 * 
 * @since 2.1.9
 */window.addEventListener("DOMContentLoaded",function(){var{__}=wp.i18n;var{is_enabled_google_login:t,google_client_id:r}=tutorProSocialLogin;var e=__("Something went wrong, please try again","tutor-pro");// Google authentication
var o=document.getElementById("tutor-pro-social-authentication");var a=document.getElementById("tutor-pro-google-authentication");var c=document.querySelector("form input[name=tutor_action]");var l=document.querySelector("form input[name=redirect_to]");var s="tutor_user_login";if(c){s=c.value}if(o){if(t){// Initialize google auth
google.accounts.id.initialize({client_id:r,callback:d});// Render button
google.accounts.id.renderButton(a,{theme:"outline",size:"large",width:"100%"});/**
             * Handle response after user consent
             */function d(t){return n(function*(){var r=_(t.credential);// Prepare form data
var o=[{action:"tutor_pro_social_authentication"},{auth:"google"},{token:t.credential},{first_name:r.given_name},{last_name:r.family_name},{user_login:r.name.replace(" ","_")},{email:r.email},{auth_user_id:r.sub},{auth_id_token:r.aud},{profile_url:r.picture},{attempt:s}];var n=i(o);try{tutor_toast(__("Authentication Processed","tutor-pro"),__("Please wait...","tutor-pro"),"success");var a=yield u(n);var c=yield a.json();var{success:d,data:f}=c;if(d){tutor_toast(__("Authentication success","tutor-pro"),f,"success");if(l){window.location.href=l.value}else{window.location.href=_tutorobject.tutor_frontend_dashboard_url}}else{if(Array.isArray(f)){var v=f[0];if(v&&v.code==="tutor_login_limit"){var p=document.querySelector(".tutor-login-form-wrapper");p.insertAdjacentHTML("afterbegin",'<div class="tutor-alert tutor-warning tutor-mb-12" style="display:block;">'.concat(v.message,"</div>"));return}}tutor_toast(__("Authentication failed","tutor-pro"),f,"error")}}catch(t){tutor_toast(__("Authentication failed","tutor-pro"),e,"error")}})()}}/**
         * Decode JWT response
         *
         * @param {*} token encoded token
         * @returns  object
         */function _(t){var r=t.split(".")[1];var e=r.replace(/-/g,"+").replace(/_/g,"/");var o=decodeURIComponent(atob(e).split("").map(function(t){return"%"+("00"+t.charCodeAt(0).toString(16)).slice(-2)}).join(""));return JSON.parse(o)};}})})();