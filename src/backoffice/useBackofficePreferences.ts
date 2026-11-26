import { useContext } from "react";
import { fr } from "./i18n/fr";
import { PreferencesContext, type Preferences } from "./preferencesContext";

const fallback: Preferences = {
  theme: "system",
  setTheme: () => undefined,
  resolvedTheme: "light",
  density: "comfortable",
  setDensity: () => undefined,
  locale: "fr",
  setLocale: () => undefined,
  copy: fr,
};

export function useBackofficePreferences(): Preferences {
  return useContext(PreferencesContext) ?? fallback;
}

export function useBackofficeI18n() {
  const { locale, setLocale, copy } = useBackofficePreferences();
  return { locale, setLocale, t: copy };
}
