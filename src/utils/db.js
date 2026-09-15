// --- INDEXEDDB HELPERS FOR HEAVY AUDIO FILES ---
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CapyMusicDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }
    };
  });
};

export const saveSongToIDB = async (songObj, blob) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('songs', 'readwrite');
    const store = transaction.objectStore('songs');
    store.put({ ...songObj, blob });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadSongsFromIDB = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('songs', 'readonly');
      const store = transaction.objectStore('songs');
      const request = store.getAll();
      request.onsuccess = () => {
        const songs = request.result.map(song => ({
          ...song,
          url: URL.createObjectURL(song.blob)
        }));
        resolve(songs);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return [];
  }
};

export const deleteSongFromIDB = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('songs', 'readwrite');
    const store = transaction.objectStore('songs');
    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
