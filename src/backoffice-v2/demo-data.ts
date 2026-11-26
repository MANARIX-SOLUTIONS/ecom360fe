import {
  isoDaysAgo,
  type AuditEvent,
  type DemoLead,
  type Payment,
  type PlanId,
  type ServiceHealth,
  type Tenant,
  type TenantStatus,
  type FeatureOverride,
  type Mode,
} from "./model";

type Seed = {
  id: string;
  name: string;
  owner: string;
  sector: string;
  city: string;
  country: string;
  modes: Mode[];
  plan: PlanId;
  status: TenantStatus;
  renewal: string;
  gmv30: number;
  idleDays: number;
  stores: number;
  users: number;
  salesMonth: number;
  products: number;
  tickets?: number;
  demo?: boolean;
  annual?: boolean;
  phone?: string;
  createdDaysAgo?: number;
};

const C = {
  dakar: ["Dakar", "Sénégal"],
  thies: ["Thiès", "Sénégal"],
  sl: ["Saint-Louis", "Sénégal"],
  abj: ["Abidjan", "Côte d'Ivoire"],
  bko: ["Bamako", "Mali"],
} as const;

function row(
  id: string,
  name: string,
  owner: string,
  sector: string,
  place: keyof typeof C,
  modes: Mode[],
  plan: PlanId,
  status: TenantStatus,
  renewal: string,
  gmv30: number,
  idleDays: number,
  extra: Partial<Seed> = {}
): Seed {
  const [city, country] = C[place];
  return {
    id,
    name,
    owner,
    sector,
    city,
    country,
    modes,
    plan,
    status,
    renewal,
    gmv30,
    idleDays,
    stores: extra.stores ?? (plan === "business" ? 2 : 1),
    users: extra.users ?? (plan === "starter" ? 2 : plan === "pro" ? 3 : 5),
    salesMonth: extra.salesMonth ?? Math.max(12, Math.round(gmv30 / 7500)),
    products: extra.products ?? (plan === "starter" ? 80 : plan === "pro" ? 420 : 1600),
    ...extra,
  };
}

const SEEDS: Seed[] = [
  row(
    "muka",
    "Muka",
    "Aïssatou Ndiaye",
    "Salon",
    "dakar",
    ["Prestations"],
    "business",
    "actif",
    "2026-11-03",
    401000,
    0,
    {
      stores: 2,
      users: 8,
      salesMonth: 186,
      products: 240,
      phone: "+221 77 111 20 36",
      createdDaysAgo: 420,
    }
  ),
  row(
    "demo-commerce",
    "Demo Commerce",
    "Sara Diallo",
    "Boutique",
    "dakar",
    ["Commerce"],
    "business",
    "demo",
    "2026-12-01",
    4500,
    1,
    {
      demo: true,
      gmv30: 4500,
      salesMonth: 4,
      phone: "+221 77 000 00 01",
    }
  ),
  row(
    "ecommerce",
    "Ecommerce",
    "Compte test",
    "Boutique",
    "dakar",
    ["Commerce"],
    "starter",
    "demo",
    "2026-12-01",
    4500,
    2,
    {
      demo: true,
      phone: "+221 77 000 00 02",
      salesMonth: 3,
      products: 12,
    }
  ),
  row(
    "garage-sow",
    "Garage Sow",
    "Mamadou Sow",
    "Garage",
    "dakar",
    ["Prestations"],
    "business",
    "impaye",
    "2026-10-08",
    860000,
    1,
    {
      tickets: 1,
      phone: "+221 77 545 18 22",
      salesMonth: 210,
      stores: 1,
      users: 4,
      createdDaysAgo: 260,
    }
  ),
  row(
    "boutique-amina",
    "Boutique Amina",
    "Amina Ba",
    "Mode",
    "thies",
    ["Commerce"],
    "pro",
    "impaye",
    "2026-10-06",
    620000,
    3,
    {
      phone: "+221 76 220 14 90",
      salesMonth: 140,
    }
  ),
  row(
    "salon-bintou",
    "Salon Bintou",
    "Bintou Fall",
    "Salon",
    "dakar",
    ["Prestations"],
    "pro",
    "actif",
    "2026-10-09",
    510000,
    0
  ),
  row(
    "mode-thies",
    "Mode Thiès",
    "Fatou Gueye",
    "Mode",
    "thies",
    ["Commerce", "Vendeur"],
    "starter",
    "actif",
    "2026-10-12",
    280000,
    1
  ),
  row(
    "lagon",
    "Restaurant Lagon",
    "Ibrahima Sarr",
    "Restaurant",
    "sl",
    ["Commerce", "Prestations"],
    "business",
    "actif",
    "2026-10-14",
    1200000,
    0,
    {
      stores: 1,
      users: 9,
      salesMonth: 640,
    }
  ),
  row(
    "keur-yoff",
    "Pharmacie Keur Yoff",
    "Dr. Ndèye Seck",
    "Pharmacie",
    "dakar",
    ["Commerce"],
    "business",
    "actif",
    "2026-11-18",
    2100000,
    0,
    {
      stores: 3,
      users: 11,
      salesMonth: 980,
    }
  ),
  row(
    "epi-medina",
    "Épicerie Médina",
    "Ousmane Diop",
    "Épicerie",
    "dakar",
    ["Commerce"],
    "starter",
    "actif",
    "2026-11-02",
    940000,
    0
  ),
  row(
    "epi-hlm",
    "Épicerie HLM",
    "Coumba Ndao",
    "Épicerie",
    "dakar",
    ["Commerce"],
    "pro",
    "actif",
    "2026-11-22",
    760000,
    2
  ),
  row(
    "salon-saint-louis",
    "Salon Fleuve",
    "Mariama Sy",
    "Salon",
    "sl",
    ["Prestations"],
    "starter",
    "actif",
    "2026-12-04",
    190000,
    4
  ),
  row(
    "garage-thies",
    "Garage Mbaye",
    "Alioune Mbaye",
    "Garage",
    "thies",
    ["Prestations"],
    "pro",
    "actif",
    "2026-11-28",
    430000,
    1
  ),
  row(
    "mode-plateau",
    "Atelier Plateau",
    "Khady Faye",
    "Mode",
    "dakar",
    ["Commerce"],
    "business",
    "actif",
    "2026-12-09",
    1500000,
    0,
    {
      users: 6,
      salesMonth: 320,
    }
  ),
  row(
    "insta-dior",
    "Dior Looks",
    "Dior Camara",
    "Vendeur Instagram",
    "dakar",
    ["Vendeur"],
    "starter",
    "actif",
    "2026-11-11",
    310000,
    0
  ),
  row(
    "insta-bamako",
    "Bamako Style",
    "Awa Traoré",
    "Vendeur Instagram",
    "bko",
    ["Vendeur"],
    "pro",
    "actif",
    "2026-11-19",
    540000,
    2
  ),
  row(
    "resto-almadies",
    "Chez Fatou",
    "Fatou Diagne",
    "Restaurant",
    "dakar",
    ["Commerce", "Prestations"],
    "business",
    "actif",
    "2026-12-02",
    980000,
    0
  ),
  row(
    "pharma-thies",
    "Pharmacie Rex",
    "Dr. Pape Ndiaye",
    "Pharmacie",
    "thies",
    ["Commerce"],
    "business",
    "actif",
    "2026-11-30",
    1600000,
    1,
    {
      stores: 2,
      users: 7,
    }
  ),
  row(
    "pharma-bko",
    "Pharmacie Badalabougou",
    "Dr. Aminata Keita",
    "Pharmacie",
    "bko",
    ["Commerce"],
    "pro",
    "actif",
    "2026-12-16",
    870000,
    5
  ),
  row(
    "salon-cocody",
    "Maison Cocody",
    "Affoué Bamba",
    "Salon",
    "abj",
    ["Prestations"],
    "business",
    "actif",
    "2026-11-25",
    720000,
    1
  ),
  row(
    "mode-treich",
    "Treichville Wear",
    "Yves Kouassi",
    "Mode",
    "abj",
    ["Commerce"],
    "pro",
    "actif",
    "2026-12-08",
    640000,
    6
  ),
  row(
    "epi-adjame",
    "Épicerie Adjamé",
    "Koné Lassina",
    "Épicerie",
    "abj",
    ["Commerce"],
    "starter",
    "actif",
    "2026-11-07",
    410000,
    2
  ),
  row(
    "garage-yop",
    "Garage Yopougon",
    "Koffi Assi",
    "Garage",
    "abj",
    ["Prestations"],
    "business",
    "actif",
    "2026-12-20",
    390000,
    3
  ),
  row(
    "resto-bamako",
    "Maquis Soleil",
    "Mariam Coulibaly",
    "Restaurant",
    "bko",
    ["Commerce"],
    "pro",
    "actif",
    "2026-11-15",
    560000,
    1
  ),
  row(
    "salon-ngor",
    "Salon Ngor",
    "Astou Mbow",
    "Salon",
    "dakar",
    ["Prestations"],
    "starter",
    "actif",
    "2026-12-11",
    150000,
    8
  ),
  row(
    "mode-sicap",
    "Sicap Couture",
    "Ndèye Fatou Sall",
    "Mode",
    "dakar",
    ["Commerce", "Vendeur"],
    "business",
    "actif",
    "2026-11-09",
    1100000,
    0
  ),
  row(
    "epi-rufisque",
    "Épicerie Rufisque",
    "Modou Thiam",
    "Épicerie",
    "dakar",
    ["Commerce"],
    "pro",
    "actif",
    "2026-12-22",
    690000,
    4
  ),
  row(
    "garage-pikine",
    "Garage Pikine",
    "Cheikh Diouf",
    "Garage",
    "dakar",
    ["Prestations"],
    "starter",
    "actif",
    "2026-11-27",
    210000,
    9
  ),
  row(
    "insta-abj",
    "Abidjan Glow",
    "Mariam Ouattara",
    "Vendeur Instagram",
    "abj",
    ["Vendeur"],
    "starter",
    "actif",
    "2026-12-05",
    175000,
    1
  ),
  row(
    "pharma-ouakam",
    "Pharmacie Ouakam",
    "Dr. Sophie Wade",
    "Pharmacie",
    "dakar",
    ["Commerce"],
    "business",
    "actif",
    "2026-12-18",
    1340000,
    0,
    {
      stores: 2,
    }
  ),
  row(
    "resto-thies",
    "Le Baobab",
    "Abdou Karim Ly",
    "Restaurant",
    "thies",
    ["Commerce", "Prestations"],
    "pro",
    "actif",
    "2026-11-21",
    480000,
    2
  ),
  row(
    "salon-bko",
    "Salon Hippodrome",
    "Rokia Dembélé",
    "Salon",
    "bko",
    ["Prestations"],
    "business",
    "actif",
    "2026-12-14",
    360000,
    7
  ),
  row(
    "mode-saint-louis",
    "Saint-Louis Linge",
    "Omar Dia",
    "Mode",
    "sl",
    ["Commerce"],
    "pro",
    "actif",
    "2026-11-05",
    250000,
    16
  ),
  row(
    "epi-saint-louis",
    "Épicerie Guet Ndar",
    "Awa Diop",
    "Épicerie",
    "sl",
    ["Commerce"],
    "starter",
    "actif",
    "2026-12-28",
    330000,
    18
  ),
  row(
    "garage-bko",
    "Garage Magnambougou",
    "Seydou Kanté",
    "Garage",
    "bko",
    ["Prestations"],
    "pro",
    "actif",
    "2026-11-13",
    275000,
    21
  ),
  row(
    "insta-thies",
    "Thiès Market",
    "Bineta Sène",
    "Vendeur Instagram",
    "thies",
    ["Vendeur"],
    "pro",
    "actif",
    "2026-12-01",
    410000,
    30
  ),
  row(
    "essai-wax",
    "Wax & Co",
    "Mame Diarra",
    "Mode",
    "dakar",
    ["Commerce"],
    "starter",
    "essai",
    "2026-10-10",
    0,
    1,
    {
      salesMonth: 6,
      products: 18,
      createdDaysAgo: 6,
    }
  ),
  row(
    "essai-pharma",
    "Cabine Ouakam",
    "Dr. Lamine Cissé",
    "Pharmacie",
    "dakar",
    ["Commerce"],
    "starter",
    "essai",
    "2026-10-13",
    45000,
    2,
    {
      salesMonth: 11,
      createdDaysAgo: 9,
    }
  ),
  row(
    "essai-resto",
    "Snack Point E",
    "Yves Nguessan",
    "Restaurant",
    "abj",
    ["Commerce"],
    "starter",
    "essai",
    "2026-10-24",
    80000,
    1,
    {
      salesMonth: 22,
      createdDaysAgo: 12,
    }
  ),
  row(
    "suspendu-khelcom",
    "Khelcom Pièces",
    "Babacar Faye",
    "Garage",
    "dakar",
    ["Commerce"],
    "pro",
    "suspendu",
    "2026-09-20",
    0,
    40,
    {
      salesMonth: 0,
    }
  ),
  row(
    "resilie-glow",
    "Glow Bar",
    "Nadia Hassan",
    "Salon",
    "abj",
    ["Prestations"],
    "starter",
    "resilie",
    "2026-09-01",
    0,
    55,
    {
      salesMonth: 0,
    }
  ),
];

function slugPhone(index: number): string {
  const n = String(100000 + index * 173).slice(0, 6);
  return `+221 77 ${n.slice(0, 3)} ${n.slice(3)}`;
}

export const SEED_FEATURE_OVERRIDES: FeatureOverride[] = [
  {
    tenantId: "epi-medina",
    featureId: "client_credits",
    enabled: true,
    reason: "Ventes à crédit déjà en place. Accord jusqu'au passage Pro.",
  },
  {
    tenantId: "salon-bintou",
    featureId: "role_management",
    enabled: true,
    reason: "Deux caissières. Accord commercial avant le plan Business.",
  },
  {
    tenantId: "garage-sow",
    featureId: "pos_online_payment",
    enabled: false,
    reason: "Paiement Wave au comptoir retiré pendant l'impayé.",
  },
];

export const TENANTS: Tenant[] = SEEDS.map((seed, index) => ({
  id: seed.id,
  name: seed.name,
  owner: seed.owner,
  email: `${seed.owner
    .toLowerCase()
    .split(" ")[0]
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")}@${seed.id}.sn`,
  phone: seed.phone ?? slugPhone(index),
  city: seed.city,
  country: seed.country,
  sector: seed.sector,
  modes: seed.modes,
  plan: seed.plan,
  cycle: seed.annual ? "annuel" : "mensuel",
  status: seed.status,
  isDemo: Boolean(seed.demo),
  renewal: seed.renewal,
  stores: seed.stores,
  users: seed.users,
  gmv30: seed.gmv30,
  lastActivity: isoDaysAgo(seed.idleDays),
  createdAt: isoDaysAgo(seed.createdDaysAgo ?? 80 + index * 7),
  salesMonth: seed.salesMonth,
  products: seed.products,
  openTickets: seed.tickets ?? 0,
}));

export const STORY_TENANT_ID = "garage-sow";
export const STORY_PAYMENT_ID = "pay-garage-sow";

export const PAYMENTS: Payment[] = [
  {
    id: STORY_PAYMENT_ID,
    tenantId: STORY_TENANT_ID,
    amount: 35000,
    plan: "business",
    channel: "Wave",
    status: "echoue",
    at: "2026-10-08T08:14:00Z",
    ref: "PDY-WAVE-88421",
    invoice: "FAC-2026-1044",
  },
  {
    id: "pay-amina",
    tenantId: "boutique-amina",
    amount: 25000,
    plan: "pro",
    channel: "Wave",
    status: "echoue",
    at: "2026-10-07T16:02:00Z",
    ref: "PDY-WAVE-88302",
    invoice: "FAC-2026-1038",
  },
  {
    id: "pay-medina",
    tenantId: "epi-medina",
    amount: 15000,
    plan: "starter",
    channel: "Orange Money",
    status: "echoue",
    at: "2026-10-06T11:40:00Z",
    ref: "PDY-OM-77190",
    invoice: "FAC-2026-1031",
  },
  {
    id: "pay-muka",
    tenantId: "muka",
    amount: 35000,
    plan: "business",
    channel: "Wave",
    status: "reussi",
    at: "2026-10-03T09:12:00Z",
    ref: "PDY-WAVE-87990",
    invoice: "FAC-2026-1012",
  },
  {
    id: "pay-lagon",
    tenantId: "lagon",
    amount: 35000,
    plan: "business",
    channel: "Orange Money",
    status: "reussi",
    at: "2026-09-14T10:00:00Z",
    ref: "PDY-OM-76012",
    invoice: "FAC-2026-0988",
  },
  {
    id: "pay-keur",
    tenantId: "keur-yoff",
    amount: 35000,
    plan: "business",
    channel: "Virement",
    status: "reussi",
    at: "2026-09-18T15:22:00Z",
    ref: "VIR-4491",
    invoice: "FAC-2026-0994",
  },
];

export const LEADS: DemoLead[] = [
  {
    id: "lead-1",
    business: "Salon Teranga",
    sector: "Salon",
    mode: "Prestations",
    city: "Dakar",
    phone: "+221 78 441 09 12",
    source: "Landing",
    stage: "nouvelle",
    owner: "Non assigné",
  },
  {
    id: "lead-2",
    business: "Primeurs Liberté",
    sector: "Épicerie",
    mode: "Commerce",
    city: "Dakar",
    phone: "+221 77 902 33 18",
    source: "WhatsApp",
    stage: "nouvelle",
    owner: "Moussa Ndiaye",
  },
  {
    id: "lead-3",
    business: "Garage des Almadies",
    sector: "Garage",
    mode: "Prestations",
    city: "Dakar",
    phone: "+221 76 118 44 20",
    source: "Bouche-à-oreille",
    stage: "contactee",
    owner: "Moussa Ndiaye",
  },
  {
    id: "lead-4",
    business: "Maison Wax Abidjan",
    sector: "Mode",
    mode: "Commerce",
    city: "Abidjan",
    phone: "+225 07 12 44 90",
    source: "Landing",
    stage: "demo",
    owner: "Awa Diop",
  },
];

export const SERVICES: ServiceHealth[] = [
  { name: "API", status: "ok", detail: "48 ms" },
  { name: "Base de données", status: "ok", detail: "6 ms" },
  { name: "Files / jobs", status: "ok", detail: "3 échecs sur 24 h" },
  { name: "CDN", status: "ok", detail: "Opérationnel" },
  { name: "SSL", status: "ok", detail: "Certificat valide" },
  { name: "PayDunya", status: "ok", detail: "210 ms" },
  { name: "WhatsApp", status: "ok", detail: "180 ms" },
  { name: "SMS", status: "degraded", detail: "Latence 1,8 s" },
  { name: "Email", status: "ok", detail: "Opérationnel" },
];

export const MONTH_MOVEMENT = {
  nouveau: 45000,
  expansion: 10000,
  contraction: 10000,
  churn: 35000,
};

export const MRR_HISTORY_OFFSETS = [120000, 98000, 74000, 51000, 28000, 10000, 0];

export const CONVERSION = { demos: 46, paid: 18 };

export const FAILED_JOBS_24H = 3;

export const SEED_AUDIT: AuditEvent[] = [
  {
    id: "aud-login-fail",
    at: "2026-10-08T07:02:00Z",
    actor: "Inconnu",
    actorType: "systeme",
    action: "a échoué à se connecter au backoffice (mot de passe incorrect)",
    target: "Équipe interne",
    tenantId: null,
    tenantName: "—",
    ip: "102.164.22.19",
    country: "Sénégal",
    severity: "attention",
    requestId: "req_8f3a1c",
    userAgent: "Chrome 129 · macOS",
  },
  {
    id: "aud-wave-fail",
    at: "2026-10-08T08:14:00Z",
    actor: "PayDunya",
    actorType: "systeme",
    action: "a signalé un paiement Wave échoué de 35 000 F pour Garage Sow",
    target: "Abonnement Business",
    tenantId: "garage-sow",
    tenantName: "Garage Sow",
    ip: "—",
    country: "—",
    severity: "attention",
    requestId: "req_pd_88421",
    userAgent: "PayDunya webhook",
    before: "Statut paiement : en attente",
    after: "Statut paiement : échoué · abonnement impayé",
  },
  {
    id: "aud-plan",
    at: "2026-10-05T14:22:00Z",
    actor: "Awa Diop",
    actorType: "staff",
    action: "a changé le plan de Muka : Pro → Business",
    target: "Muka",
    tenantId: "muka",
    tenantName: "Muka",
    ip: "41.82.10.4",
    country: "Sénégal",
    severity: "critique",
    requestId: "req_11ab90",
    userAgent: "Chrome 129 · macOS",
    before: "Plan : Pro · 25 000 F / mois",
    after: "Plan : Business · 35 000 F / mois",
  },
  {
    id: "aud-imp",
    at: "2026-10-04T11:05:00Z",
    actor: "Awa Diop",
    actorType: "staff",
    action: "a ouvert une session d'assistance sur Pharmacie Keur Yoff (lecture seule, 30 min)",
    target: "Pharmacie Keur Yoff",
    tenantId: "keur-yoff",
    tenantName: "Pharmacie Keur Yoff",
    ip: "41.82.10.4",
    country: "Sénégal",
    severity: "critique",
    requestId: "req_77cde2",
    userAgent: "Chrome 129 · macOS",
    before: "Aucune session",
    after: "Session lecture seule · motif : ticket #184",
  },
  {
    id: "aud-incident",
    at: "2026-10-07T11:40:00Z",
    actor: "Système",
    actorType: "systeme",
    action: "a clos l'incident « Latence du fournisseur WhatsApp »",
    target: "WhatsApp",
    tenantId: null,
    tenantName: "Plateforme",
    ip: "—",
    country: "—",
    severity: "info",
    requestId: "req_inc_22",
    userAgent: "monitor",
    before: "WhatsApp : dégradé",
    after: "WhatsApp : opérationnel",
  },
];

export const OPEN_TICKETS = [
  {
    id: "T-204",
    tenantId: "garage-sow",
    title: "Paiement Wave refusé ce matin",
    channel: "WhatsApp",
    priority: "Haute",
    waiting: "2 h",
  },
  {
    id: "T-198",
    tenantId: "muka",
    title: "Question sur les commissions coiffeuses",
    channel: "In-app",
    priority: "Normale",
    waiting: "1 j",
  },
];
