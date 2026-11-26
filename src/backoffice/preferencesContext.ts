import { createContext } from "react";
import type { BackofficeCopy } from "./i18n/fr";

export type ThemePreference = "light" | "dark" | "system";
export type Density = "comfortable" | "compact";
export type BackofficeLocale = "fr" | "en";

export type Preferences = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: "light" | "dark";
  density: Density;
  setDensity: (density: Density) => void;
  locale: BackofficeLocale;
  setLocale: (locale: BackofficeLocale) => void;
  copy: BackofficeCopy;
};

export const PreferencesContext = createContext<Preferences | null>(null);
