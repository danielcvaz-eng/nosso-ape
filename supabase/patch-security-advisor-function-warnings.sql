-- Patch: reduzir warnings do Security Advisor em funcoes publicas.
-- Execute no SQL Editor do Supabase depois do schema.sql.

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

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
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
set search_path = public
as $$
declare
  target_contribution public.contributions;
  target_product public.products;
  confirmed_total numeric(10, 2);
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
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

  select * into target_product
  from public.products
  where id = target_contribution.product_id;

  if target_product.type = 'inteiro' then
    update public.products
    set status = 'recebido'
    where id = target_product.id;
  else
    select coalesce(sum(amount), 0)
    into confirmed_total
    from public.contributions
    where product_id = target_product.id
      and status = 'confirmed';

    if confirmed_total >= target_product.price then
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
set search_path = public
as $$
declare
  target_contribution public.contributions;
begin
  if not public.current_user_is_admin() then
    raise exception 'not authorized';
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

drop policy if exists "Admins can read allowed admins" on public.allowed_admins;

create policy "Admins can read allowed admins"
on public.allowed_admins
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
