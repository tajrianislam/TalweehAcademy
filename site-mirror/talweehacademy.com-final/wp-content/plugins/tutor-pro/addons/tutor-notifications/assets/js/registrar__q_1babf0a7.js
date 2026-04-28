(()=>{"use strict";var t={};// The module cache
var r={};// The require function
function n(e){// Check if module is in cache
var o=r[e];if(o!==undefined){return o.exports}// Create a new module (and put it into the cache)
var i=r[e]={exports:{}};// Execute the module function
t[e](i,i.exports,n);// Return the exports of the module
return i.exports}// webpack/runtime/rspack_version
(()=>{n.rv=()=>"1.6.5"})();// webpack/runtime/rspack_unique_id
(()=>{n.ruid="bundler=rspack@1.6.5"})();window.jQuery(document).ready(function(t){var{__,_x:r,_n:n,_nx:e}=wp.i18n;if(!("serviceWorker"in navigator)){console.warn("Service Worker not supported");return}function o(t,r,n){var e=new Date;e.setTime(e.getTime()+n*24*60*60*1e3);var o="expires="+e.toUTCString();document.cookie=t+"="+r+";"+o+";path="+window._tutorobject.base_path}function i(t){var r=t+"=";var n=document.cookie.split(";");for(var e=0;e<n.length;e++){var o=n[e];while(o.charAt(0)==" "){o=o.substring(1)}if(o.indexOf(r)==0){return o.substring(r.length,o.length)}}return""}function a(t){var r="=".repeat((4-t.length%4)%4);// eslint-disable-next-line
var n=(t+r).replace(/\-/g,"+").replace(/_/g,"/");var e=window.atob(n);var o=new Uint8Array(e.length);for(var i=0;i<e.length;++i){o[i]=e.charCodeAt(i)}return o}function u(t,r,n){navigator.serviceWorker.ready.then(function(e){// Check if supports PN.
if(!e.pushManager){o("tutor_pn_dont_ask","yes",365);alert(__("This browser does not support push notification","tutor-pro"));return}// Try to get existing subscription.
e.pushManager.getSubscription().then(function(o){if(o===null){// Create new subscription
e.pushManager.subscribe({applicationServerKey:t,userVisibleOnly:true}).then(function(t){setTimeout(function(){if(navigator.userAgent.indexOf("Mac OS X")&&r){alert(__("Thanks! Please make sure browser notification is enbled in notification settings.","tutor-pro"))}},1);n(t,e,true)}).catch(function(t){console.warn(Notification.permission!=="granted"?"PN Permission denied":"PN subscription error")})}else{// Use existing subscription
n(o,e)}})}).catch(function(t){console.error("Service Worker error",t)})}function s(r){// Request push notification permission
u(a(window._tutorobject.tutor_pn_vapid_key),r,function(r,n,e){// Set the current user id for this browser
n.active.postMessage(JSON.stringify({client_id:window._tutorobject.tutor_pn_client_id,browser_key:i("tutor_pn_browser_key")}));if(window._tutorobject.tutor_pn_client_id==0||!e&&window._tutorobject.tutor_pn_subscription_saved=="yes"){return}t.ajax({url:window._tutorobject.ajaxurl,type:"POST",async:true,data:{action:"tutor_pn_save_subscription",subscription:JSON.stringify(r)}})})}// Register service worker
navigator.serviceWorker.register(window._tutorobject.home_url+"/tutor-push-notification.js").then(function(r){if(Notification.permission=="denied"){return}if(!window._tutorobject.tutor_pn_vapid_key){console.warn("Vapid key could not be generated.");return}if(Notification.permission=="granted"){s();return}var n=t("#tutor-pn-permission");if(n.length&&window._tutorobject.tutor_pn_client_id>0&&!i("tutor_pn_dont_ask")){// Show the toast first
n.show().css({"display":"block"}).animate({"bottom":"0px"},1e3);// Enabale handler
n.find("#tutor-pn-enable").click(function(){s(true)});// Don't ask handler
n.find("#tutor-pn-dont-ask").click(function(){o("tutor_pn_dont_ask","yes",365)});// Hide toast on all actions ultimately
n.find("#tutor-pn-enable, #tutor-pn-close, #tutor-pn-dont-ask").click(function(){n.hide()})}}).catch(function(t){console.warn("Tutor PN Service Worker registration failed",t)})})})();