-- Patch: corrigir alerta Security Definer View em product_progress.
-- Execute no SQL Editor do Supabase depois do schema.sql.

alter view public.product_progress set (security_invoker = true);

drop policy if exists "Public can read confirmed contribution progress inputs" on public.contributions;

create policy "Public can read confirmed contribution progress inputs"
on public.contributions
for select
to anon
using (status = 'confirmed');

grant select (id, product_id, amount, status) on public.contributions to anon;
