-- Nosso Ape - Supabase schema
-- Execute este arquivo no SQL Editor do Supabase.
-- Ele cria tabelas, seeds, RLS e policies para o frontend publicado no GitHub Pages.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id integer primary key,
  name text not null,
  category text not null,
  price numeric(10, 2) not null check (price > 0),
  priority text not null check (priority in ('alta', 'media', 'baixa')),
  type text not null check (type in ('inteiro', 'colaborativo')),
  description text not null,
  link text not null,
  status text not null default 'disponivel' check (status in ('disponivel', 'reservado', 'recebido')),
  estimated_price boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  product_id integer not null references public.products(id) on delete restrict,
  giver_name text not null check (char_length(trim(giver_name)) between 2 and 120),
  giver_message text check (giver_message is null or char_length(giver_message) <= 500),
  amount numeric(10, 2) not null check (amount > 0),
  contribution_type text not null check (contribution_type in ('inteiro', 'colaborativo')),
  payment_method text not null default 'pix' check (payment_method = 'pix'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id),
  confirmed_by_email text,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 300),
  constraint contribution_confirmation_consistency check (
    (status = 'pending' and confirmed_at is null and confirmed_by is null and confirmed_by_email is null)
    or
    (status in ('confirmed', 'rejected') and confirmed_at is not null and confirmed_by is not null and confirmed_by_email is not null)
  )
);

create table if not exists public.allowed_admins (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint allowed_admins_email_lowercase check (email = lower(email))
);

create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_products_is_visible on public.products(is_visible);
create index if not exists idx_contributions_product_id on public.contributions(product_id);
create index if not exists idx_contributions_status on public.contributions(status);
create index if not exists idx_contributions_created_at on public.contributions(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.confirm_contribution(contribution_id uuid)
returns public.contributions
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_contribution public.contributions;
  target_product public.products;
  confirmed_total numeric(10, 2);
  next_total numeric(10, 2);
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into target_contribution
  from public.contributions
  where id = contribution_id
    and status = 'pending'
  for update;

  if target_contribution.id is null then
    raise exception 'pending contribution not found';
  end if;

  select * into target_product
  from public.products
  where id = target_contribution.product_id
  for update;

  if target_product.id is null then
    raise exception 'product not found';
  end if;

  if target_product.status = 'recebido' then
    raise exception 'product already received';
  end if;

  if target_product.type = 'inteiro' then
    if target_contribution.contribution_type <> 'inteiro' or target_contribution.amount <> target_product.price then
      raise exception 'invalid whole contribution amount';
    end if;
  else
    if target_contribution.contribution_type <> 'colaborativo' then
      raise exception 'invalid collaborative contribution type';
    end if;

    select coalesce(sum(amount), 0)
    into confirmed_total
    from public.contributions
    where product_id = target_product.id
      and status = 'confirmed';

    next_total := confirmed_total + target_contribution.amount;

    if next_total > target_product.price then
      raise exception 'contribution exceeds remaining amount';
    end if;
  end if;

  update public.contributions
  set
    status = 'confirmed',
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    confirmed_by_email = lower(coalesce(auth.jwt() ->> 'email', '')),
    rejection_reason = null
  where id = contribution_id
    and status = 'pending'
  returning * into target_contribution;

  if target_contribution.id is null then
    raise exception 'pending contribution not found';
  end if;

  if target_product.type = 'inteiro' then
    update public.products
    set status = 'recebido'
    where id = target_product.id;
  else
    if next_total >= target_product.price then
      update public.products
      set status = 'recebido'
      where id = target_product.id;
    end if;
  end if;

  return target_contribution;
end;
$$;

create or replace function public.reject_contribution(contribution_id uuid, reason text default null)
returns public.contributions
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_contribution public.contributions;
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.contributions
  set
    status = 'rejected',
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    confirmed_by_email = lower(coalesce(auth.jwt() ->> 'email', '')),
    rejection_reason = nullif(trim(reason), '')
  where id = contribution_id
    and status = 'pending'
  returning * into target_contribution;

  if target_contribution.id is null then
    raise exception 'pending contribution not found';
  end if;

  return target_contribution;
end;
$$;

create or replace view public.product_progress
with (security_invoker = true)
as
select
  products.id as product_id,
  coalesce(sum(contributions.amount) filter (where contributions.status = 'confirmed'), 0)::numeric(10, 2) as confirmed_amount,
  count(contributions.id) filter (where contributions.status = 'confirmed')::integer as confirmed_count
from public.products
left join public.contributions on contributions.product_id = products.id
group by products.id;

alter table public.products enable row level security;
alter table public.contributions enable row level security;
alter table public.allowed_admins enable row level security;

drop policy if exists "Public can read products" on public.products;
drop policy if exists "Public can read visible products" on public.products;
create policy "Public can read visible products"
on public.products
for select
to anon, authenticated
using (is_visible);

drop policy if exists "Admins can read products" on public.products;
create policy "Admins can read products"
on public.products
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

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
      and products.is_visible
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

drop policy if exists "Public can read confirmed contribution progress inputs" on public.contributions;
create policy "Public can read confirmed contribution progress inputs"
on public.contributions
for select
to anon
using (status = 'confirmed');

drop policy if exists "Admins can read contributions" on public.contributions;
create policy "Admins can read contributions"
on public.contributions
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can update contributions" on public.contributions;
create policy "Admins can update contributions"
on public.contributions
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can read allowed admins" on public.allowed_admins;
create policy "Admins can read allowed admins"
on public.allowed_admins
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

revoke all on function public.confirm_contribution(uuid) from public, anon;
revoke all on function public.reject_contribution(uuid, text) from public, anon;
revoke all on function public.current_user_is_admin() from public, anon;

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_progress to anon, authenticated;
grant insert on public.contributions to anon, authenticated;
grant select (id, product_id, amount, status) on public.contributions to anon;
grant select, update on public.products to authenticated;
grant select, update on public.contributions to authenticated;
grant select on public.allowed_admins to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.confirm_contribution(uuid) to authenticated;
grant execute on function public.reject_contribution(uuid, text) to authenticated;

insert into public.allowed_admins (email)
values
  ('dvaz538@gmail.com'),
  ('nathamgil10@gmail.com')
on conflict (email) do nothing;

insert into public.products
  (id, name, category, price, priority, type, description, link, status, estimated_price, is_visible)
values
  (1, 'Lava e seca Electrolux Inverter 12kg LFC12', 'Lavanderia', 3019.00, 'alta', 'colaborativo', 'Item essencial para a rotina da casa.', 'https://www.magazineluiza.com.br/lavadora-de-roupas-electrolux-inverter-12kg-cesto-inox-8-programas-de-lavagem-agua-quente-cinza-onix-lfc12/p/241186800/ed/ela1/?seller_id=magazineluiza', 'disponivel', false, true),
  (2, 'Micro-ondas de Bancada Electrolux Efficient 36L ME36S - 220V Prata', 'Cozinha', 793.12, 'alta', 'colaborativo', 'Micro-ondas grande e eficiente para o uso diário da casa, com capacidade de 36L.', 'https://a.co/d/0hMQB6eW', 'disponivel', false, true),
  (3, 'Almofadas decorativas cheias com zíper invisível', 'Sala / Decoração', 130.00, 'media', 'inteiro', 'Conjunto de almofadas decorativas cheias, em tons terrosos e claros, para deixar a sala mais confortável e bonita.', 'https://www.amazon.com.br/Almofadas-Decorativas-Cheias-Invis%C3%ADvel-Diversas/dp/B0GMJFRYYC/ref=sr_1_26?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=2DNWHKIITJH9S&dib=eyJ2IjoiMSJ9.xP1S6v7-jAyX3W3wMyg-QG_xruK0bUN40EWbmXC1jfemnBKmsnecVmajDuQbpLzypUcq0-tiO-CR2iSbM0XX_iLWKa7nzTNdO2buRrIQbV8nolCuBjl4eGphrQWNE7QPbFxIqRyM8ekAi-bMuM0NPmbhjX_hrdhzVTAVx-sxK49qIL3AHrONn4F_l2xPdS1UZJbvEq1R5EI7SfeKcFS4Y-YBz3656m4evQvmKDdBsWDOBYb6d8UzZegOUnjfAzW2EWhXc0hW6fiD31_mz9yTXHBQJFAkZzQATUc5IGRXmxU.lo7qIP4evHf_4s3m8luBh6n4A2FsIx2rk8wVxRGiZ8M&dib_tag=se&keywords=almofadas%2Bcheias&qid=1777743535&sprefix=almofadas%2Bcheias%2Caps%2C221&sr=8-26&ufe=app_do%3Aamzn1.fos.6a09f7ec-d911-4889-ad70-de8dd83c8a74&th=1', 'disponivel', false, true),
  (4, 'Forno elétrico Mondial Family II 42L', 'Cozinha', 369.00, 'media', 'colaborativo', 'Forno elétrico para preparo do dia a dia.', 'https://www.amazon.com.br/Forno-El%C3%A9trico-Family-Mondial-Branco/dp/B0DX2G8NY7/', 'disponivel', false, true),
  (5, 'Panela de pressão elétrica Midea 6L', 'Cozinha', 476.03, 'alta', 'colaborativo', 'Panela elétrica prática para receitas do dia a dia.', 'https://www.amazon.com.br/Panela-Press%C3%A3o-El%C3%A9trica-MasterSteam-Midea/dp/B0B4Q24P9Q/', 'disponivel', false, true),
  (6, 'Máquina de gelo EOS 12kg Ice Compact', 'Cozinha', 489.00, 'baixa', 'colaborativo', 'Item útil para receber visitas e ocasiões especiais.', 'https://www.amazon.com.br/M%C3%A1quina-EOS-Compact-Black-EMG06P/dp/B0DX79WRJF/', 'disponivel', false, false),
  (7, 'Kit com 3 frigideiras com tampa de vidro', 'Cozinha', 84.90, 'alta', 'inteiro', 'Kit essencial para montar a cozinha.', 'https://www.amazon.com.br/Kit-Com-Frigideiras-Tampa-Vidro/dp/B0GN97NR5Q/', 'disponivel', false, true),
  (8, 'Assadeira / forma retangular antiaderente', 'Cozinha', 24.69, 'media', 'inteiro', 'Item útil para assados e preparos no forno.', 'https://www.amazon.com.br/Assadeira-Retangular-Antiaderente-Revestimento-Interno/dp/B0DLWWYCPT/', 'disponivel', false, true),
  (9, 'Marinex - jogo de assadeiras opaline kit 3 unidades', 'Cozinha', 69.50, 'media', 'inteiro', 'Jogo de refratários para forno e mesa.', 'https://www.amazon.com.br/Jogo-Assadeiras-Opaline-Marinex-Nadir/dp/B08G8WD9MF/', 'disponivel', false, true),
  (10, 'Potes herméticos', 'Cozinha', 149.00, 'media', 'inteiro', 'Potes para armazenar mantimentos com organização.', 'https://www.amazon.com.br/Mantimentos-Herm%C3%A9ticos-Silicone-Premium-Madeira/dp/B0DWPSMN9R/', 'disponivel', false, true),
  (11, 'Porta-temperos giratório', 'Cozinha', 35.90, 'media', 'inteiro', 'Organizador para temperos da cozinha.', 'https://www.amazon.com.br/Condimentos-Girat%C3%B3rio-Armazenamento-Especiarias-Resistente/dp/B0GSBF4XV2/', 'disponivel', false, true),
  (12, '2 lixeiras pequenas para o lavabo', 'Banheiro / Lavabo', 70.00, 'media', 'inteiro', 'Duas lixeiras compactas para os lavabos, considerando 2 unidades de R$ 35,00.', 'https://www.amazon.com.br/Viel-Polipropileno-Compacta-Banheiro-Escrit%C3%B3rio/dp/B08YDGR7JK/', 'disponivel', false, true),
  (13, 'Porta-chaves de parede', 'Sala / Organização', 43.00, 'baixa', 'inteiro', 'Organizador de chaves para a entrada da casa.', 'https://www.amazon.com.br/Porta-Chaves-Prateleiras-Ganchos-Branco/dp/B0DWZ7GZVX/', 'disponivel', false, true),
  (14, 'Tapete Casa Dona 200x300 cm caramelo', 'Sala / Decoração', 245.99, 'media', 'colaborativo', 'Tapete grande para compor a sala.', 'https://www.amazon.com.br/Felpudo-Casa-Dona-200x300-Caramelo/dp/B0865V926N/', 'disponivel', false, true),
  (15, 'Mop com cesto de inox', 'Lavanderia / Limpeza', 69.90, 'alta', 'inteiro', 'Item importante para a limpeza da casa.', 'https://www.amazon.com.br/Girat%C3%B3rio-Esfreg%C3%A3o-Limpeza-Microfibra-Centrifuga/dp/B0GVGS8FT1/', 'disponivel', false, true),
  (16, 'Cafeteira Oster Inox Compacta 0,75L OCAF300 - 220V', 'Cozinha', 119.00, 'media', 'inteiro', 'Cafeteira compacta em inox para o café do dia a dia dos moradores.', 'https://a.co/d/0a0ZVY5B', 'disponivel', false, true),
  (17, 'Fruteira Metaltec 3 cestos com rodízios', 'Cozinha', 143.90, 'media', 'inteiro', 'Fruteira de chão com três cestos e rodízios para organizar frutas e itens da cozinha.', 'https://www.amazon.com.br/Metaltec-Fruteira-Resistente-Organizador-Refor%C3%A7ado/dp/B07RCZ552L/ref=sr_1_2_sspa?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=1UB3479VPQ4AR&dib=eyJ2IjoiMSJ9.h4T18FvkROwO74GaygVv8KNd5cf5p-yL9Noh9knZbb0-1w_xjD1COYPvVoOQY986m7L6cZpTBcvgUemh-G_P5R5L1rwtpeKFVLvaRHaVjGB0phiCwcarcEyXn_zlk-6_R_KQgl8l3808CU3srMxp61gCFoyYdj-60UpE2lEBQPSyaVK4QRi980OP2QGusBub_jsOW5-zeD8cjoVaRMI3lLP7HUpFL_0y8zLHbN3xQVDFci4KImmdpY5t5ADN8tubb8lGEOsq9xKXTmig8hFn1B2KVQt1NIV0b8Ldi1PgIv0.5lPOS3hOPMZXzrDHCTKG8NekejU0jMPKVWAEQm1QfRs&dib_tag=se&keywords=fruteira&qid=1777743687&sprefix=fruteira%2Caps%2C223&sr=8-2-spons&ufe=app_do%3Aamzn1.fos.6a09f7ec-d911-4889-ad70-de8dd83c8a74&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&th=1', 'disponivel', false, true)
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  priority = excluded.priority,
  type = excluded.type,
  description = excluded.description,
  link = excluded.link,
  estimated_price = excluded.estimated_price,
  is_visible = excluded.is_visible;
