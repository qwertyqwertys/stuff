const STORAGE_KEY = "site_selected_font";

export const LOCAL_FONTS = [
  {
    id: "local-default",
    label: "System Default",
    value: '"Inter", ui-sans-serif, system-ui, sans-serif',
    type: "system",
  },
  {
    id: "local-baloo-2",
    label: "Baloo 2 (Local)",
    value: "'Baloo 2', cursive, sans-serif",
    type: "local",
    faces: [
      { url: "./fonts/baloo-2-v23-latin-regular.woff2", weight: "400" },
      { url: "./fonts/baloo-2-v23-latin-600.woff2", weight: "600" },
      { url: "./fonts/baloo-2-v23-latin-800.woff2", weight: "800" },
    ],
  },
  {
    id: "local-fredoka",
    label: "Fredoka (Local)",
    value: "'Fredoka', sans-serif",
    type: "local",
    faces: [
      { url: "./fonts/fredoka-v17-latin-600.woff2", weight: "600" },
    ],
  },
  {
    id: "local-inter",
    label: "Inter (Local)",
    value: "'Inter', sans-serif",
    type: "local",
    faces: [
      { url: "./fonts/inter-v20-latin-regular.woff2", weight: "400" },
      { url: "./fonts/inter-v20-latin-500.woff2", weight: "500" },
      { url: "./fonts/inter-v20-latin-600.woff2", weight: "600" },
      { url: "./fonts/inter-v20-latin-700.woff2", weight: "700" },
    ],
  },
  {
    id: "local-jetbrains-mono",
    label: "JetBrains Mono (Local)",
    value: "'JetBrains Mono', monospace",
    type: "local",
    faces: [
      { url: "./fonts/jetbrains-mono-v24-latin-regular.woff2", weight: "400" },
      { url: "./fonts/jetbrains-mono-v24-latin-500.woff2", weight: "500" },
    ],
  },
];

export const GOOGLE_FONTS = [
  { id: "gf-poppins", label: "Poppins", family: "Poppins", weights: "400;500;600;700", value: "'Poppins', sans-serif", type: "google" },
  { id: "gf-press-start", label: "Press Start 2P", family: "Press Start 2P", weights: "", value: "'Press Start 2P', monospace", type: "google" },
  { id: "gf-rubik", label: "Rubik", family: "Rubik", weights: "400;500;600;700", value: "'Rubik', sans-serif", type: "google" },
  { id: "gf-space-grotesk", label: "Space Grotesk", family: "Space Grotesk", weights: "400;500;600;700", value: "'Space Grotesk', sans-serif", type: "google" },
  { id: "gf-vt323", label: "VT323", family: "VT323", weights: "", value: "'VT323', monospace", type: "google" },
];

export const ALL_FONTS = [...LOCAL_FONTS, ...GOOGLE_FONTS];

const SINGLE_WEIGHT_FAMILIES = new Set(["Press Start 2P", "VT323"]);

function ensureLocalFontFace(font) {
  if (font.type !== "local" || !Array.isArray(font.faces)) return;
  const styleId = `local-font-${font.id}`;
  if (document.getElementById(styleId)) return;

  const fontName = font.value.split(",")[0].replace(/['"]/g, "").trim();
  const cssRules = font.faces
    .map(
      (face) =>
        `@font-face { font-family: '${fontName}'; src: url('${face.url}') format('woff2'); font-weight: ${face.weight}; font-style: normal; font-display: swap; }`
    )
    .join("\n");

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = cssRules;
  document.head.appendChild(style);
}

function ensureGoogleFontLink(font) {
  if (font.type !== "google" || !font.family) return;
  const linkId = `gf-link-${font.id}`;
  if (document.getElementById(linkId)) return;

  const encodedFamily = encodeURIComponent(font.family).replace(/%20/g, "+");
  const isSingleWeight = SINGLE_WEIGHT_FAMILIES.has(font.family) || !font.weights;
  const familyQuery = isSingleWeight ? encodedFamily : `${encodedFamily}:wght@${font.weights}`;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${familyQuery}&display=swap`;
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
