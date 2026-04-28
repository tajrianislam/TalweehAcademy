(()=>{"use strict";var t={};// The module cache
var e={};// The require function
function o(r){// Check if module is in cache
var n=e[r];if(n!==undefined){return n.exports}// Create a new module (and put it into the cache)
var i=e[r]={exports:{}};// Execute the module function
t[r](i,i.exports,o);// Return the exports of the module
return i.exports}// webpack/runtime/rspack_version
(()=>{o.rv=()=>"1.6.5"})();// webpack/runtime/rspack_unique_id
(()=>{o.ruid="bundler=rspack@1.6.5"})();// CONCATENATED MODULE: ./node_modules/@swc/helpers/esm/_async_to_generator.js
function r(t,e,o,r,n,i,a){try{var s=t[i](a);var l=s.value}catch(t){o(t);return}if(s.done)e(l);else Promise.resolve(l).then(r,n)}function n(t){return function(){var e=this,o=arguments;return new Promise(function(n,i){var a=t.apply(e,o);function s(t){r(a,n,i,s,l,"next",t)}function l(t){r(a,n,i,s,l,"throw",t)}s(undefined)})}};// CONCATENATED MODULE: ./assets/react/simple-highlighter.js
/**
 * SimpleHighlighter class for handling text highlighting functionality in lesson content.
 * 
 * This class provides methods to highlight selected text, restore highlights from stored data,
 * and manage highlight positioning and fingerprinting for accurate restoration.
 * 
 * @class SimpleHighlighter
 * @since v3.9.0
 */class i{/**
     * Highlights the currently selected text in the content
     * 
     * Creates a highlight object with position data, fingerprint, and metadata,
     * then applies the visual highlight to the DOM.
     * 
     * @returns {Object|undefined} The highlight data object if successful, undefined if no valid selection
     * @since v3.9.0
     */highlightSelection(){var t=window.getSelection();if(!t.rangeCount||t.isCollapsed)return;var e=t.getRangeAt(0);if(!this.content.contains(e.commonAncestorContainer))return;var o=e.toString();var r=this.getAbsolutePosition(e.startContainer,e.startOffset);var n=this.getAbsolutePosition(e.endContainer,e.endOffset);// Create highlight data
var i={id:this.getRandomInt(1,500),text:o===null||o===void 0?void 0:o.trim(),// text: selectedText?.trim().replace(/\u00A0/g, ' '),
startPos:r,endPos:n,color:this.currentColor,fingerprint:this.createFingerprint(o,r),timestamp:Date.now()};// Apply visual highlight
this.extractedHighlight(e);return i}/**
     * Applies visual highlighting to a DOM range by wrapping it in a mark element
     * 
     * @param {Range} range - The DOM range to highlight
     * @since v3.9.0
     */extractedHighlight(t){// Check if the range spans across block elements
if(this.rangeSpansBlockElements(t)){this.applyInlineHighlight(t)}else{// Simple case - wrap the entire selection
var e=document.createElement("mark");e.className="tutor-highlighted";try{t.surroundContents(e)}catch(r){var o=t.extractContents();e.appendChild(o);t.insertNode(e)}}}/**
     * Checks if a range spans across block-level elements
     * 
     * @param {Range} range - The DOM range to check
     * @returns {boolean} True if range spans block elements
     * @since v3.9.0
     */rangeSpansBlockElements(t){var e=["P","DIV","H1","H2","H3","H4","H5","H6","LI","BLOCKQUOTE","PRE"];var o=t.startContainer;while(o&&o!==t.endContainer){if(o.nodeType===Node.ELEMENT_NODE&&e.includes(o.tagName)){return true}o=this.getNextNode(o,t.commonAncestorContainer)}return false}/**
     * Gets the next node in document order within a container
     * 
     * @param {Node} node - Current node
     * @param {Node} container - Container to stay within
     * @returns {Node|null} Next node or null if at end
     * @since v3.9.0
     */getNextNode(t,e){if(t.firstChild)return t.firstChild;while(t){if(t===e)return null;if(t.nextSibling)return t.nextSibling;t=t.parentNode}return null}/**
     * Applies inline highlighting that preserves block structure
     * 
     * @param {Range} range - The DOM range to highlight
     * @since v3.9.0
     */applyInlineHighlight(t){var e=this.getTextNodesInRange(t);e.forEach(t=>{var{node:e,startOffset:o,endOffset:r}=t;if(o>=r)return;// Create a range for this specific text portion
var n=document.createRange();n.setStart(e,o);n.setEnd(e,r);// Create wrapper and apply highlight
var i=document.createElement("mark");i.className="tutor-highlighted";try{n.surroundContents(i)}catch(t){var a=n.extractContents();i.appendChild(a);n.insertNode(i)}});// Clear the selection
window.getSelection().removeAllRanges()}/**
     * Applies inline highlighting with note data that preserves block structure
     * 
     * @param {Range} range - The DOM range to highlight
     * @param {Object} note - The note object containing highlight and note data
     * @since v3.9.0
     */applyInlineHighlightWithNote(t,e){var o=this.getTextNodesInRange(t);o.forEach((t,o)=>{var{node:r,startOffset:n,endOffset:i}=t;if(n>=i)return;// Create a range for this specific text portion
var a=document.createRange();a.setStart(r,n);a.setEnd(r,i);// Create wrapper and apply highlight with note data
this.insertMarker(a,e)})}/**
     * Removes highlighting from a DOM range by replacing the mark element with plain text
     * 
     * @param {Range} range - The DOM range to remove highlighting from
     * @since v3.9.0
     */removeHighlight(t){var e=t.startContainer.parentNode;if(e&&e.classList.contains("tutor-highlighted")){var o=document.createTextNode(t.toString());e.parentNode.replaceChild(o,e)}}/**
     * Creates a context fingerprint for duplicate text identification
     * 
     * Generates multiple fingerprints using surrounding context to help identify
     * the correct occurrence of duplicate text when restoring highlights.
     * 
     * @param {string} text - The highlighted text
     * @param {number} startPos - The absolute position where the text starts
     * @returns {Object} Object containing multiple fingerprint hashes and word context
     * @since v3.9.0
     */createFingerprint(t,e){var o=this.content.textContent;var r=50;// Increased for better matching
var n=o.substring(Math.max(0,e-r),e);var i=o.substring(e+t.length,Math.min(o.length,e+t.length+r));// Create multiple fingerprints for better matching
var a={full:this.hash(n+t+i),beforeText:this.hash(n+t),textAfter:this.hash(t+i),textOnly:this.hash(t),// Add word-boundary context
wordContext:this.getWordContext(t,e)};return a}/**
     * Creates a simple hash from a string for fingerprinting
     * 
     * @param {string} str - The string to hash
     * @returns {string} A base-36 hash of the input string
     * @since v3.9.0
     */hash(t){var e=0;for(var o=0;o<t.length;o++){var r=t.charCodeAt(o);e=(e<<5)-e+r;e=e&e}return e.toString(36)}/**
     * Gets word-level context for better matching of duplicate text
     * 
     * Analyzes the words before and after the highlighted text to create
     * a more reliable context for identifying the correct occurrence.
     * 
     * @param {string} text - The highlighted text
     * @param {number} startPos - The absolute position where the text starts
     * @returns {Object|null} Object with before/after word context and position, or null if not found
     * @since v3.9.0
     */getWordContext(t,e){var o=this.content.textContent;var r=o.split(/\s+/);var n=t.split(/\s+/);// Find the word sequence in the full text
for(var i=0;i<=r.length-n.length;i++){var a=r.slice(i,i+n.length);if(a.join(" ").includes(t.trim())){var s=r.slice(Math.max(0,i-3),i);var l=r.slice(i+n.length,i+n.length+3);return{before:s.join(" "),after:l.join(" "),position:i}}}return null}/**
     * Gets the absolute text position of a node and offset within the content
     * 
     * Walks through all text nodes to calculate the absolute character position
     * from the beginning of the content element.
     * 
     * @param {Node} node - The DOM node
     * @param {number} offset - The character offset within the node
     * @returns {number} The absolute position from the start of content
     * @since v3.9.0
     */getAbsolutePosition(t,e){var o=0;var r=document.createTreeWalker(this.content,NodeFilter.SHOW_TEXT,null);var n;while(n=r.nextNode()){if(n===t){return o+e}o+=n.textContent.length}return o}/**
     * Gets the DOM node and offset from an absolute text position
     * 
     * Converts an absolute character position back to a specific DOM node
     * and character offset within that node.
     * 
     * @param {number} position - The absolute position from the start of content
     * @returns {Object|null} Object with node and offset properties, or null if position not found
     * @since v3.9.0
     */getNodeFromPosition(t){var e=0;var o=document.createTreeWalker(this.content,NodeFilter.SHOW_TEXT,null);var r;while(r=o.nextNode()){var n=r.textContent.length;if(e+n>=t){return{node:r,offset:t-e}}e+=n}return null}/**
     * Restores a single highlight from a note object
     * 
     * Uses multiple strategies to find and restore the highlight:
     * 1. Exact position match
     * 2. Relative position from end
     * 3. Fingerprint matching
     * 
     * @param {Object} note - The note object containing highlight data
     * @returns {boolean} True if highlight was successfully restored
     * @since v3.9.0
     */restoreHighlight(t){var e=this.content.textContent;var o=t.highlight_serialized;// Strategy 1: Try exact position match (works if no content added before)
if(o.startPos<e.length&&o.endPos<=e.length&&e.substring(o.startPos,o.endPos)===o.text){if(this.applyHighlightAtPosition(o.startPos,t)){return true}}// Strategy 2: Try relative position from end (works if content added at beginning)
var r=e.length-o.startPos;var n=e.length-r;if(n>=0&&n+o.text.length<=e.length&&e.substring(n,n+o.text.length)===o.text){if(this.applyHighlightAtPosition(n,t)){return true}}// Strategy 3: Fingerprint matching
return this.restoreByFingerprint(o,t)}/**
     * Applies a highlight at a specific position in the content
     * 
     * Creates DOM ranges and applies highlighting with note metadata.
     * Handles both simple single-node and complex multi-node selections.
     * 
     * @param {number} pos - The absolute position to start highlighting
     * @param {Object} note - The note object containing highlight and note data
     * @returns {boolean} True if highlight was successfully applied
     * @since v3.9.0
     */applyHighlightAtPosition(t,e){var o=e.highlight_text;var r=this.getNodeFromPosition(t);var n=this.getNodeFromPosition(t+(o===null||o===void 0?void 0:o.length));if(r&&n){try{var i=document.createRange();i.setStart(r.node,r.offset);i.setEnd(n.node,n.offset);// Check if the range spans across block elements
if(this.rangeSpansBlockElements(i)){this.applyInlineHighlightWithNote(i,e);return true}else{// Simple case - single highlight wrapper
this.insertMarker(i,e);return true}}catch(e){console.warn("Could not apply highlight at position:",t,e);return false}}return false}/**
     * Restores a highlight using fingerprint matching
     * 
     * Finds all occurrences of the highlight text and uses fingerprint
     * comparison to identify the most likely correct occurrence.
     * 
     * @param {Object} highlight - The highlight object with fingerprint data
     * @param {Object} note - The full note object containing highlight and note data
     * @returns {boolean} True if highlight was successfully restored
     * @since v3.9.0
     */restoreByFingerprint(t,e){var o=this.content.textContent;var r=t.text;// Find all occurrences
var n=[];var i=o.indexOf(r);while(i!==-1){n.push(i);i=o.indexOf(r,i+1)}// Try different matching strategies
for(var a of n){var s=this.createFingerprint(r,a);// Try multiple matching criteria
var l=[s.full===t.fingerprint.full,s.beforeText===t.fingerprint.beforeText,s.textAfter===t.fingerprint.textAfter,this.matchWordContext(s.wordContext,t.fingerprint.wordContext)];// If any strong match is found, use it
if(l[0]||l[1]||l[2]||l[3]){if(this.applyHighlightAtPosition(a,e)){return true}}}// Last resort: use the first occurrence if no better match
if(n.length>0){// console.warn('Using fallback position for highlight:', searchText);
return this.applyHighlightAtPosition(n[0],e)}return false}/**
     * Compares word context between current and stored fingerprints
     * 
     * @param {Object} current - The current word context object
     * @param {Object} stored - The stored word context object
     * @returns {boolean} True if word contexts match
     * @since v3.9.0
     */matchWordContext(t,e){if(!t||!e)return false;return t.before===e.before&&t.after===e.after}/**
     * Applies highlighting to complex multi-node selections
     * 
     * Handles highlights that span across multiple DOM nodes by processing
     * each text node within the range and applying appropriate markup.
     * 
     * @param {Range} range - The DOM range spanning multiple nodes
     * @param {Object} note - The note object containing highlight and note data
     * @since v3.9.0
     */applyComplexHighlight(t,e){var o=e.highlight_serialized.id;// Get all text nodes that intersect with the range
var r=this.getTextNodesInRange(t);if(r.length===0)return;// Process each text node
r.forEach((o,n)=>{try{if(n==r.length-1){this.insertMarker(t,e)}}catch(t){}});// Normalize to clean up adjacent text nodes
this.content.normalize()}/**
     * InsertMarker surround selection
     *
     * @param {Object} note - The note object containing highlight and note data
     * @return  {void}
     * 
     * @since v3.9.0
     */insertMarker(t,e,o){var r=document.createElement("mark");r.className="".concat(o!==null&&o!==void 0?o:"tutor-highlighted has-note");r.dataset.noteId=e.comment_ID;r.dataset.lessonId=e.comment_post_ID;r.dataset.noteContent=e.comment_content;r.dataset.highlightText=e.highlight_text;r.dataset.highlightId=e.highlight_serialized.id;try{t.surroundContents(r)}catch(e){var n=t.extractContents();r.appendChild(n);t.insertNode(r)}}/**
     * Gets all text nodes that intersect with a given DOM range
     * 
     * Uses TreeWalker to find text nodes within the range and calculates
     * the appropriate start and end offsets for each node.
     * 
     * @param {Range} range - The DOM range to analyze
     * @returns {Array} Array of objects containing node, startOffset, and endOffset
     * @since v3.9.0
     */getTextNodesInRange(t){var e=[];var o=document.createTreeWalker(t.commonAncestorContainer,NodeFilter.SHOW_TEXT,null);var r;while(r=o.nextNode()){// Skip empty or whitespace-only text nodes
if(!r.textContent||!r.textContent.trim())continue;// Check if this text node intersects with the range
var n=document.createRange();n.selectNodeContents(r);// Skip nodes that don't intersect with our range
if(t.compareBoundaryPoints(Range.END_TO_START,n)>0||t.compareBoundaryPoints(Range.START_TO_END,n)<0){continue}// Calculate the intersection with the range
var i=0;var a=r.textContent.length;// Adjust start offset if this is the start container
if(r===t.startContainer){i=t.startOffset}else{// Check if the range starts after this node begins
try{if(t.comparePoint(r,0)>0){continue;// This node is before the range starts
}}catch(e){// comparePoint might fail in some cases, use alternative check
var s=document.createRange();s.setStart(r,0);if(t.compareBoundaryPoints(Range.START_TO_START,s)>0){continue}}}// Adjust end offset if this is the end container
if(r===t.endContainer){a=t.endOffset}else{// Check if the range ends before this node ends
try{if(t.comparePoint(r,r.textContent.length)<0){continue;// This node is after the range ends
}}catch(e){// comparePoint might fail in some cases, use alternative check
var l=document.createRange();l.setEnd(r,r.textContent.length);if(t.compareBoundaryPoints(Range.END_TO_END,l)<0){continue}}}// Only add if we have valid content to highlight
if(i<a){e.push({node:r,startOffset:i,endOffset:a})}}return e}/**
     * Generates a random integer between min and max (inclusive)
     * 
     * @param {number} min - The minimum value (inclusive)
     * @param {number} max - The maximum value (inclusive)
     * @returns {number} A random integer between min and max
     * @since v3.9.0
     */getRandomInt(t,e){t=Math.ceil(t);// Ensure min is an integer
e=Math.floor(e);// Ensure max is an integer
return Math.floor(Math.random()*(e-t+1))+t}/**
     * Constructor for SimpleHighlighter
     * 
     * @param {HTMLElement} contentElement - The DOM element containing the content to be highlighted
     * @since v3.9.0
     */constructor(t){this.content=t}}/* export default */const a=i;// CONCATENATED MODULE: ./assets/react/utils.js
/**
 * Converts a local date to GMT (Greenwich Mean Time).
 * 
 * @param {Date} date - The local date to convert to GMT
 * @param {string} [dateFormat='yyyy-MM-dd HH:mm:ss'] - The format string for the output date
 * @returns {string} The formatted GMT date string
 * 
 * @since v3.8.0
 */var s=function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"yyyy-MM-dd HH:mm:ss";var o=t.getTimezoneOffset();var r=addMinutes(t,o);return format(r,e)};/**
 * Converts a GMT date to local date based on the user's timezone.
 * 
 * @param {string|Date} date - The GMT date to convert to local time
 * @returns {Date} The converted local date object
 * 
 * @since v3.8.0
 */var l=t=>{var e=new Date(t);var o=e.getTimezoneOffset();return addMinutes(e,-o)};/**
 * Validates if a string is a valid email address format.
 * 
 * @param {string} email - The email string to validate
 * @returns {boolean} True if the email format is valid, false otherwise
 * 
 * @since v3.8.1
 */var u=t=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);/**
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
 */function d(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};var e=new FormData;Object.keys(t).forEach(o=>e.set(o,t[o]));e.set(window.tutor_get_nonce_data(true).key,window.tutor_get_nonce_data(true).value);return e}/**
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
 */function c(t){return n(function*(){try{var e=yield fetch(window._tutorobject.ajaxurl,{method:"POST",body:t});return e}catch(t){tutor_toast(__("Operation failed","tutor-pro"),t,"error")}})()};// CONCATENATED MODULE: ./assets/react/lesson-notes.js
/**
 * LessonNotes class handles all lesson note functionality including text highlighting,
 * note creation, editing, deletion, and form management.
 * 
 * @class LessonNotes
 * @since v3.9.0
 */class h{/**
     * Initialize the lesson notes functionality.
     * 
     * Sets up the default error message, initializes the lesson wrapper element,
     * creates the highlighter instance, restores existing lesson note highlights,
     * and sets up all event listeners for the notes functionality.
     * 
     * @since v3.9.0
     */init(){var /**
         * Load existing lesson notes and highlight them.
         * 
         * @since v3.9.0
         */t;var{__}=wp.i18n;this.defaultErrorMessage=__("Something went wrong, please try again","tutor-pro");// Initialize lesson wrapper element
this.lessonWrapper=document.querySelector(".tutor-lesson-wrapper");// Initialize highlighter
this.highlighter=new a(this.lessonWrapper);(t=lesson_notes)===null||t===void 0?void 0:t.forEach(t=>{if(t.type==="highlight"){var e=this.decodeUnicodeEscapes(t.highlight_text);if(!t.highlight_text){t.highlight_text=e}if(!t.highlight_serialized){t.highlight_serialized.text=e}this.highlighter.restoreHighlight(t)}});this.setupEventListeners()}/**
     * Decode Unicode Escapes
     *
    * @param {string} str - selected text
    * @returns {string} decoded string
    * 
    * @since v3.9.0
    */decodeUnicodeEscapes(t){if(!t)return"";// Step 1: Decode Unicode escape sequences like u00a0
t=t.replace(/u([0-9a-fA-F]{4})/g,(t,e)=>String.fromCharCode(parseInt(e,16)));// Step 2: Decode HTML entities (like &lt;, &nbsp;)
var e=document.createElement("textarea");e.innerHTML=t;return e.value;return t}/**
     * Get the nearest block-level ancestor of a node.
     * 
     * @param {Node} node - The DOM node to find the block ancestor for
     * @returns {HTMLElement|null} The nearest block-level ancestor or null if not found
     * 
     * @since v3.9.0
     */getBlockAncestor(t){if(!t)return null;if(t.nodeType===3)t=t.parentNode;while(t&&t!==document.body){var e=window.getComputedStyle(t).display;if(e==="block"||e==="list-item"||e==="table"){return t}t=t.parentNode}return null}/**
     * Check if a node is inside a highlighted element.
     * 
     * @param {Node} node - The DOM node to check
     * @returns {boolean} True if the node is inside a highlighted element
     * 
     * @since v3.9.0
     */isInsideHighlight(t){while(t&&t!==document.body){if(t.classList&&t.classList.contains("tutor-highlighted"))return true;t=t.parentNode}return false}/**
     * Check if the range contains any highlighted node.
     * 
     * @param {Range} range - The DOM range to check for highlighted nodes
     * @returns {boolean} True if the range contains any highlighted nodes
     * 
     * @since v3.9.0
     */containsHighlight(t){var e=document.createTreeWalker(t.commonAncestorContainer,NodeFilter.SHOW_ELEMENT,{acceptNode:function e(e){// Only check nodes fully or partially inside the range
if(!t.intersectsNode(e))return NodeFilter.FILTER_REJECT;return e.classList&&e.classList.contains("tutor-highlighted")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}},false);return e.nextNode()!==null}/**
     * Get the position of the end of the current text selection.
     * 
     * @returns {{x: number, y: number}|null} The position coordinates or null if no valid selection
     * 
     * @since v3.9.0
     */getSelectionEndPosition(){if(!this.lessonWrapper)return null;var t=window.getSelection();if(!t.rangeCount||t.isCollapsed)return null;var e=t.getRangeAt(0).cloneRange();// Ensure selection is inside the lesson wrapper
if(!this.lessonWrapper.contains(e.startContainer))return null;// Prevent new selections while modal is open
if(this.isNoteFormOpen()){t.removeAllRanges();return null}// Prevent selection if it starts/ends inside a highlight
if(this.isInsideHighlight(e.startContainer)||this.isInsideHighlight(e.endContainer)){return null}// Prevent selection if any highlighted node is inside the range
if(this.containsHighlight(e)){return null}// Ensure selection is within a single block-level element
var o=this.getBlockAncestor(e.startContainer);var r=this.getBlockAncestor(e.endContainer);if(!o||!r||o!==r){this.closeNoteForm(false);return null}// Collapse range to the end of selection
e.collapse(false);var n=e.getBoundingClientRect();if(n){return{x:n.left,y:n.bottom}}return null}/**
     * Get optimal position for the note form.
     * 
     * @param {HTMLElement} noteButton - The note button element
     * @param {HTMLElement} noteForm - The note form element
     * @returns {{top: number, left: number}} The optimal position coordinates
     * 
     * @since v3.9.0
     */getFormPosition(t,e){var o=t.getBoundingClientRect();var r=e.getBoundingClientRect();var n=window.innerWidth;var i=window.innerHeight;var a=e.classList.contains("tutor-player-fullscreen");if(a){return{top:o.top-(r.height-o.height)+2,left:o.left-(r.width-o.width)+2}}var s=o.bottom+2;var l=o.left+o.width/2;// Adjust if overflowing bottom
if(s+r.height>i){s=o.top-2-r.height}// Adjust if overflowing right
if(l+r.width>n){l=n-r.width}return{top:s,left:l}}/**
     * Get popover position.
     *
     * @param {HTMLElement} target - The element the popover is positioned relative to.
     * @param {HTMLElement} popover - The popover element to measure.
     * @param {number} [margin=5] - Space between the popover, target, and viewport edges.
     * @returns {{ top: number, left: number }}
     */getPopoverPosition(t,e){var o=arguments.length>2&&arguments[2]!==void 0?arguments[2]:5;var r=t.getBoundingClientRect();var n=e.getBoundingClientRect();var i=r.bottom+o;var a=r.left;// Adjust if popover overflows the right edge
if(a+n.width>window.innerWidth){a=window.innerWidth-n.width-o}// Adjust if popover overflows the bottom edge
if(i+n.height>window.innerHeight){i=r.top-n.height-o}// Prevent going off-screen on top/left
a=Math.max(a,o);i=Math.max(i,o);return{top:i,left:a}}/**
     * Close the note form and clear selection/highlights.
     * 
     * @param {boolean} clearSelection - Whether to clear text selection and highlights
     * 
     * @since v3.9.0
     */closeNoteForm(t){var{__}=wp.i18n;var e=document.querySelector(".tutor-lesson-note-form-wrapper:not(.tutor-d-none)");if(e){e.classList.add("tutor-d-none");var o=e.querySelector('textarea[name="note_text"]');if(o){o.value=""};var r=e.querySelector('input[name="action"]');if(r){r.value="tutor_pro_save_lesson_note"};var n=e.querySelector('input[name="note_id"]');if(n){n.value=""};var i=e.querySelector('input[name="highlight_text"]');if(i){i.value=""};var a=e.querySelector('input[name="highlight_serialized"]');if(a){a.value=""};var s=e.querySelector('input[name="video_start_time"]');if(s){s.value=""};var l=e.querySelector(".tutor-lesson-note-start-time");if(l){l.classList.add("tutor-d-none");l.textContent="00:00 -"}var u=document.querySelector(".tutor-lesson-note-form-title");if(u){u.textContent=__("Take Note","tutor-pro")}var d=e.querySelector(".tutor-lesson-notes-form-key-hint");if(d){d.parentElement.classList.add("tutor-justify-end");d.parentElement.classList.remove("tutor-justify-between");d.classList.add("tutor-d-none")}// Remove has-popover class from mark tags
var c=document.querySelectorAll(".tutor-highlighted.has-popover");c.forEach(t=>t.classList.remove("has-popover"));// Re-enable scroll on body
document.body.classList.remove("tutor-modal-open")}var h=document.getElementById("tutor-take-lesson-note-btn");if(h){h.classList.add("tutor-d-none")}if(t){var v=document.querySelector(".tutor-highlighted:not(.has-note)");if(v&&v.tagName.toLowerCase()==="mark"){var m=v.parentNode;while(v.firstChild){m.insertBefore(v.firstChild,v)}m.removeChild(v);m.normalize()}}}/**
     * Check if the note form is currently open.
     * 
     * @returns {boolean} True if the note form is currently open.
     * 
     * @since v3.9.0
     */isNoteFormOpen(){var t=document.querySelector(".tutor-lesson-note-form-wrapper");return t&&!t.classList.contains("tutor-d-none")}/**
     * Highlight lesson content based on note data.
     * 
     * @param {Object} note - The note object containing highlight data
     * @param {string} note.highlight_serialized - Serialized highlight data
     * @param {string} note.comment_ID - Note ID
     * @param {string} note.comment_post_ID - Lesson ID
     * @param {string} note.comment_content - Note content
     * @param {string} note.highlight_text - Highlighted text
     * 
     * @since v3.9.0
     */highlightLessonContent(t){var e=JSON.parse(t.highlight_serialized);this.highlighter.applyHighlightAtPosition(e.startPos,t)}setupEventListeners(){/**
         * Handle lesson notes form submission.
         * 
         * @since v3.9.0
         */document.addEventListener("submit",t=>{if(t.target&&t.target.classList.contains("tutor-lesson-notes-form")){this.handleFormSubmission(t)}});/**
         * Handle all click events for notes functionality.
         * 
         * @since v3.9.0
         */document.addEventListener("click",t=>{var e=t.target;if(e.classList.contains("tutor-read-more-less")){this.handleReadMoreLess(e)}if(e.classList.contains("tutor-edit-note-button")||e.closest(".tutor-edit-note-button")){this.handleNoteEdit(t,e)}if(e.classList.contains("tutor-cancel-edit-note-button")||e.closest(".tutor-cancel-edit-note-button")){this.handleCancelNoteEdit(t,e)}if(e.classList.contains("tutor-cancel-note-button")||e.closest(".tutor-cancel-note-button")){this.handleCancelNote(t,e)}if(e.classList.contains("tutor-delete-note-button")||e.closest(".tutor-delete-note-button")){this.handleDeleteNotePopover(t,e)}if(e.classList.contains("tutor-confirm-delete-note-button")||e.closest(".tutor-confirm-delete-note-button")){this.handleConfirmDeleteNote(t,e)}if(e.id==="tutor-take-lesson-note-btn"||e.closest("#tutor-take-lesson-note-btn")){this.handleTakeNoteButton(e)}if(e.id==="tutor-lesson-nav-take-note-btn"||e.closest("#tutor-lesson-nav-take-note-btn")){this.handleLessonNavTakeNoteButton(e)}if(e.matches(".tutor-lesson-note-list-item-video-action")||e.closest(".tutor-lesson-note-list-item-video-action")){this.handleVideoAction(e)}if(e.matches("[data-action-close]")||e.closest("[data-action-close]")){this.closeNoteForm(true)}if(e.id==="tutor-load-more-notes-button"||e.closest("#tutor-load-more-notes-button")){this.handleLoadMoreNotes(t,e)}if(e.closest(".tutor-highlighted.has-note")){this.handleHighlightedTextClick(t,e.closest(".tutor-highlighted.has-note"))}if(e.matches(".tutor-note-popover-edit-button")||e.closest(".tutor-note-popover-edit-button")){this.handleNotePopoverEdit(t,e)}});/**
         * Close the note form when clicking outside of it, unless text is selected.
         * 
         * @since v3.9.0
         */document.addEventListener("click",t=>{this.handleOutsideClick(t)});/**
         * Handle keyboard events for notes functionality.
         * 
         * @since v3.9.0
         */document.addEventListener("keydown",t=>{this.handleKeydown(t)});/**
         * Handle mouse events for notes functionality.
         * 
         * @since v3.9.0
         */document.addEventListener("mouseup",()=>{this.handleMouseup()});/**
         * Button position adjustment on scroll/resize.
         * 
         * @since v3.9.0
         */["scroll","resize"].forEach(t=>{window.addEventListener(t,()=>{this.handleScrollResize()})});/**
         * Display form action buttons when textarea is focused.
         * 
         * @since v3.9.0
         */document.addEventListener("focusin",t=>{this.handleFocusin(t)});/**
         * Display and hide the take note button in the tab based on tab change.
         * 
         * @since v3.9.0
         */document.addEventListener("tutor_tab_changed",t=>{this.handleTutorTabChanged(t)});/**
         * Handle hover events for notes functionality.
         * 
         * @since v3.9.0
         */document.addEventListener("mouseover",t=>{this.handleNoteHover(t)});/**
         * Handle hover out events for notes functionality.
         * 
         * @since v3.9.0
         */document.addEventListener("mouseout",t=>{this.handleNoteHoverOut(t)});/**
         * Add note button and form in fullscreen video
         * 
         * @since v3.9.0
         */window.addEventListener("tutorLessonPlayerReady",t=>{this.handleTutorLessonPlayerReady(t)});/**
         * Handle textarea input to show/hide key hint
         * 
         * @since v3.9.0
         */document.addEventListener("input",t=>{this.handleTextareaInput(t)})}/**
     * Handle lesson notes form submission.
     * 
     * @since v3.9.0
     */handleFormSubmission(t){return n(function*(){var{__}=wp.i18n;if(t.target&&t.target.classList.contains("tutor-lesson-notes-form")){t.preventDefault();var e=t.target;// Gather form data
var o=new FormData(e);var r=o.get("note_text");var n=o.get("lesson_id");var i=o.get("note_id");var a=o.get("highlight_text");var s=o.get("video_start_time");var l=window.tutorLessonPlayer;if(l&&typeof l.currentTime==="number"){if(e.hasAttribute("is-main-form")&&!s){o.set("video_start_time",Math.floor(l.currentTime))}o.append("video_end_time",Math.floor(l.currentTime))}if(!r){tutor_toast(__("Failed","tutor-pro"),__("Note text cannot be empty","tutor-pro"),"error");return}if(!n){tutor_toast(__("Failed","tutor-pro"),__("Invalid lesson, please try again","tutor-pro"),"error");return}var u=e.querySelector("button[type=submit]");try{u.setAttribute("disabled",true);u.classList.add("is-loading");var h=yield c(o);var{status_code:v,message:m,data:f}=yield h.json();if(v===200){tutor_toast(__("Success","tutor-pro"),m||__("Note saved successfully","tutor-pro"),"success");// Close the form
this.closeNoteForm(true);if(!i){e.reset();// Highlight selected text with note id
if(a&&f&&f.highlight_serialized){this.highlightLessonContent(f)}// Update note list with updated data
var p=document.querySelector(".tutor-lesson-note-list-wrapper");if(p){try{var g;var y=yield c(d({action:"tutor_pro_get_lesson_notes_html",lesson_id:n}));var _=yield y.json();if(_.status_code===200&&((g=_.data)===null||g===void 0?void 0:g.html)){var b;p.innerHTML=(b=_.data)===null||b===void 0?void 0:b.html}}catch(t){console.error("Failed to fetch updated notes:",t)}}}else{// Update the specific note item dynamically
var L=document.getElementById("tutor-lesson-note-list-item-".concat(i));var x=L===null||L===void 0?void 0:L.parentElement;if(x){try{var S;var E=yield c(d({action:"tutor_pro_get_single_lesson_note_html",lesson_id:n,note_id:i}));var C=yield E.json();if(C.status_code===200&&((S=C.data)===null||S===void 0?void 0:S.html)){var w;x.outerHTML=(w=C.data)===null||w===void 0?void 0:w.html}}catch(t){console.error("Failed to fetch updated note:",t)}}// Update note content in lesson overview
var N=document.querySelectorAll('mark[data-note-id="'.concat(i,'"]'));N.forEach(t=>{t.dataset.noteContent=r})}}else{tutor_toast(__("Failed","tutor-pro"),m||this.defaultErrorMessage,"error")}}catch(t){tutor_toast(__("Failed","tutor-pro"),this.defaultErrorMessage,"error")}finally{u.removeAttribute("disabled");u.classList.remove("is-loading")}}}).call(this)}/**
     * Handle read more/less functionality for notes.
     * 
     * @param {HTMLElement} target - The clicked read more/less button
     * 
     * @since v3.9.0
     */handleReadMoreLess(t){var e=t.closest(".tutor-lesson-note-list-item");if(e){var o=e.querySelector(".tutor-lesson-note-content-short");var r=e.querySelector(".tutor-lesson-note-content-long");if(o&&r){var n=!o.classList.contains("tutor-d-none");if(n){o.classList.add("tutor-d-none");r.classList.remove("tutor-d-none")}else{o.classList.remove("tutor-d-none");r.classList.add("tutor-d-none")}}}}/**
     * Handle note editing.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked edit button
     * 
     * @since v3.9.0
     */handleNoteEdit(t,e){t.preventDefault();var o=e.closest(".tutor-lesson-note-list-item");var r=o.nextElementSibling;if(r&&r.classList.contains("tutor-lesson-notes-form")){o.classList.add("tutor-d-none");r.classList.remove("tutor-d-none");// Focus textarea input.
var n=r.querySelector('textarea[name="note_text"]');if(n){var i=n.value.length;n.focus();n.setSelectionRange(i,i)}}}/**
     * Cancel note editing.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked cancel button
     * 
     * @since v3.9.0
     */handleCancelNoteEdit(t,e){t.preventDefault();var o=e.closest(".tutor-lesson-notes-form");var r=o===null||o===void 0?void 0:o.previousElementSibling;if(r&&o){var n;o.classList.add("tutor-d-none");r.classList.remove("tutor-d-none");// Reset the textarea to original note content
var i=((n=o.querySelector('input[name="note_content"]'))===null||n===void 0?void 0:n.value)||"";var a=o.querySelector('textarea[name="note_text"]');if(a){a.value=i}}}/**
     * Hide note form actions on cancel click.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked cancel button
     * 
     * @since v3.9.0
     */handleCancelNote(t,e){t.preventDefault();var o=e.closest(".tutor-lesson-notes-form");var r=o===null||o===void 0?void 0:o.querySelector(".tutor-lesson-notes-form-buttons");if(r){o.querySelector('textarea[name="note_text"]').value="";r.classList.add("tutor-d-none");var n=o.querySelector(".tutor-lesson-notes-form-key-hint");if(n){n.parentElement.classList.add("tutor-justify-end");n.parentElement.classList.remove("tutor-justify-between");n.classList.add("tutor-d-none")}}}/**
     * Open delete confirmation popover.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked delete button
     * 
     * @since v3.9.0
     */handleDeleteNotePopover(t,e){var{__}=wp.i18n;t.preventDefault();// Show a popover below the delete button
var o=e.closest(".tutor-delete-note-button")||e;var r=o===null||o===void 0?void 0:o.getAttribute("data-note-id");var n=o===null||o===void 0?void 0:o.getAttribute("data-lesson-id");if(!r){tutor_toast(__("Failed","tutor-pro"),__("Invalid note, please try again","tutor-pro"),"error");return}// Remove any existing popover
var i=document.querySelector(".tutor-delete-note-popover");if(i){i.remove()}// Create the popover
var a=document.createElement("div");a.className="tutor-delete-note-popover";a.innerHTML='\n            <div class="tutor-delete-note-popover-container">\n                <div class="tutor-delete-note-popover-top">\n                    <div class="tutor-delete-note-popover-content">\n                        <h3>'.concat(__("Delete This Note?","tutor-pro"),"</h3>\n                        <p>").concat(__("Are you sure you want to delete this note permanently?","tutor-pro"),'</p>\n                    </div>\n                    <button class="tutor-delete-note-popover-close"><i class="tutor-icon-times-o"></i></button>\n                </div>\n                <div class="tutor-delete-note-popover-buttons">\n                    <button class="tutor-btn tutor-color-subdued tutor-btn-sm tutor-cancel-delete-popover">').concat(__("Cancel","tutor-pro"),'</button>\n                    <button class="tutor-btn tutor-btn-danger tutor-btn-sm tutor-confirm-delete-note-button" data-note-id="').concat(r,'" data-lesson-id="').concat(n,'">').concat(__("Delete","tutor-pro"),"</button>\n                </div>\n            </div>\n        ");document.body.appendChild(a);var s=o.closest(".tutor-lesson-note-list-item");s===null||s===void 0?void 0:s.classList.add("is-focused");// Position popover at top-right (or top-left for RTL)
var l=document.documentElement.dir==="rtl";var u=s.getBoundingClientRect();var d=a.getBoundingClientRect();a.style.position="absolute";a.style.top="".concat(u.top+window.scrollY+5,"px");if(l){a.style.left="".concat(u.left+window.scrollX+5,"px")}else{a.style.left="".concat(u.right+window.scrollX-d.width-5,"px")}a.style.zIndex="9999";// Cancel button handler
var c=a.querySelector(".tutor-cancel-delete-popover");if(c){c.addEventListener("click",()=>{var t;a.remove();(t=o.closest(".tutor-lesson-note-list-item"))===null||t===void 0?void 0:t.classList.remove("is-focused")})}// Close button handler
var h=a.querySelector(".tutor-delete-note-popover-close");if(h){h.addEventListener("click",()=>{var t;a.remove();(t=o.closest(".tutor-lesson-note-list-item"))===null||t===void 0?void 0:t.classList.remove("is-focused")})}// Remove popover when clicking elsewhere
var v=t=>{if(!a.contains(t.target)&&t.target!==o){var e;a.remove();(e=o.closest(".tutor-lesson-note-list-item"))===null||e===void 0?void 0:e.classList.remove("is-focused");document.removeEventListener("click",v)}};setTimeout(()=>document.addEventListener("click",v),0)}/**
     * Handle note deletion confirmation.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked element
     * 
     * @since v3.9.0
     */handleConfirmDeleteNote(t,e){return n(function*(){var{__}=wp.i18n;t.preventDefault();var o=e.closest(".tutor-confirm-delete-note-button");var r=o===null||o===void 0?void 0:o.getAttribute("data-note-id");if(!r){tutor_toast(__("Failed","tutor-pro"),__("Invalid note, please try again","tutor-pro"),"error");return}try{o.setAttribute("disabled",true);o.classList.add("is-loading");var n=yield c(d({action:"tutor_pro_delete_lesson_note",note_id:r}));var{status_code:i,message:a}=yield n.json();if(i===200){tutor_toast(__("Success","tutor-pro"),a||__("Note deleted successfully","tutor-pro"),"success");// Remove any existing popover
var s=document.querySelector(".tutor-delete-note-popover");if(s){s.remove()}// Remove any existing note popover
var l=document.querySelector(".tutor-note-popover");if(l){l.remove();document.body.classList.remove("tutor-modal-open")}// Remove highlight elements associated with this note
var u=document.querySelectorAll('[data-note-id="'.concat(r,'"]'));u.forEach(t=>{if(t.tagName.toLowerCase()==="mark"){var e=t.parentNode;while(t.firstChild){e.insertBefore(t.firstChild,t)}e.removeChild(t);e.normalize()}});// Remove the note list item.
var h=document.querySelector("#tutor-lesson-note-list-item-".concat(r));if(h){h.parentElement.remove()}// Update the note list dynamically
var v=document.querySelector(".tutor-lesson-note-list-wrapper");if(v){try{var m=yield c(d({action:"tutor_pro_get_lesson_notes_html",lesson_id:o.getAttribute("data-lesson-id")}));var f=yield m.json();if(f.status_code===200){var p;v.innerHTML=((p=f.data)===null||p===void 0?void 0:p.html)||null}}catch(t){console.error("Failed to fetch updated notes:",t)}}}else{tutor_toast(__("Failed","tutor-pro"),a||this.defaultErrorMessage,"error")}}catch(t){tutor_toast(__("Failed","tutor-pro"),this.defaultErrorMessage,"error")}finally{o.removeAttribute("disabled");o.classList.remove("is-loading")}}).call(this)}/**
     * Handle take note button click.
     * 
     * @param {HTMLElement} target - The clicked take note button
     * 
     * @since v3.9.0
     */handleTakeNoteButton(t){var e=t.closest("#tutor-take-lesson-note-btn");var o=document.querySelector(".tutor-lesson-note-form-wrapper");// const highlighter = this.getHighlighter();
var r=this.highlighter.highlightSelection();if(e&&o){o.classList.remove("tutor-d-none");// Position the form intelligently
var{top:n,left:i}=this.getFormPosition(e,o);o.style.top="".concat(n,"px");o.style.left="".concat(i,"px");// Focus the textarea
var a=o.querySelector('textarea[name="note_text"]');if(a){a.focus()}// Set the selected text in a hidden input field
var s=o.querySelector('input[name="highlight_text"]');if(s){s.value=r===null||r===void 0?void 0:r.text}// Set highlight serialized in a hidden input field
var l=o.querySelector('input[name="highlight_serialized"]');if(l){l.value=JSON.stringify(r)}// Disable scroll on body
document.body.classList.add("tutor-modal-open")}}/**
     * Handle lesson nav take note button click.
     * 
     * @param {HTMLElement} target - The clicked lesson nav take note button
     * 
     * @since v3.9.0
     */handleLessonNavTakeNoteButton(t){var e=t.closest("#tutor-lesson-nav-take-note-btn");var o=document.querySelector(".tutor-lesson-note-form-wrapper");if(e&&o){o.classList.remove("tutor-d-none");// Position the form intelligently
var{top:r,left:n}=this.getFormPosition(e,o);o.style.top="".concat(r,"px");o.style.left="".concat(n,"px");// Focus the textarea
var i=o.querySelector('textarea[name="note_text"]');if(i){i.focus()}// Disable scroll on body
document.body.classList.add("tutor-modal-open");// Set video start time if applicable
var a=window.tutorLessonPlayer;if(a&&typeof a.currentTime==="number"){var s=Math.floor(a.currentTime);var l=o.querySelector('input[name="video_start_time"]');if(l){l.value=s}var u=o.querySelector(".tutor-lesson-note-start-time");if(u){var d=Math.floor(s/60);var c=s%60;u.textContent="".concat(d.toString().padStart(2,"0"),":").concat(c.toString().padStart(2,"0")," -");u.classList.remove("tutor-d-none")}}}}/**
     * Play the video from note start time.
     * 
     * @param {HTMLElement} target - The clicked video action button
     * 
     * @since v3.9.0
     */handleVideoAction(t){var e=t.closest(".tutor-lesson-note-list-item-video-action");if(!e)return;var o=e.getAttribute("data-start-time");var r=window.tutorLessonPlayer;if(r&&o){var n=document.querySelector(".tutor-video-player-wrapper");if(n){n.scrollIntoView({behavior:"smooth",block:"center"})}// Play the video
r.currentTime=Number(o);r.play()}}/**
     * Handle load more notes button click.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked load more button
     * 
     * @since v3.9.0
     */handleLoadMoreNotes(t,e){return n(function*(){var{__}=wp.i18n;t.preventDefault();var o=e;var r=o.getAttribute("data-lesson-id");var n=o.getAttribute("data-items-per-page")||20;var i=document.querySelectorAll(".tutor-lesson-note-list-item").length||0;if(!r){tutor_toast(__("Failed","tutor-pro"),__("Invalid lesson, please try again","tutor-pro"),"error");return}try{o.setAttribute("disabled",true);o.classList.add("is-loading");var a=yield c(d({action:"tutor_pro_lesson_notes_load_more",lesson_id:r,offset:i}));var{status_code:s,data:l,message:u}=yield a.json();if(s===200&&(l===null||l===void 0?void 0:l.html)){var h=document.querySelector(".tutor-lesson-note-list");if(h){h.insertAdjacentHTML("beforeend",l.html)}// If fewer notes were returned than requested, hide the load more button
if(l.notes_count<n){o.classList.add("tutor-d-none")}else{o.classList.remove("tutor-d-none")}}else{tutor_toast(__("Failed","tutor-pro"),u||this.defaultErrorMessage,"error")}}catch(t){tutor_toast(__("Failed","tutor-pro"),this.defaultErrorMessage,"error")}finally{o.removeAttribute("disabled");o.classList.remove("is-loading")}}).call(this)}/**
     * Open note popover when highlighted text is clicked.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked highlighted element
     * 
     * @since v3.9.0
     */handleHighlightedTextClick(t,e){e.classList.add("has-popover");var o=e.getAttribute("data-note-id");var r=e.getAttribute("data-lesson-id");var n=e.getAttribute("data-note-content");var i=e.getAttribute("data-highlight-text");if(o){// Display the content and highlight text on click
var a=document.querySelector(".tutor-note-popover");if(a){a.remove()}var s=document.createElement("div");s.className="tutor-note-popover";s.innerHTML='\n                <div class="tutor-note-popover-content">\n                    <div class="tutor-note-popover-top">\n                        <div class="tutor-note-popover-highlight"></div>\n                        <button class="tutor-note-popover-close"><i class="tutor-icon-times-o"></i></button>\n                    </div>\n                    <div class="tutor-note-popover-note">'.concat(n,'</div>\n                    <div class="tutor-note-popover-buttons">\n                        <button class="tutor-btn tutor-note-popover-edit-button"><i class="tutor-icon-edit"></i></button>\n                        <button class="tutor-btn tutor-confirm-delete-note-button" data-note-id="').concat(o,'" data-lesson-id="').concat(r,'">\n                            <i class="tutor-icon-trash-can-line"></i>\n                        </button>\n                    </div>\n                </div>\n            ');// Set the highlight text as textContent to prevent HTML parsing
var l=s.querySelector(".tutor-note-popover-highlight");l.textContent=i;document.body.appendChild(s);document.body.classList.add("tutor-modal-open");var{top:u,left:d}=this.getPopoverPosition(t.target,s);s.style.position="fixed";s.style.top="".concat(u,"px");s.style.left="".concat(d,"px");s.style.zIndex="9999";// Close button handler
var c=s.querySelector(".tutor-note-popover-close");if(c){c.addEventListener("click",()=>{e.classList.remove("has-popover");s.remove();document.body.classList.remove("tutor-modal-open")})}// Remove popover when clicking elsewhere
var h=o=>{if(!s.contains(o.target)&&o.target!==t.target){e.classList.remove("has-popover");s.remove();document.removeEventListener("click",h)}// Re-enable scroll on body                
var r=document.querySelector(".tutor-note-popover");var n=document.querySelector(".tutor-lesson-note-form-wrapper:not(.tutor-d-none)");if(!r&&!n){document.body.classList.remove("tutor-modal-open")}};setTimeout(()=>document.addEventListener("click",h),0)}}/**
     * Handle note edit button click from popover.
     * 
     * @param {Event} e - The click event
     * @param {HTMLElement} target - The clicked edit button
     * 
     * @since v3.9.0
     */handleNotePopoverEdit(t,e){t.preventDefault();var{__}=wp.i18n;var o=e.closest(".tutor-note-popover");var r=o.querySelector(".tutor-confirm-delete-note-button").getAttribute("data-note-id");if(r){// Remove the popover
o.remove();// Find the note item in the list and show its edit form
var n=document.querySelector(".tutor-lesson-note-form-wrapper");var i=document.querySelector('mark[data-note-id="'.concat(r,'"]'));if(n&&i){// Open the form.
n.classList.remove("tutor-d-none");var{top:a,left:s}=this.getPopoverPosition(i,n);n.style.top="".concat(a,"px");n.style.left="".concat(s,"px");// Focus the textarea
var l=n.querySelector('textarea[name="note_text"]');if(l){var u=o.querySelector(".tutor-note-popover-note").textContent;l.value=u;l.focus()}// Append note_id input field.
var d=n.querySelector('input[name="note_id"]');if(d){d.value=r}// Update action input
var c=n.querySelector('input[name="action"]');if(c){c.value="tutor_pro_update_lesson_note"}// Update title text
var h=document.querySelector(".tutor-lesson-note-form-title");if(h){h.textContent=__("Edit Note","tutor-pro")}// Disable scroll on body
document.body.classList.add("tutor-modal-open")}}}/**
     * Handle outside click events to close note form when clicking outside safe areas.
     * 
     * @param {MouseEvent} e - The click event
     * 
     * @since v3.9.0
     */handleOutsideClick(t){var e=window.getSelection();if(e&&!e.isCollapsed){return}var o=[".tutor-lesson-note-form-wrapper","#tutor-take-lesson-note-btn","#tutor-lesson-nav-take-note-btn",".tutor-note-popover-edit-button"];if(!t.target.closest(o.join(","))){this.closeNoteForm(true)}}/**
     * Handle keydown events for notes functionality.
     * 
     * @param {KeyboardEvent} e - The keydown event
     * 
     * @since v3.9.0
     */handleKeydown(t){if(t.key==="Escape"){var e=document.querySelector(".tutor-lesson-note-form-wrapper");if(e&&!e.classList.contains("tutor-d-none")){this.closeNoteForm(true)}// Remove any existing note popover
var o=document.querySelector(".tutor-note-popover");if(o){o.remove();document.body.classList.remove("tutor-modal-open")}// Remove has-popover class from mark tags
var r=document.querySelectorAll(".tutor-highlighted.has-popover");r.forEach(t=>t.classList.remove("has-popover"))}if(t.target&&t.target.matches(".tutor-lesson-notes-form textarea")){if((t.ctrlKey||t.metaKey)&&t.key==="Enter"){t.preventDefault();var n=t.target.closest("form");if(n){n.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))}}}}/**
     * Handle mouseup events to show note button when text is selected.
     * 
     * @since v3.9.0
     */handleMouseup(){var t=document.getElementById("tutor-take-lesson-note-btn");var e=this.getSelectionEndPosition();if(e&&t){t.classList.remove("tutor-d-none");t.style.top="".concat(e.y-54,"px");t.style.left="".concat(e.x-t.clientWidth/2,"px")}}/**
     * Handle scroll and resize events to adjust note button position.
     * 
     * @since v3.9.0
     */handleScrollResize(){var t=document.getElementById("tutor-take-lesson-note-btn");if(t&&!t.classList.contains("tutor-d-none")){var e=this.getSelectionEndPosition();if(e){t.style.top="".concat(e.y-54,"px");t.style.left="".concat(e.x-t.clientWidth/2,"px")}}}/**
     * Handle focusin events to display form action buttons when textarea is focused.
     * 
     * @param {FocusEvent} e - The focusin event
     * 
     * @since v3.9.0
     */handleFocusin(t){if(t.target&&t.target.matches(".tutor-notes-tab-content-form textarea")){var e=t.target.closest(".tutor-notes-tab-content-form").querySelector(".tutor-lesson-notes-form-buttons");if(e){e.classList.remove("tutor-d-none")}}}/**
     * Handle note hover in.
     * 
     * @since v3.9.0
     */handleNoteHover(t){var e=t.target.dataset.noteId;if(!e)return;var o=document.querySelectorAll('.tutor-highlighted[data-note-id="'.concat(e,'"]'));o.forEach(t=>t.classList.add("note-hover"))}/**
     * Handle note hover out.
     * 
     * @since v3.9.0
     */handleNoteHoverOut(t){var e=t.target.dataset.noteId;if(!e)return;var o=document.querySelectorAll('.tutor-highlighted[data-note-id="'.concat(e,'"]'));o.forEach(t=>t.classList.remove("note-hover"))}/**
     * Handle tutor tab changed events to show/hide take note button.
     * 
     * @param {CustomEvent} e - The tutor_tab_changed event
     * 
     * @since v3.9.0
     */handleTutorTabChanged(t){this.closeNoteForm();var e=document.getElementById("tutor-lesson-nav-take-note-btn");if(e){if(t.detail&&t.detail.tabId==="tutor-course-spotlight-notes"){e.classList.add("tutor-d-none")}else{e.classList.remove("tutor-d-none")}}}/**
     * Handle tutor lesson player ready event for fullscreen video functionality.
     * 
     * @param {Event} e - The tutorLessonPlayerReady event
     * 
     * @since v3.9.0
     */handleTutorLessonPlayerReady(t){var e=t.detail.player;if(e){var o=false;// Listen for entering fullscreen
e.on("enterfullscreen",t=>{var e=t.srcElement;var r=document.querySelector("#tutor-lesson-nav-take-note-btn");var n=document.querySelector(".tutor-lesson-note-form-wrapper");if(e&&r&&n){r.classList.add("tutor-video-lesson-take-note-button");if(r.classList.contains("tutor-d-none")){r.classList.remove("tutor-d-none");o=true}e.appendChild(r);n.classList.add("tutor-player-fullscreen");e.appendChild(n);// Add toast wrapper
var i=document.createElement("div");i.classList.add("tutor-toast-parent","tutor-toast-left");e.appendChild(i)}});// Listen for exiting fullscreen
e.on("exitfullscreen",t=>{var e=t.srcElement;var r=document.querySelector(".tutor-course-spotlight-nav");var n=document.querySelector(".tutor-course-spotlight-tab");var i=document.querySelector("#tutor-lesson-nav-take-note-btn");var a=document.querySelector(".tutor-lesson-note-form-wrapper");if(r&&n&&i&&a){i.classList.remove("tutor-video-lesson-take-note-button");if(o){i.classList.add("tutor-d-none");o=false}r.appendChild(i);a.classList.remove("tutor-player-fullscreen");n.appendChild(a)}// Remove toast wrapper
var s=document.querySelector(".tutor-toast-parent");if(s&&e){e.removeChild(s)}// Close form is already open
if(this.isNoteFormOpen()){this.closeNoteForm(false)}})}}/**
     * Handle textarea input to show/hide key hint.
     * 
     * @param {Event} e - The input event
     * 
     * @since v3.9.0
     */handleTextareaInput(t){if(t.target&&t.target.matches('.tutor-lesson-notes-form textarea[name="note_text"]')){var e=t.target.closest(".tutor-lesson-notes-form");if(e){var o=e.querySelector(".tutor-lesson-notes-form-key-hint");if(o){if(t.target.value.trim().length>0){o.parentElement.classList.remove("tutor-justify-end");o.parentElement.classList.add("tutor-justify-between");o.classList.remove("tutor-d-none")}else{o.parentElement.classList.add("tutor-justify-end");o.parentElement.classList.remove("tutor-justify-between");o.classList.add("tutor-d-none")}}}}}/**
     * Setting up instance properties
     * and calling the init method to configure the highlighter, event listeners,
     * and restore any existing highlights.
     * 
     * @since v3.9.0
     */constructor(){this.highlighter=null;this.defaultErrorMessage="";this.lessonWrapper=null;this.init()}}// Initialize the LessonNotes class when DOM is ready
window.addEventListener("DOMContentLoaded",()=>{new h})})();