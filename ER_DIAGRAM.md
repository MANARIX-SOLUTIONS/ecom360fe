# 360 PME Commerce — Entity-Relationship Diagram

> Database schema designed to support all current features and be open for future extension.

---

## ER Diagram (Mermaid)

```mermaid
erDiagram

    %% ============================================================
    %% PLATFORM / MULTI-TENANT CORE
    %% ============================================================

    PLATFORM_CONFIG {
        uuid    id               PK
        string  key              UK   "e.g. maintenance_mode, default_locale"
        text    value
        timestamp created_at
        timestamp updated_at
    }

    PLAN {
        uuid    id               PK
        string  slug             UK   "starter | pro | business"
        string  name                  "Display name"
        integer price_monthly         "In FCFA"
        integer price_yearly          "In FCFA"
        integer max_users             "0 = unlimited"
        integer max_stores            "0 = unlimited"
        integer max_products          "0 = unlimited"
        integer max_sales_per_month   "0 = unlimited"
        integer max_clients           "0 = unlimited"
        integer max_suppliers         "0 = unlimited"
        boolean feature_expenses
        boolean feature_reports
        boolean feature_advanced_reports
        boolean feature_multi_payment
        boolean feature_export_pdf
        boolean feature_export_excel
        boolean feature_client_credits
        boolean feature_supplier_tracking
        boolean feature_role_management
        boolean feature_api
        boolean feature_custom_branding
        boolean feature_priority_support
        boolean feature_account_manager
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    BUSINESS {
        uuid    id               PK
        string  name
        string  email            UK
        string  phone
        text    address
        string  logo_url              "nullable — Business plan only"
        string  tax_id                "nullable — NINEA / fiscal ID"
        string  currency              "default: XOF"
        string  locale                "default: fr"
        string  status                "active | suspended | trial | churned"
        date    trial_ends_at         "nullable"
        timestamp created_at
        timestamp updated_at
    }

    SUBSCRIPTION {
        uuid    id               PK
        uuid    business_id      FK
        uuid    plan_id          FK
        string  billing_cycle         "monthly | yearly"
        string  status                "active | past_due | cancelled | trialing"
        date    current_period_start
        date    current_period_end
        date    cancelled_at          "nullable"
        timestamp created_at
        timestamp updated_at
    }

    INVOICE {
        uuid    id               PK
        uuid    business_id      FK
        uuid    subscription_id  FK
        string  number           UK   "INV-2026-0001"
        integer amount                "In FCFA"
        string  status                "draft | paid | overdue | void"
        string  payment_method        "wave | orange_money | card | bank_transfer"
        date    due_date
        date    paid_at               "nullable"
        timestamp created_at
    }

    %% ============================================================
    %% USERS & AUTH
    %% ============================================================

    USER {
        uuid    id               PK
        string  full_name
        string  email            UK
        string  phone                 "nullable"
        string  password_hash
        string  avatar_url            "nullable"
        string  locale                "default: fr"
        boolean is_platform_admin     "Super Admin flag"
        boolean is_active
        timestamp last_login_at       "nullable"
        timestamp created_at
        timestamp updated_at
    }

    BUSINESS_USER {
        uuid    id               PK
        uuid    business_id      FK
        uuid    user_id          FK
        string  role                  "proprietaire | gestionnaire | caissier"
        boolean is_active
        timestamp invited_at
        timestamp accepted_at         "nullable"
        timestamp created_at
        timestamp updated_at
    }

    SESSION {
        uuid    id               PK
        uuid    user_id          FK
        string  token_hash       UK
        string  ip_address
        string  user_agent
        timestamp expires_at
        timestamp created_at
    }

    PASSWORD_RESET {
        uuid    id               PK
        uuid    user_id          FK
        string  token_hash       UK
        boolean used
        timestamp expires_at
        timestamp created_at
    }

    %% ============================================================
    %% STORES
    %% ============================================================

    STORE {
        uuid    id               PK
        uuid    business_id      FK
        string  name
        text    address               "nullable"
        string  phone                 "nullable"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    %% ============================================================
    %% PRODUCTS & INVENTORY
    %% ============================================================

    CATEGORY {
        uuid    id               PK
        uuid    business_id      FK
        string  name
        string  color                 "UI display color"
        integer sort_order
        timestamp created_at
    }

    PRODUCT {
        uuid    id               PK
        uuid    business_id      FK
        uuid    category_id      FK   "nullable"
        string  name
        string  sku                   "nullable — stock keeping unit"
        string  barcode               "nullable"
        text    description           "nullable"
        integer cost_price            "Purchase price in FCFA"
        integer sale_price            "Selling price in FCFA"
        string  unit                  "default: pièce (kg, L, etc.)"
        string  image_url             "nullable"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PRODUCT_STORE_STOCK {
        uuid    id               PK
        uuid    product_id       FK
        uuid    store_id         FK
        integer quantity              "Current stock level"
        integer min_stock             "Low stock threshold"
        timestamp updated_at
    }

    STOCK_MOVEMENT {
        uuid    id               PK
        uuid    product_id       FK
        uuid    store_id         FK
        uuid    user_id          FK   "Who performed the movement"
        string  type                  "in | out | adjustment | sale | return"
        integer quantity              "Signed: + for in, - for out"
        integer quantity_before
        integer quantity_after
        string  reference             "nullable — e.g. sale_id, purchase_id"
        text    note                  "nullable"
        timestamp created_at
    }

    %% ============================================================
    %% CLIENTS & CREDITS
    %% ============================================================

    CLIENT {
        uuid    id               PK
        uuid    business_id      FK
        string  name
        string  phone                 "nullable"
        string  email                 "nullable"
        text    address               "nullable"
        text    notes                 "nullable"
        integer credit_balance        "Positive = client owes, Negative = overpaid"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    CLIENT_PAYMENT {
        uuid    id               PK
        uuid    client_id        FK
        uuid    store_id         FK
        uuid    user_id          FK   "Recorded by"
        integer amount                "In FCFA"
        string  payment_method        "cash | wave | orange_money"
        text    note                  "nullable"
        timestamp created_at
    }

    %% ============================================================
    %% SUPPLIERS & PURCHASES
    %% ============================================================

    SUPPLIER {
        uuid    id               PK
        uuid    business_id      FK
        string  name
        string  phone                 "nullable"
        string  email                 "nullable"
        text    address               "nullable"
        integer balance               "Negative = we owe them"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PURCHASE_ORDER {
        uuid    id               PK
        uuid    business_id      FK
        uuid    supplier_id      FK
        uuid    store_id         FK   "Receiving store"
        uuid    user_id          FK   "Created by"
        string  reference        UK   "CMD-001"
        string  status                "draft | ordered | received | cancelled"
        integer total_amount
        date    expected_date         "nullable"
        date    received_date         "nullable"
        text    note                  "nullable"
        timestamp created_at
        timestamp updated_at
    }

    PURCHASE_ORDER_LINE {
        uuid    id               PK
        uuid    purchase_order_id FK
        uuid    product_id       FK
        integer quantity
        integer unit_cost
        integer line_total
    }

    SUPPLIER_PAYMENT {
        uuid    id               PK
        uuid    supplier_id      FK
        uuid    user_id          FK   "Recorded by"
        integer amount
        string  payment_method
        text    note                  "nullable"
        timestamp created_at
    }

    %% ============================================================
    %% SALES / POS
    %% ============================================================

    SALE {
        uuid    id               PK
        uuid    business_id      FK
        uuid    store_id         FK
        uuid    user_id          FK   "Cashier / seller"
        uuid    client_id        FK   "nullable — walk-in if null"
        string  receipt_number   UK   "T1A2B3C"
        string  payment_method        "cash | wave | orange_money | credit"
        integer subtotal
        integer discount_amount       "0 if no discount"
        integer total
        integer amount_received       "nullable — for cash change calc"
        integer change_given          "nullable"
        string  status                "completed | voided | refunded"
        text    note                  "nullable"
        timestamp created_at
    }

    SALE_LINE {
        uuid    id               PK
        uuid    sale_id          FK
        uuid    product_id       FK
        string  product_name          "Snapshot at time of sale"
        integer quantity
        integer unit_price            "Snapshot at time of sale"
        integer line_total
    }

    %% ============================================================
    %% EXPENSES
    %% ============================================================

    EXPENSE_CATEGORY {
        uuid    id               PK
        uuid    business_id      FK
        string  name                  "achats | transport | loyer | salaires | divers"
        string  color                 "UI color"
        integer sort_order
        timestamp created_at
    }

    EXPENSE {
        uuid    id               PK
        uuid    business_id      FK
        uuid    store_id         FK   "nullable — business-wide if null"
        uuid    user_id          FK   "Recorded by"
        uuid    category_id      FK
        integer amount
        text    description           "nullable"
        date    expense_date
        string  receipt_url           "nullable — photo of receipt"
        timestamp created_at
        timestamp updated_at
    }

    %% ============================================================
    %% NOTIFICATIONS
    %% ============================================================

    NOTIFICATION {
        uuid    id               PK
        uuid    business_id      FK   "nullable — platform-wide if null"
        uuid    user_id          FK   "Recipient"
        string  type                  "low_stock | payment_received | subscription | system"
        string  title
        text    body
        string  action_url            "nullable — deeplink"
        boolean is_read
        timestamp read_at             "nullable"
        timestamp created_at
    }

    %% ============================================================
    %% AUDIT / LOGS
    %% ============================================================

    AUDIT_LOG {
        uuid    id               PK
        uuid    business_id      FK   "nullable"
        uuid    user_id          FK   "nullable"
        string  action                "create | update | delete | login | logout"
        string  entity_type           "sale | product | client | user | ..."
        uuid    entity_id             "nullable"
        jsonb   changes               "nullable — old/new values"
        string  ip_address
        timestamp created_at
    }

    %% ============================================================
    %% FEATURE FLAGS (PLATFORM)
    %% ============================================================

    FEATURE_FLAG {
        uuid    id               PK
        string  key              UK   "notifications | mobile_pwa | analytics | api"
        string  label
        text    description
        boolean is_enabled
        timestamp updated_at
    }

    %% ============================================================
    %% EXTENSION POINTS (FUTURE)
    %% ============================================================

    WEBHOOK {
        uuid    id               PK
        uuid    business_id      FK
        string  url
        string  events                "comma-separated: sale.created, stock.low, ..."
        string  secret_hash
        boolean is_active
        timestamp created_at
    }

    API_KEY {
        uuid    id               PK
        uuid    business_id      FK
        string  key_hash         UK
        string  label
        string  permissions           "read | write | admin"
        date    expires_at            "nullable"
        boolean is_active
        timestamp created_at
    }

    %% ============================================================
    %% RELATIONSHIPS
    %% ============================================================

    %% Business & Plan
    PLAN              ||--o{ SUBSCRIPTION       : "defines"
    BUSINESS          ||--o{ SUBSCRIPTION       : "subscribes"
    BUSINESS          ||--o{ INVOICE            : "billed"
    SUBSCRIPTION      ||--o{ INVOICE            : "generates"

    %% Business & Users
    BUSINESS          ||--o{ BUSINESS_USER      : "has members"
    USER              ||--o{ BUSINESS_USER      : "belongs to"
    USER              ||--o{ SESSION            : "authenticates"
    USER              ||--o{ PASSWORD_RESET     : "requests"

    %% Business & Stores
    BUSINESS          ||--o{ STORE              : "owns"

    %% Products & Inventory
    BUSINESS          ||--o{ CATEGORY           : "defines"
    BUSINESS          ||--o{ PRODUCT            : "catalogs"
    CATEGORY          ||--o{ PRODUCT            : "groups"
    PRODUCT           ||--o{ PRODUCT_STORE_STOCK : "stocked in"
    STORE             ||--o{ PRODUCT_STORE_STOCK : "holds"
    PRODUCT           ||--o{ STOCK_MOVEMENT     : "tracks"
    STORE             ||--o{ STOCK_MOVEMENT     : "occurs in"
    USER              ||--o{ STOCK_MOVEMENT     : "performed by"

    %% Clients
    BUSINESS          ||--o{ CLIENT             : "serves"
    CLIENT            ||--o{ CLIENT_PAYMENT     : "pays"
    STORE             ||--o{ CLIENT_PAYMENT     : "received at"
    USER              ||--o{ CLIENT_PAYMENT     : "recorded by"

    %% Suppliers
    BUSINESS          ||--o{ SUPPLIER           : "buys from"
    SUPPLIER          ||--o{ PURCHASE_ORDER     : "receives orders"
    BUSINESS          ||--o{ PURCHASE_ORDER     : "places"
    STORE             ||--o{ PURCHASE_ORDER     : "receives at"
    USER              ||--o{ PURCHASE_ORDER     : "created by"
    PURCHASE_ORDER    ||--o{ PURCHASE_ORDER_LINE : "contains"
    PRODUCT           ||--o{ PURCHASE_ORDER_LINE : "ordered"
    SUPPLIER          ||--o{ SUPPLIER_PAYMENT   : "paid"
    USER              ||--o{ SUPPLIER_PAYMENT   : "recorded by"

    %% Sales / POS
    BUSINESS          ||--o{ SALE               : "makes"
    STORE             ||--o{ SALE               : "sold at"
    USER              ||--o{ SALE               : "processed by"
    CLIENT            o|--o{ SALE               : "purchased by"
    SALE              ||--o{ SALE_LINE          : "contains"
    PRODUCT           ||--o{ SALE_LINE          : "sold"

    %% Expenses
    BUSINESS          ||--o{ EXPENSE_CATEGORY   : "defines"
    BUSINESS          ||--o{ EXPENSE            : "incurs"
    EXPENSE_CATEGORY  ||--o{ EXPENSE            : "categorizes"
    STORE             o|--o{ EXPENSE            : "at store"
    USER              ||--o{ EXPENSE            : "recorded by"

    %% Notifications
    BUSINESS          o|--o{ NOTIFICATION       : "receives"
    USER              ||--o{ NOTIFICATION       : "notified"

    %% Audit
    BUSINESS          o|--o{ AUDIT_LOG          : "logged"
    USER              o|--o{ AUDIT_LOG          : "acted"

    %% Extension
    BUSINESS          ||--o{ WEBHOOK            : "configures"
    BUSINESS          ||--o{ API_KEY            : "issues"
```

---

## Entity Catalog

### Platform Layer

| Entity | Description |
|---|---|
| **PLATFORM_CONFIG** | Global key-value config (maintenance mode, default locale, etc.) |
| **PLAN** | Subscription plans with feature flags and limits |
| **FEATURE_FLAG** | Platform-wide feature toggles (notifications, PWA, analytics, API) |

### Multi-Tenant Core

| Entity | Description |
|---|---|
| **BUSINESS** | A registered company / commerce on the platform |
| **SUBSCRIPTION** | Links a business to a plan with billing cycle and status |
| **INVOICE** | Payment records for subscriptions |

### Users & Auth

| Entity | Description |
|---|---|
| **USER** | Any person with login credentials. `is_platform_admin` = Super Admin |
| **BUSINESS_USER** | Junction table: a user's role within a specific business |
| **SESSION** | Active login sessions for token-based auth |
| **PASSWORD_RESET** | One-time password reset tokens |

### Stores

| Entity | Description |
|---|---|
| **STORE** | A physical point of sale belonging to a business |

### Products & Inventory

| Entity | Description |
|---|---|
| **CATEGORY** | Product categories defined per business (Alimentation, Boissons, Hygiène) |
| **PRODUCT** | Items for sale with cost/sale prices, SKU, barcode |
| **PRODUCT_STORE_STOCK** | Stock level of each product in each store (per-store inventory) |
| **STOCK_MOVEMENT** | Audit trail of every stock change (sale, restock, adjustment, return) |

### Clients & Credits

| Entity | Description |
|---|---|
| **CLIENT** | Customers with contact info and credit balance |
| **CLIENT_PAYMENT** | Payments received from clients toward their credit balance |

### Suppliers & Purchases

| Entity | Description |
|---|---|
| **SUPPLIER** | Vendors the business buys from |
| **PURCHASE_ORDER** | Orders placed with suppliers (with status workflow) |
| **PURCHASE_ORDER_LINE** | Line items within a purchase order |
| **SUPPLIER_PAYMENT** | Payments made to suppliers |

### Sales / POS

| Entity | Description |
|---|---|
| **SALE** | A completed POS transaction with payment method, totals, optional client |
| **SALE_LINE** | Individual product lines within a sale (snapshot of name/price at sale time) |

### Expenses

| Entity | Description |
|---|---|
| **EXPENSE_CATEGORY** | Categories defined per business (achats, transport, loyer, salaires, divers) |
| **EXPENSE** | Recorded business expenses with optional receipt photo |

### Notifications

| Entity | Description |
|---|---|
| **NOTIFICATION** | In-app notifications (low stock, payment received, subscription alerts) |

### Audit & Logs

| Entity | Description |
|---|---|
| **AUDIT_LOG** | Full audit trail of all actions with entity reference and JSON diff |

### Extension Points

| Entity | Description |
|---|---|
| **WEBHOOK** | Outgoing webhook configs for event-driven integrations (Business plan) |
| **API_KEY** | API keys for external access (Business plan) |

---

## Design Decisions

### Multi-Tenancy

Every data entity is scoped to a `business_id`. A single `USER` can belong to multiple businesses via the `BUSINESS_USER` junction table with different roles in each. Platform admins (`is_platform_admin = true`) access the backoffice across all businesses.

### Per-Store Inventory

Stock is tracked per store via `PRODUCT_STORE_STOCK`, allowing multi-store businesses to have independent inventory levels. Every stock change is recorded in `STOCK_MOVEMENT` with a signed quantity and before/after snapshots for full traceability.

### Sale Snapshots

`SALE_LINE` stores `product_name` and `unit_price` at the time of sale, ensuring historical accuracy even if the product is later renamed or repriced.

### Credit System

`CLIENT.credit_balance` is a denormalized running total. Every sale on credit increases it; every `CLIENT_PAYMENT` decreases it. The full history is in `SALE` (where `payment_method = 'credit'`) and `CLIENT_PAYMENT`.

### Plan Feature Gating

The `PLAN` table contains boolean columns for every gated feature (`feature_expenses`, `feature_reports`, etc.) and integer limits (`max_users`, `max_stores`). The application checks these at runtime. Adding a new feature is simply adding a new column with a default.

### Extensibility

| Extension Point | How to Extend |
|---|---|
| **New feature** | Add `feature_*` boolean to `PLAN`, gate in UI |
| **New entity** | Add table with `business_id` FK, follows same pattern |
| **New role** | Add value to `BUSINESS_USER.role` enum, update permissions |
| **New payment method** | Add value to payment method enums on `SALE`, `CLIENT_PAYMENT`, etc. |
| **New notification type** | Add value to `NOTIFICATION.type` enum |
| **External integration** | Use `WEBHOOK` + `API_KEY` tables |
| **New expense category** | Insert into `EXPENSE_CATEGORY` (user-defined per business) |
| **New product fields** | Add columns to `PRODUCT` or use a `PRODUCT_META` JSONB table |
| **Multi-currency** | `BUSINESS.currency` already supports it; add exchange rate table |
| **Localization** | `BUSINESS.locale` and `USER.locale` ready for i18n |

---

## Index Recommendations

```sql
-- High-frequency lookups
CREATE INDEX idx_sale_business_store    ON sale (business_id, store_id, created_at DESC);
CREATE INDEX idx_sale_client            ON sale (client_id)            WHERE client_id IS NOT NULL;
CREATE INDEX idx_sale_line_sale         ON sale_line (sale_id);
CREATE INDEX idx_product_business       ON product (business_id, is_active);
CREATE INDEX idx_product_store_stock    ON product_store_stock (product_id, store_id);
CREATE INDEX idx_stock_movement_product ON stock_movement (product_id, created_at DESC);
CREATE INDEX idx_expense_business_date  ON expense (business_id, expense_date DESC);
CREATE INDEX idx_client_business        ON client (business_id, is_active);
CREATE INDEX idx_supplier_business      ON supplier (business_id, is_active);
CREATE INDEX idx_notification_user      ON notification (user_id, is_read, created_at DESC);
CREATE INDEX idx_audit_log_business     ON audit_log (business_id, created_at DESC);
CREATE INDEX idx_business_user_lookup   ON business_user (user_id, business_id);
CREATE INDEX idx_subscription_business  ON subscription (business_id, status);
```

---

*Designed for PostgreSQL. All `id` columns are UUIDs (v4). Timestamps use `timestamptz`. All monetary values stored as integers in the smallest currency unit (FCFA = no decimals).*
