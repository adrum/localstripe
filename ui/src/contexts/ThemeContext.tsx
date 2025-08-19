import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark'; // The actual theme being applied
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage using Tailwind v4 approach
    if (localStorage.theme === 'light') {
      return 'light';
    } else if (localStorage.theme === 'dark') {
      return 'dark';
    } else {
      // Check for old key as fallback
      const savedTheme = localStorage.getItem('localstripe-theme') as Theme;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        return savedTheme;
      }
      return 'system';
    }
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Calculate effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme as 'light' | 'dark';

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Apply theme following Tailwind v4 approach
    if (theme === 'light') {
      localStorage.theme = 'light';
      document.documentElement.classList.remove('dark');
    } else if (theme === 'dark') {
      localStorage.theme = 'dark';
      document.documentElement.classList.add('dark');
    } else {
      // System preference
      localStorage.removeItem('theme');
      document.documentElement.classList.toggle(
        'dark',
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    
    // Debug logging
    console.log('Theme applied:', { theme, effectiveTheme, classList: document.documentElement.classList.toString() });
  }, [theme, effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};