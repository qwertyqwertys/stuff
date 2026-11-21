const STORAGE_KEY = "site_selected_font";

// Replace these entries with the real filenames in public/fonts/
export const LOCAL_FONTS = [
  { id: "local-default", label: "System Default", value: "system-ui, -apple-system, sans-serif", type: "system" },
  { id: "local-font-1", label: "Local Font 1", value: "'LocalFont1', sans-serif", url: "./fonts/YourFont1.woff2", type: "local" },
  { id: "local-font-2", label: "Local Font 2", value: "'LocalFont2', monospace", url: "./fonts/YourFont2.ttf", type: "local" },
];

export const GOOGLE_FONTS = [
  { id: "gf-inter", label: "Inter", family: "Inter", value: "'Inter', sans-serif", type: "google" },
  { id: "gf-poppins", label: "Poppins", family: "Poppins", value: "'Poppins', sans-serif", type: "google" },
  { id: "gf-press-start", label: "Press Start 2P", family: "Press Start 2P", value: "'Press Start 2P', monospace", type: "google" },
  { id: "gf-fredoka", label: "Fredoka", family: "Fredoka", value: "'Fredoka', sans-serif", type: "google" },
  { id: "gf-jetbrains", label: "JetBrains Mono", family: "JetBrains Mono", value: "'JetBrains Mono', monospace", type: "google" },
];

export const ALL_FONTS = [...LOCAL_FONTS, ...GOOGLE_FONTS];

function ensureLocalFontFace(font) {
  if (font.type !== "local" || !font.url) return;
  const styleId = `local-font-${font.id}`;
  if (document.getElementById(styleId)) return;

  const fontName = font.value.split(",")[0].replace(/['"]/g, "").trim();
  const ext = font.url.split(".").pop().toLowerCase();
  const format =
    ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "otf" ? "opentype" : "truetype";

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `@font-face { font-family: '${fontName}'; src: url('${font.url}') format('${format}'); font-display: swap; }`;
  document.head.appendChild(style);
}

function ensureGoogleFontLink(font) {
  if (font.type !== "google" || !font.family) return;
  const linkId = `gf-link-${font.id}`;
  if (document.getElementById(linkId)) return;

  const encodedFamily = encodeURIComponent(font.family).replace(/%20/g, "+");
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

export function applyFontById(fontId) {
  const font = ALL_FONTS.find((f) => f.id === fontId) || LOCAL_FONTS[0];

  if (font.type === "local") {
    ensureLocalFontFace(font);
  } else if (font.type === "google") {
    ensureGoogleFontLink(font);
  }

  document.documentElement.style.setProperty("--site-font", font.value);
  try {
    localStorage.setItem(STORAGE_KEY, font.id);
  } catch (_) {}

  return font.id;
}

export function getSavedFontId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || LOCAL_FONTS[0].id;
  } catch (_) {
    return LOCAL_FONTS[0].id;
  }
}
