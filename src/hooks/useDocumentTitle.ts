import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = "360 PME Commerce";

const TITLE_MAP: Record<string, string> = {
  "/login": "Connexion",
  "/register": "Inscription",
  "/forgot-password": "Mot de passe oublié",
  "/reset-password": "Réinitialiser le mot de passe",
  "/dashboard": "Tableau de bord",
  "/pos": "Caisse",
  "/receipt": "Reçu",
  "/products": "Produits",
  "/clients": "Clients",
  "/suppliers": "Fournisseurs",
  "/expenses": "Dépenses",
  "/reports": "Rapports",
  "/settings": "Paramètres",
  "/settings/profile": "Profil entreprise",
  "/settings/subscription": "Abonnement",
  "/settings/users": "Utilisateurs",
  "/settings/security": "Sécurité",
  "/settings/stores": "Points de vente",
  "/profile": "Mon profil",
  "/more": "Plus",
  "/backoffice": "Backoffice",
  "/backoffice/businesses": "Entreprises",
  "/backoffice/users": "Utilisateurs",
  "/backoffice/system": "Système",
};

// Pages that set their own title (e.g. Receipt) - we skip to avoid flash
const SELF_TITLED = ["/receipt"];

function getTitleForPath(pathname: string): string {
  if (SELF_TITLED.some((p) => pathname.startsWith(p))) return BASE;
  const exact = TITLE_MAP[pathname];
  if (exact) return exact;
  const segment = "/" + (pathname.split("/").filter(Boolean)[0] ?? "");
  return TITLE_MAP[segment] ?? BASE;
}

export function useDocumentTitle(customTitle?: string) {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = customTitle ?? getTitleForPath(pathname);
    document.title = title === BASE ? title : `${title} — ${BASE}`;
    return () => {
      document.title = BASE;
    };
  }, [pathname, customTitle]);
}
