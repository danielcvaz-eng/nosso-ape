-- Patch: estabilizar confirmacao/rejeicao manual no modo moradores.
-- Execute no SQL Editor do Supabase depois dos patches anteriores.

drop policy if exists "Public can read confirmed contribution progress inputs" on public.contributions;

create policy "Public can read confirmed contribution progress inputs"
on public.contributions
for select
to anon
using (status = 'confirmed');

grant select (id, product_id, amount, status) on public.contributions to anon;

grant usage on schema public to authenticated;
grant select, update on public.products to authenticated;
grant select, update on public.contributions to authenticated;
grant select on public.allowed_admins to authenticated;
grant execute on function public.current_user_is_admin() to authenticated;

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

alter function public.confirm_contribution(uuid) security invoker;
alter function public.reject_contribution(uuid, text) security invoker;

revoke all on function public.confirm_contribution(uuid) from public, anon;
revoke all on function public.reject_contribution(uuid, text) from public, anon;

grant execute on function public.confirm_contribution(uuid) to authenticated;
grant execute on function public.reject_contribution(uuid, text) to authenticated;
