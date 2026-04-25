/* Injects shared header + footer into every subpage.
   Each page sets window.PAGE_TITLE and window.PAGE_ACTIVE_NAV before this runs. */
(function() {
  const title = window.PAGE_TITLE || 'Talweeh Academy';
  const active = window.PAGE_ACTIVE_NAV || '';

  const navLinks = ['courses','services','articles','about','instructors','contact'];
  const navLabels = ['Courses','Services','Articles','About','Instructors','Contact'];
  const navHrefs  = ['courses.html','services.html','articles.html','about.html','instructors.html','contact.html'];

  const navHTML = navLinks.map((id, i) =>
    `<a href="${navHrefs[i]}" class="${active===id?'active':''}">${navLabels[i]}</a>`
  ).join('');

  const logoSVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="47" fill="none" stroke="#C6960A" stroke-width="2"/>
    <circle cx="50" cy="50" r="38" fill="none" stroke="#C6960A" stroke-width="1"/>
    <polygon points="50,8 57,38 88,38 64,56 73,86 50,68 27,86 36,56 12,38 43,38" fill="none" stroke="#2D5A1B" stroke-width="1.5"/>
    <circle cx="50" cy="50" r="14" fill="none" stroke="#C6960A" stroke-width="1.2"/>
    <text x="50" y="55" text-anchor="middle" font-family="Amiri, serif" font-size="12" fill="#2D5A1B" font-weight="bold">التلويح</text>
  </svg>`;

  const headerHTML = `
<div id="announcement-bar">
  Up to 50% off on Select Courses, <a href="courses.html">See Now</a>
  <button class="close-bar" onclick="this.parentElement.style.display='none'">&#x2715;</button>
</div>
<div id="top-bar">
  <div class="top-bar-left">
    <a href="#"><i class="fa-regular fa-circle-user"></i> Login as a Student</a>
    <a href="#"><i class="fa-solid fa-registered"></i> Register as a Student</a>
    <a href="#"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>
  </div>
  <div class="top-bar-right">
    <a href="#" title="X / Twitter"><i class="fa-brands fa-x-twitter"></i></a>
    <a href="#" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
    <a href="#" title="Telegram"><i class="fa-brands fa-telegram"></i></a>
    <a href="#" title="Instagram"><i class="fa-brands fa-instagram"></i></a>
    <a href="#" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
  </div>
</div>
<header id="main-header">
  <div class="header-left">
    <button class="cart-icon-btn" title="Cart"><i class="fa-solid fa-book"></i></button>
  </div>
  <div class="logo-wrap">
    <a href="index.html" style="display:flex;align-items:center;gap:14px;">
      <div class="logo-emblem">${logoSVG}</div>
      <div class="logo-text">
        <span class="main-name">TALWEEH</span>
        <span class="sub-name">ACADEMY</span>
      </div>
    </a>
  </div>
  <div class="header-right">
    <button class="btn-journey"><i class="fa-regular fa-circle-user"></i> My Journey</button>
  </div>
</header>
<nav id="main-nav">${navHTML}</nav>`;

  const footerHTML = `
<footer>
  <div class="footer-grid">
    <div class="footer-logo-col">
      <div class="footer-emblem">${logoSVG}</div>
    </div>
    <div class="footer-col">
      <h4>Home</h4>
      <ul>
        <li><a href="about.html">About Us</a></li>
        <li><a href="courses.html">Courses</a></li>
        <li><a href="#">Admission</a></li>
        <li><a href="instructors.html">Instructors</a></li>
        <li><a href="services.html">Services</a></li>
        <li><a href="articles.html">Articles</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Login/Register</h4>
      <ul>
        <li><a href="#">Login as a Student</a></li>
        <li><a href="#">Register as a Student</a></li>
        <li><a href="#">Dashboard Panel</a></li>
      </ul>
      <br/>
      <h4>Miscellaneous</h4>
      <ul>
        <li><a href="#">My Profile</a></li>
        <li><a href="#">Enrolled Courses</a></li>
        <li><a href="#">Purchase History</a></li>
        <li><a href="#">My Quiz Attempts</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Follow Us</h4>
      <div class="footer-social">
        <a href="#" title="X"><i class="fa-brands fa-x-twitter"></i></a>
        <a href="#" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
        <a href="#" title="Telegram"><i class="fa-brands fa-telegram"></i></a>
        <a href="#" title="Instagram"><i class="fa-brands fa-instagram"></i></a>
        <a href="#" title="WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    © All rights reserved by Talweeh Academy 2025 &nbsp;|&nbsp; © Designed by Hasnain Ayaz
  </div>
</footer>
<button id="scroll-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Scroll to top">
  <i class="fa-solid fa-chevron-up"></i>
</button>`;

  document.getElementById('site-header').innerHTML = headerHTML;
  document.getElementById('site-footer').innerHTML = footerHTML;
  document.title = title + ' - Talweeh Academy';

  window.addEventListener('scroll', () => {
    const btn = document.getElementById('scroll-top');
    if (btn) btn.classList.toggle('visible', window.scrollY > 300);
  });
})();
