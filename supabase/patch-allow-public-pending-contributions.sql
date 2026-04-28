-- Patch: permitir insert publico controlado de contribuicoes pending.
-- Execute no SQL Editor do Supabase depois do schema.sql.

drop policy if exists "Public can create pending contributions" on public.contributions;

create policy "Public can create pending contributions"
on public.contributions
for insert
to public
with check (
  status = 'pending'
  and amount > 0
  and payment_method = 'pix'
  and contribution_type in ('inteiro', 'colaborativo')
  and char_length(trim(giver_name)) between 2 and 120
  and (giver_message is null or char_length(giver_message) <= 500)
  and exists (
    select 1
    from public.products
    where products.id = contributions.product_id
      and products.status <> 'recebido'
      and (
        (
          products.type = 'inteiro'
          and contributions.contribution_type = 'inteiro'
          and contributions.amount = products.price
        )
        or
        (
          products.type = 'colaborativo'
          and contributions.amount <= products.price
        )
      )
  )
  and confirmed_at is null
  and confirmed_by is null
  and confirmed_by_email is null
  and rejection_reason is null
);

grant insert on public.contributions to anon, authenticated;
