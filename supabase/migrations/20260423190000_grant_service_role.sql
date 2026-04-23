-- Grant full access on all app tables to service_role.
-- Edge functions use the service_role key (admin client) and need explicit
-- table-level privileges — RLS bypass does not substitute for GRANT.
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update on table public.payment_orders to service_role;
grant select, insert, update on table public.credit_transactions to service_role;
grant select on table public.user_roles to service_role;
grant usage, select on sequence public.credit_transactions_id_seq to service_role;
