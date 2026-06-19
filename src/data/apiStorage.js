import { useEffect, useMemo, useState } from 'react';
import { COLLECTIONS, assertCollectionName } from './collections.js';

const API_COLLECTIONS = new Set(['rhythm', 'tasks', 'events', 'annualPlan', 'roadmap', 'goals', 'series', 'services', 'bulletin', 'people']);
const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const canUseApi = () => typeof window !== 'undefined' && window.location.protocol !== 'file:';
const isLocalDev = () => typeof window !== 'undefined' && LOCAL_DEV_HOSTS.has(window.location.hostname);

export function useCollectionStorage(key, initialValue) {
  const collectionName = assertCollectionName(key);
  const config = COLLECTIONS[collectionName];
  const apiCollection = API_COLLECTIONS.has(collectionName);
  const localDevFallback = apiCollection && isLocalDev();
  const [apiState, setApiState] = useState(() => ({
    apiEnabled: false,
    apiCollection,
    loading: apiCollection && canUseApi(),
    error: '',
    localDevFallback,
    localOnly: !apiCollection,
    lastSyncedAt: ''
  }));
  const [value, setValue] = useState(() => {
    if (apiCollection && !localDevFallback) return initialValue;
    try {
      const raw = localStorage.getItem(config.storageKey);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!apiCollection || !canUseApi()) {
      setApiState(state => ({ ...state, loading: false, apiEnabled: false, localOnly: !apiCollection }));
      return;
    }
    let cancelled = false;
    setApiState(state => ({ ...state, loading: true, error: '', localDevFallback }));
    fetch(`/api/collections/${collectionName}`, { headers: { accept: 'application/json' }, credentials: 'same-origin' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || payload.error || `API request failed with ${response.status}`);
        return payload;
      })
      .then(payload => {
        if (cancelled) return;
        const next = payload.data ?? initialValue;
        setApiState(state => ({ ...state, apiEnabled: true, loading: false, error: '', lastSyncedAt: new Date().toISOString() }));
        setValue(next);
        if (localDevFallback) localStorage.setItem(config.storageKey, JSON.stringify(next));
      })
      .catch(error => {
        if (cancelled) return;
        setApiState(state => ({
          ...state,
          apiEnabled: false,
          loading: false,
          error: error.message || 'Planning API is unavailable.',
          localDevFallback
        }));
      });
    return () => { cancelled = true; };
  }, [collectionName, config.storageKey, apiCollection, localDevFallback]);

  const setStored = updater => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!apiCollection || localDevFallback) localStorage.setItem(config.storageKey, JSON.stringify(next));
      if (apiState.apiEnabled && apiCollection) {
        fetch(`/api/collections/${collectionName}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(next)
        })
          .then(async response => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || payload.error || `API write failed with ${response.status}`);
            setApiState(state => ({ ...state, error: '', lastSyncedAt: new Date().toISOString() }));
          })
          .catch(error => setApiState(state => ({ ...state, apiEnabled: false, error: error.message || 'Planning API write failed.' })));
      }
      return next;
    });
  };

  return [value, setStored, useMemo(() => apiState, [apiState])];
}
