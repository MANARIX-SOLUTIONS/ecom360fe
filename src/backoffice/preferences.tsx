import { useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./i18n/en";
import { fr } from "./i18n/fr";
import {
  PreferencesContext,
  type BackofficeLocale,
  type Density,
  type ThemePreference,
} from "./preferencesContext";

const THEME_KEY = "ecom360_bo_theme";
const DENSITY_KEY = "ecom360_bo_density";
const LOCALE_KEY = "ecom360_bo_locale";

function readTheme(): ThemePreference {
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function readDensity(): Density {
  return localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable";
}

function readLocale(): BackofficeLocale {
  return localStorage.getItem(LOCALE_KEY) === "en" ? "en" : "fr";
}

function systemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function BackofficePreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readTheme);
  const [density, setDensityState] = useState<Density>(readDensity);
  const [locale, setLocaleState] = useState<BackofficeLocale>(readLocale);
  const [system, setSystem] = useState<"light" | "dark">(systemTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    localStorage.setItem(THEME_KEY, next);
  };
  const setDensity = (next: Density) => {
    setDensityState(next);
    localStorage.setItem(DENSITY_KEY, next);
  };
  const setLocale = (next: BackofficeLocale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme: theme === "system" ? system : theme,
      density,
      setDensity,
      locale,
      setLocale,
      copy: locale === "en" ? en : fr,
    }),
    [theme, system, density, locale]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
