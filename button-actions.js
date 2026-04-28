(function () {
  const externalLinks = {
    dashboard: "https://talweehacademy.com/dashboard/",
    login: "https://talweehacademy.com/dashboard/",
    register: "https://talweehacademy.com/dashboard/",
    youtube: "https://www.youtube.com/@talweehacademy",
  };

  function inferHref(button) {
    const text = (button.textContent || "").trim().toLowerCase();
    const classes = [...button.classList];

    if (classes.includes("btn-view-course") || classes.includes("btn-view-lg")) return "courses.html";
    if (classes.includes("btn-load-more")) return "courses.html";
    if (classes.includes("btn-about")) return "about.html";
    if (classes.includes("btn-join")) return "contact.html";
    if (classes.includes("btn-gift") || classes.includes("btn-apply")) return "index.html#gift-apply";
    if (classes.includes("btn-subscribe")) return externalLinks.youtube;
    if (classes.includes("btn-journey")) return externalLinks.dashboard;
    if (classes.includes("cart-icon-btn")) return "courses.html";

    if (text.includes("view course")) return "courses.html";
    if (text.includes("load all courses")) return "courses.html";
    if (text.includes("view articles")) return "articles.html";
    if (text.includes("about us")) return "about.html";
    if (text.includes("join us")) return "contact.html";
    if (text.includes("sign up")) return externalLinks.register;
    if (text.includes("my journey")) return externalLinks.dashboard;
    if (text.includes("subscribe")) return externalLinks.youtube;
    if (text.includes("give a gift") || text.includes("apply for a gift")) return "index.html#gift-apply";
    if (text.includes("read now")) return "about.html";

    return null;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.disabled) return;
    if (button.closest("form")) return;
    if (button.hasAttribute("onclick")) return;

    const href = inferHref(button);
    if (!href) return;

    event.preventDefault();
    window.location.href = href;
  });
})();
