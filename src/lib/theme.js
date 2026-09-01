import { useState, useEffect } from 'react';

export const THEMES = [
  {
    id: 'green-arrow',
    name: 'أخضر جرين أرو الفاخر (Green Arrow Signature)',
    primaryHsl: '161 94% 13%',
    accentHsl: '152 69% 40%',
    sidebarBg: '#081C15',
    sidebarActive: '#10B981',
    sidebarActiveText: '#FFFFFF',
    previewPrimary: '#081C15',
    previewAccent: '#10B981'
  },
  {
    id: 'navy-gold',
    name: 'كحلي ملكي وذهبي (Royal Navy & Gold)',
    primaryHsl: '215 68% 14%',
    accentHsl: '45 65% 52%',
    sidebarBg: '#0B1F3A',
    sidebarActive: '#D4AF37',
    sidebarActiveText: '#0B1F3A',
    previewPrimary: '#0B1F3A',
    previewAccent: '#D4AF37'
  },
  {
    id: 'royal-purple',
    name: 'بنفسجي ملكي (Imperial Purple & Gold)',
    primaryHsl: '270 54% 14%',
    accentHsl: '45 65% 52%',
    sidebarBg: '#1E1035',
    sidebarActive: '#C5A869',
    sidebarActiveText: '#1E1035',
    previewPrimary: '#1E1035',
    previewAccent: '#C5A869'
  },
  {
    id: 'tech-indigo',
    name: 'أزرق تقني عصري (Tech Indigo & Cyan)',
    primaryHsl: '243 75% 20%',
    accentHsl: '239 84% 67%',
    sidebarBg: '#1E1B4B',
    sidebarActive: '#6366F1',
    sidebarActiveText: '#FFFFFF',
    previewPrimary: '#1E1B4B',
    previewAccent: '#6366F1'
  },
  {
    id: 'corporate-slate',
    name: 'رصاصي مؤسسي (Corporate Slate & Ice)',
    primaryHsl: '222 47% 11%',
    accentHsl: '199 89% 48%',
    sidebarBg: '#0F172A',
    sidebarActive: '#38BDF8',
    sidebarActiveText: '#0F172A',
    previewPrimary: '#0F172A',
    previewAccent: '#38BDF8'
  },
  {
    id: 'burgundy',
    name: 'عنابي إمبراطوري (Imperial Burgundy)',
    primaryHsl: '348 83% 14%',
    accentHsl: '346 77% 50%',
    sidebarBg: '#4A0404',
    sidebarActive: '#E11D48',
    sidebarActiveText: '#FFFFFF',
    previewPrimary: '#4A0404',
    previewAccent: '#E11D48'
  }
];

export function getCurrentTheme() {
  try {
    const savedId = localStorage.getItem('hr_flow_theme_id') || 'green-arrow';
    const isDark = localStorage.getItem('theme') === 'dark' || 
                   localStorage.getItem('hr_flow_is_dark') === 'true' || 
                   document.documentElement.classList.contains('dark');
    const theme = THEMES.find(t => t.id === savedId) || THEMES[0];
    return { theme, isDark };
  } catch (e) {
    return { theme: THEMES[0], isDark: false };
  }
}

export function applyTheme(themeId, isDark = false) {
  const selected = THEMES.find(t => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  root.style.setProperty('--primary', selected.primaryHsl);
  root.style.setProperty('--ring', selected.accentHsl);
  root.style.setProperty('--accent', selected.accentHsl);
  root.style.setProperty('--sidebar-bg', selected.sidebarBg);
  root.style.setProperty('--sidebar-active', selected.sidebarActive);
  root.style.setProperty('--sidebar-active-text', selected.sidebarActiveText);

  if (isDark) {
    root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('hr_flow_is_dark', 'true');
  } else {
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    localStorage.setItem('hr_flow_is_dark', 'false');
  }

  localStorage.setItem('hr_flow_theme_id', selected.id);
  window.dispatchEvent(new CustomEvent('hr_flow_theme_changed', { detail: { theme: selected, isDark } }));
}

export function useTheme() {
  const [themeState, setThemeState] = useState(getCurrentTheme);

  useEffect(() => {
    // Apply initial state
    applyTheme(themeState.theme.id, themeState.isDark);

    const handler = (e) => {
      if (e.detail) {
        setThemeState({ theme: e.detail.theme, isDark: e.detail.isDark });
      }
    };

    const storageHandler = () => {
      setThemeState(getCurrentTheme());
    };

    window.addEventListener('hr_flow_theme_changed', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('hr_flow_theme_changed', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  const setTheme = (id) => {
    applyTheme(id, themeState.isDark);
  };

  const toggleDarkMode = () => {
    applyTheme(themeState.theme.id, !themeState.isDark);
  };

  return {
    currentTheme: themeState.theme,
    isDark: themeState.isDark,
    themes: THEMES,
    setTheme,
    toggleDarkMode
  };
}
