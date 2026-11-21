const USER_ID_KEY = "capy-chat-user-id";
const DEFAULT_NAME_KEY = "capy-default-username";

export function getOrCreateChatUserId() {
  try {
    let id = localStorage.getItem(USER_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `capy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(USER_ID_KEY, id);
    }
    return id;
  } catch (_) {
    return `temp_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function getDefaultCapyName() {
  try {
    let fallbackName = localStorage.getItem(DEFAULT_NAME_KEY);
    if (!fallbackName) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      fallbackName = `CapyUser_${suffix}`;
      localStorage.setItem(DEFAULT_NAME_KEY, fallbackName);
    }
    return fallbackName;
  } catch (_) {
    return `CapyUser_${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export function resolveDisplayName() {
  try {
    return (
      localStorage.getItem("capy-display-name") ||
      localStorage.getItem("capy-username") ||
      localStorage.getItem("username") ||
      getDefaultCapyName()
    );
  } catch (_) {
    return getDefaultCapyName();
  }
}
