-- Patch: Etapa 12 - atualizar catalogo oficial de produtos.
-- Execute no SQL Editor do Supabase antes de publicar/validar a branch.
--
-- Estrategia:
-- - adiciona is_visible para ocultar produtos sem apagar historico;
-- - oculta a maquina de gelo (id 6), preservando contribuicoes vinculadas;
-- - atualiza micro-ondas, almofadas e precos reais;
-- - adiciona cafeteira e fruteira;
-- - remove marcacao de preco de referencia dos produtos visiveis;
-- - bloqueia novas contribuicoes para produtos ocultos.

alter table public.products
add column if not exists is_visible boolean not null default true;

create index if not exists idx_products_is_visible on public.products(is_visible);

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

update public.products
set
  is_visible = false,
  estimated_price = false
where id = 6;

insert into public.products
  (id, name, category, price, priority, type, description, link, status, estimated_price, is_visible)
values
  (2, 'Micro-ondas de Bancada Electrolux Efficient 36L ME36S - 220V Prata', 'Cozinha', 793.12, 'alta', 'colaborativo', 'Micro-ondas grande e eficiente para o uso diário da casa, com capacidade de 36L.', 'https://a.co/d/0hMQB6eW', 'disponivel', false, true),
  (3, 'Almofadas decorativas cheias com zíper invisível', 'Sala / Decoração', 130.00, 'media', 'inteiro', 'Conjunto de almofadas decorativas cheias, em tons terrosos e claros, para deixar a sala mais confortável e bonita.', 'https://www.amazon.com.br/Almofadas-Decorativas-Cheias-Invis%C3%ADvel-Diversas/dp/B0GMJFRYYC/ref=sr_1_26?__mk_pt_BR=%C3%85M%C3%85%C5%BD%C3%95%C3%91&crid=2DNWHKIITJH9S&dib=eyJ2IjoiMSJ9.xP1S6v7-jAyX3W3wMyg-QG_xruK0bUN40EWbmXC1jfemnBKmsnecVmajDuQbpLzypUcq0-tiO-CR2iSbM0XX_iLWKa7nzTNdO2buRrIQbV8nolCuBjl4eGphrQWNE7QPbFxIqRyM8ekAi-bMuM0NPmbhjX_hrdhzVTAVx-sxK49qIL3AHrONn4F_l2xPdS1UZJbvEq1R5EI7SfeKcFS4Y-YBz3656m4evQvmKDdBsWDOBYb6d8UzZegOUnjfAzW2EWhXc0hW6fiD31_mz9yTXHBQJFAkZzQATUc5IGRXmxU.lo7qIP4evHf_4s3m8luBh6n4A2FsIx2rk8wVxRGiZ8M&dib_tag=se&keywords=almofadas%2Bcheias&qid=1777743535&sprefix=almofadas%2Bcheias%2Caps%2C221&sr=8-26&ufe=app_do%3Aamzn1.fos.6a09f7ec-d911-4889-ad70-de8dd83c8a74&th=1', 'disponivel', false, true),
  (7, 'Kit com 3 frigideiras com tampa de vidro', 'Cozinha', 84.90, 'alta', 'inteiro', 'Kit essencial para montar a cozinha.', 'https://www.amazon.com.br/Kit-Com-Frigideiras-Tampa-Vidro/dp/B0GN97NR5Q/', 'disponivel', false, true),
  (12, '2 lixeiras pequenas para o lavabo', 'Banheiro / Lavabo', 70.00, 'media', 'inteiro', 'Duas lixeiras compactas para os lavabos, considerando 2 unidades de R$ 35,00.', 'https://www.amazon.com.br/Viel-Polipropileno-Compacta-Banheiro-Escrit%C3%B3rio/dp/B08YDGR7JK/', 'disponivel', false, true),
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

-- Conferencia rapida apos aplicar:
-- select id, name, price, estimated_price, is_visible from public.products order by id;
-- select product_id, count(*) from public.contributions group by product_id order by product_id;
