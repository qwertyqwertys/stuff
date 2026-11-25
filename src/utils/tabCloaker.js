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
 * Extracts page <title> and icon directly from the fetched HTML of the typed URL,
 * skipping `favicon_32x32.png` and using `<origin>/favicon.ico` as the fallback.
 */
export async function fetchSiteCloakFromUrl(rawUrl) {
  const normalized = normalizeTargetUrl(rawUrl);
  const parsed = new URL(normalized);

  let title = '';
  let iconUrl = '';

  const proxies = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  ];

  for (const makeProxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(makeProxyUrl(normalized), { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) continue;
      const html = await res.text();
      if (!html) continue;

      const doc = new DOMParser().parseFromString(html, 'text/html');

      const parsedTitle = (
        doc.querySelector('title')?.textContent ||
        doc.querySelector("meta[property='og:title']")?.getAttribute('content') ||
        ''
      ).trim();

      if (parsedTitle) {
        title = parsedTitle;
      }

      const candidates = [...doc.querySelectorAll("link[rel*='icon']")]
        .map((el) => {
          const href = el.getAttribute('href')?.trim();
          const resolved = resolveAssetUrl(href, normalized);
          if (!resolved || resolved.includes('google.com/s2/favicons')) return null;
          if (resolved.includes('favicon_32x32.png')) return null;
          return resolved;
        })
        .filter(Boolean);

      iconUrl = candidates[0] || `${parsed.origin}/favicon.ico`;

      if (title || iconUrl) {
        break;
      }
    } catch {
      // Try next proxy
    }
  }

  return {
    title,
    iconUrl,
    sourceUrl: normalized,
  };
}
```[cite: 6]
