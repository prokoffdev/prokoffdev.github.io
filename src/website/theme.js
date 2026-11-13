export const themeToggleColorHooks = [];

const root = document.documentElement;

export function initTheme() {
  const themeToggle = document.querySelector(".theme-toggle");
  if (!themeToggle) return;

  function syncToggle() {
    themeToggle.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
  }

  syncToggle();

  themeToggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", root.dataset.theme);
    syncToggle();
    themeToggleColorHooks.forEach((fn) => fn());
  });

  // Follow the OS only while the visitor has not picked a theme themselves.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (localStorage.getItem("theme")) return;
    root.dataset.theme = e.matches ? "dark" : "light";
    syncToggle();
    themeToggleColorHooks.forEach((fn) => fn());
  });
}
