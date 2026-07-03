import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

// Single fetch of "which languages exist" (from GET /admin/languages), shared
// by every component that needs to render a language name or offer a
// language picker - so adding a language is a backend-only change again.
const LanguagesContext = createContext({ languages: [], namesByCode: {}, loading: true });

export function LanguagesProvider({ children }) {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getLanguages()
      .then(setLanguages)
      .catch(() => setLanguages([]))
      .finally(() => setLoading(false));
  }, []);

  const namesByCode = Object.fromEntries(languages.map((l) => [l.code, l.name]));

  return (
    <LanguagesContext.Provider value={{ languages, namesByCode, loading }}>{children}</LanguagesContext.Provider>
  );
}

export function useLanguages() {
  return useContext(LanguagesContext);
}
