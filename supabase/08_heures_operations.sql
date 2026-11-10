-- ══════════════════════════════════════════════════════════════════════════════
-- 08 — Heure exacte des opérations (29 octobre 2026)
--
--  Les ventes, les achats et les mouvements de stock ne gardaient que la DATE
--  du jour. On ajoute l'heure et la minute de l'opération, pour savoir
--  précisément quand une vente ou un achat a été enregistré.
--
--  Les lignes existantes reçoivent la date du jour (valeur par défaut).
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.sales
  add column if not exists created_at timestamptz not null default now();

alter table public.purchases
  add column if not exists created_at timestamptz not null default now();

alter table public.stock_movements
  add column if not exists created_at timestamptz not null default now();

-- Vérification :
--   select table_name, column_name, data_type
--     from information_schema.columns
--    where table_schema = 'public' and column_name = 'created_at'
--    order by table_name;
