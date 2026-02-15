# 360 PME Commerce

Interface SaaS moderne pour petits et moyens commerces (Sénégal / Afrique) : caisse (POS), produits, clients, dépenses, rapports.

## Stack

- **React 18** + **TypeScript**
- **Vite**
- **Ant Design 5**
- **React Router 6**
- **Recharts** (rapports)
- **Lucide React** (icônes)

## Design

- **Couleurs** : Primaire #1F3A5F, Succès #2ECC71, Warning #F39C12, Danger #E74C3C, Fond #F5F7FA
- **Typo** : Inter
- **Objectifs** : POS ≤ 2 clics, lisibilité 1 m, tap targets ≥ 44px, mobile-first

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173). Connexion : n’importe quel email + mot de passe (≥ 4 caractères).

## Build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run test          # watch mode
npm run test:run     # single run
npm run test:coverage # run with coverage (output in coverage/)
```

## Écrans

1. **Login** – Carte centrée, email / mot de passe, états chargement / erreur  
2. **Dashboard** – Ventes / Dépenses / Bénéfice, tops produits, stock faible, répartition paiements  
3. **Produits** – Liste, recherche, filtre stock, modal ajout/édition  
4. **POS** – Recherche, catégories, panier, total, remise, Espèces / Wave / Orange Money, « Valider la vente »  
5. **Reçu** – Résumé vente, imprimer, nouvelle vente  
6. **Clients** – Liste, solde, ajout paiement  
7. **Dépenses** – Formulaire catégorie, montant, description  
8. **Rapports** – Onglets Jour / Semaine / Mois, graphiques, export PDF / Excel  
9. **Paramètres** – Infos entreprise, abonnement, utilisateurs, déconnexion  

Microcopy en français (pas de jargon technique).
