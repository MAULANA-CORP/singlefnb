// Dipasang di <head> pada src/app/layout.tsx. Jalan SEBELUM React hydrate.
// Tanpa ini, layar berkedip putih dulu saat mode gelap ("FOUC").

const script = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored === 'dark'
      || ((stored === 'system' || !stored)
          && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
