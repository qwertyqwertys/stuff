const CLOAK_STORAGE_KEY = 'capy_custom_tab_cloak_v1';

export function normalizeTargetUrl(rawUrl = '') {
  const trimmed = String(rawUrl).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function resolveAssetUrl(href, baseUrl) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return '';
  }
}

function getFallbackTitle(parsedUrl) {
  const host = parsedUrl.hostname.replace(/^www\./i, '');
  const root = host.split('.')[0] || host;
  return root.charAt(0).toUpperCase() + root.slice(1);
}

export function applyTabCloak({ title = '', iconUrl = '', sourceUrl = '' }) {
  if (typeof document !== 'undefined') {
    if (title) {
      document.title = title;
    }

    if (iconUrl) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = iconUrl;
    }
  }

  try {
    localStorage.setItem(
      CLOAK_STORAGE_KEY,
      JSON.stringify({ title, iconUrl, sourceUrl })
    );
  } catch {}
}

export function restoreSavedTabCloak() {
  try {
    const raw = localStorage.getItem(CLOAK_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved && (saved.title || saved.iconUrl)) {
      applyTabCloak(saved);
      return saved;
    }
  } catch {}
  return null;
}

export function clearSavedTabCloak(defaultTitle = 'Home', defaultIcon = '/favicon.ico') {
  try {
    localStorage.removeItem(CLOAK_STORAGE_KEY);
  } catch {}
  applyTabCloak({ title: defaultTitle, iconUrl: defaultIcon, sourceUrl: '' });
}

/**
 * Fetches page <title> and icon from a URL with CORS proxy + favicon fallback.
 */
export async function fetchSiteCloakFromUrl(rawUrl) {
  const normalized = normalizeTargetUrl(rawUrl);
  const parsed = new URL(normalized);
  const fallbackIcon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`;
  const fallbackTitle = getFallbackTitle(parsed);

  let title = fallbackTitle;
  let iconUrl = fallbackIcon;

  const proxies = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  for (const makeProxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(makeProxyUrl(normalized), { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      const html = await res.text();
      if (!html) continue;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const parsedTitle = doc.querySelector('title')?.textContent?.trim();
      if (parsedTitle) {
        title = parsedTitle;
      }

      const iconEl =
        doc.querySelector("link[rel='icon']") ||
        doc.querySelector("link[rel='shortcut icon']") ||
        doc.querySelector("link[rel='apple-touch-icon']") ||
        doc.querySelector("link[rel~='icon']");

      const resolvedIcon = resolveAssetUrl(iconEl?.getAttribute('href'), normalized);
      if (resolvedIcon) {
        iconUrl = resolvedIcon;
      }

      break;
    } catch {
      // Try next proxy or fall back to Google favicon + domain title
    }
  }

  return {
    title,
    iconUrl,
    sourceUrl: normalized,
  };
}
