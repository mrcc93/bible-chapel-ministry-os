import { useEffect, useState } from 'react';
import { COLLECTIONS, assertCollectionName } from './collections.js';

const API_COLLECTIONS = new Set(['rhythm', 'tasks', 'events', 'annualPlan', 'roadmap', 'goals', 'series', 'services', 'bulletin']);
const canUseApi = () => typeof window !== 'undefined' && window.location.protocol !== 'file:';

export function useCollectionStorage(key, initialValue) {
  const collectionName = assertCollectionName(key);
  const config = COLLECTIONS[collectionName];
  const [apiEnabled, setApiEnabled] = useState(false);
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(config.storageKey);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!API_COLLECTIONS.has(collectionName) || !canUseApi()) return;
    let cancelled = false;
    fetch(`/api/collections/${collectionName}`, { headers: { accept: 'application/json' } })
      .then(response => response.ok ? response.json() : Promise.reject(response))
      .then(payload => {
        if (cancelled) return;
        setApiEnabled(true);
        const next = payload.data ?? initialValue;
        setValue(next);
        localStorage.setItem(config.storageKey, JSON.stringify(next));
      })
      .catch(() => setApiEnabled(false));
    return () => { cancelled = true; };
  }, [collectionName, config.storageKey]);

  const setStored = updater => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(config.storageKey, JSON.stringify(next));
      if (apiEnabled && API_COLLECTIONS.has(collectionName)) {
        fetch(`/api/collections/${collectionName}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(next)
        }).catch(() => {});
      }
      return next;
    });
  };

  return [value, setStored, { apiEnabled, apiCollection: API_COLLECTIONS.has(collectionName) }];
}
