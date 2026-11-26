import { Route, Routes } from "react-router-dom";
import BackofficeV2Layout from "./BackofficeV2Layout";
import OverviewPage from "./OverviewPage";
import BusinessesPage from "./BusinessesPage";
import BusinessPage from "./BusinessPage";
import AuditPage from "./AuditPage";
import { ConsoleProvider } from "./store";
import FeaturesPage from "./features";
import { HealthPage, LeadsPage, PaymentsPage, SimplePage, SubscriptionsPage } from "./sections";

export default function BackofficeV2App() {
  return (
    <ConsoleProvider>
      <Routes>
        <Route path="/" element={<BackofficeV2Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="entreprises" element={<BusinessesPage />} />
          <Route path="entreprises/:tenantId" element={<BusinessPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="abonnements" element={<SubscriptionsPage />} />
          <Route path="paiements" element={<PaymentsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="sante" element={<HealthPage />} />
          <Route
            path="analytics"
            element={
              <SimplePage
                title="Analytics"
                lede="Rétention, activation et usage."
                body="Les cohortes seront calculées sur les abonnements réels. Aucune courbe de démonstration n'est affichée ici."
              />
            }
          />
          <Route
            path="utilisateurs"
            element={
              <SimplePage
                title="Utilisateurs"
                lede="Comptes marchands. L'équipe interne est dans Sécurité."
                body="Une invitation sans connexion s'affiche « Invitation en attente », jamais « Actif »."
              />
            }
          />
          <Route
            path="relances"
            element={
              <SimplePage
                title="Relances"
                lede="Séquence J-7, jour J, J+3, J+7, puis suspension."
                body="Les impayés de l'échantillon se traitent depuis la fiche entreprise, via le rappel WhatsApp."
              />
            }
          />
          <Route
            path="plans"
            element={
              <SimplePage
                title="Plans & tarifs"
                lede="Starter 15 000 F · Pro 25 000 F · Business 35 000 F."
                body="Changer un prix crée une nouvelle version. Les entreprises en cours gardent leur prix tant qu'elles ne sont pas migrées."
              />
            }
          />
          <Route
            path="codes"
            element={
              <SimplePage
                title="Codes promo"
                lede="Aucun code actif."
                body="Un code a une remise, une durée, un plafond d'usage et une date de fin. Rien n'est inventé tant qu'il n'y en a pas."
              />
            }
          />
          <Route path="modules" element={<FeaturesPage />} />
          <Route
            path="annonces"
            element={
              <SimplePage
                title="Annonces in-app"
                lede="Aucune annonce programmée."
                body="Une annonce cible un plan, un mode ou un pays, en bandeau ou en modale."
              />
            }
          />
          <Route
            path="tickets"
            element={
              <SimplePage
                title="Tickets"
                lede="Deux conversations ouvertes dans l'échantillon."
                body="Garage Sow · paiement Wave refusé. Muka · question sur les commissions. Ouvrez la fiche pour le rappel."
              />
            }
          />
          <Route
            path="assistance"
            element={
              <SimplePage
                title="Sessions d'assistance"
                lede="Chaque session a un motif, une durée et un périmètre."
                body="Ouvrez une session depuis la fiche entreprise. La bannière reste visible tant que la session est active."
              />
            }
          />
          <Route
            path="incidents"
            element={
              <SimplePage
                title="Incidents"
                lede="Aucun incident ouvert."
                body="Résolu hier : latence du fournisseur WhatsApp, 9 h 12 – 11 h 40. Le SMS est encore dégradé, sans incident ouvert."
              />
            }
          />
          <Route
            path="taches"
            element={
              <SimplePage
                title="Tâches & files"
                lede="3 jobs en échec sur les dernières 24 h."
                body="Les files réelles (webhooks, WhatsApp, SMS) s'afficheront ici quand le worker sera connecté. Pas de file fictive."
              />
            }
          />
          <Route
            path="integrations"
            element={
              <SimplePage
                title="Intégrations"
                lede="PayDunya est la source des paiements Wave et Orange Money."
                body="WhatsApp, SMS et e-mail ont un statut dans Santé. Aucune clé n'est affichée dans cette vue."
              />
            }
          />
          <Route
            path="equipe"
            element={
              <SimplePage
                title="Équipe interne & rôles"
                lede="Super admin, Finance, Support, Ventes, Lecture seule."
                body="Le compte staff n'est pas un propriétaire de tenant. Changez de rôle depuis le profil d'Awa Diop pour voir le menu se restreindre."
              />
            }
          />
          <Route
            path="sessions"
            element={
              <SimplePage
                title="Sessions & accès"
                lede="2FA obligatoire pour l'équipe interne."
                body="Le délai de session et la liste d'IP autorisées se règlent ici. Rien n'est appliqué tant que la politique n'est pas enregistrée."
              />
            }
          />
          <Route
            path="donnees"
            element={
              <SimplePage
                title="Demandes données personnelles"
                lede="Aucune demande en cours."
                body="Export et suppression ont un délai. Le traitement est journalisé."
              />
            }
          />
        </Route>
      </Routes>
    </ConsoleProvider>
  );
}
