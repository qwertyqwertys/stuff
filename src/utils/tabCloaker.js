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
 * skipping `favicon_32x32.png` and `google.com/s2/favicons`, and using
 * `<origin>/favicon.ico` as the fallback.
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
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try {
        controller.abort('timeout');
      } catch {}
    }, 5000);

    try {
      const res = await fetch(makeProxyUrl(normalized), { signal: controller.signal });
      if (!res || !res.ok) continue;

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

      const iconSelectors = [
        "link[rel='icon']",
        "link[rel='shortcut icon']",
        "link[rel='apple-touch-icon']",
        "link[rel='apple-touch-icon-precomposed']",
        "link[rel~='icon']",
      ];

      for (const selector of iconSelectors) {
        const iconEl = doc.querySelector(selector);
        const href = iconEl?.getAttribute('href')?.trim();
        const resolved = resolveAssetUrl(href, normalized);
        if (
          resolved &&
          !resolved.includes('google.com/s2/favicons') &&
          !resolved.includes('favicon_32x32.png')
        ) {
          iconUrl = resolved;
          break;
        }
      }

      if (title || iconUrl) {
        break;
      }
    } catch {
      // Ignore proxy timeouts, aborts, or 403s and try the next proxy
    } finally {
      clearTimeout(timer);
    }
  }

  if (!iconUrl) {
    iconUrl = `${parsed.origin}/favicon.ico`;
  }

  return {
    title,
    iconUrl,
    sourceUrl: normalized,
  };
}
