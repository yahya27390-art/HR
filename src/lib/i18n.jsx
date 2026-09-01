import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@/translations';

const I18nContext = createContext();
const STORAGE_KEY = 'nexus-hr-lang';

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'ar'; } catch { return 'ar'; }
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const t = (key, vars) => {
    let s = (translations[lang] && translations[lang][key]) || translations.en[key] || key;
    if (vars) {
      for (const k in vars) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
      }
    }
    return s;
  };

  const toggleLang = () => setLang((l) => (l === 'en' ? 'ar' : 'en'));

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}