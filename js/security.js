// Clickjacking defense. GitHub Pages cannot send X-Frame-Options / frame-ancestors
// headers (and frame-ancestors is ignored in <meta> CSP), so bust framing here.
// Loaded synchronously in <head> → runs before first paint.
(function () {
    if (window.top === window.self) return;
    document.documentElement.style.display = 'none';
    try { window.top.location.href = window.self.location.href; } catch (e) { /* cross-origin frame: stay hidden */ }
})();
