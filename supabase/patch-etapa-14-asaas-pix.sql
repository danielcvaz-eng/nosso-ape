-- Patch Etapa 14: prepara Pix real via Asaas.
-- Execute no SQL Editor do Supabase depois do schema.sql/patches anteriores.
-- Este patch preserva contribuições confirmadas, itens recebidos e progresso já recebido.

alter table public.contributions
  add column if not exists provider text,
  add column if not exists payment_status text,
  add column if not exists confirmation_source text;

alter table public.contributions
  drop constraint if exists contributions_status_check,
  drop constraint if exists contributions_provider_check,
  drop constraint if exists contributions_payment_status_check,
  drop constraint if exists contributions_confirmation_source_check,
  drop constraint if exists contribution_confirmation_consistency;

alter table public.contributions
  add constraint contributions_status_check
  check (status in ('pending', 'awaiting_payment', 'pending_manual_review', 'confirmed', 'rejected', 'expired', 'failed')),
  add constraint contributions_provider_check
  check (provider is null or provider in ('asaas')),
  add constraint contributions_payment_status_check
  check (payment_status is null or payment_status in ('manual_pending', 'awaiting_payment', 'paid', 'requires_manual_review', 'expired', 'failed', 'manual_confirmed')),
  add constraint contributions_confirmation_source_check
  check (confirmation_source is null or confirmation_source in ('manual', 'manual_fallback', 'asaas_webhook')),
  add constraint contribution_confirmation_consistency
  check (
    (status in ('pending', 'awaiting_payment', 'pending_manual_review', 'expired', 'failed') and confirmed_at is null and confirmed_by is null and confirmed_by_email is null)
    or
    (status = 'confirmed' and confirmed_at is not null and confirmed_by_email is not null and (confirmed_by is not null or confirmation_source = 'asaas_webhook'))
    or
    (status = 'rejected' and confirmed_at is not null and confirmed_by is not null and confirmed_by_email is not null)
  );

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null unique references public.contributions(id) on delete restrict,
  product_id integer not null references public.products(id) on delete restrict,
  provider text not null check (provider in ('asaas')),
  provider_payment_id text not null unique,
  amount numeric(10, 2) not null check (amount > 0),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'paid', 'confirmed', 'requires_manual_review', 'expired', 'failed', 'cancelled')),
  qr_code_payload text,
  qr_code_image text,
  expires_at timestamptz,
  paid_at timestamptz,
  raw_provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('asaas')),
  event_type text not null,
  event_fingerprint text not null unique,
  provider_payment_id text,
  payload jsonb not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'ignored', 'duplicate', 'requires_manual_review', 'failed')),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pix_charge_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  product_id integer references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_contribution_id on public.payments(contribution_id);
create index if not exists idx_payments_provider_payment_id on public.payments(provider_payment_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payment_events_provider_payment_id on public.payment_events(provider_payment_id);
create index if not exists idx_pix_charge_attempts_ip_created_at on public.pix_charge_attempts(ip_hash, created_at desc);

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

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
    and status in ('pending', 'awaiting_payment', 'pending_manual_review')
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

  if not target_product.is_visible then
    raise exception 'product hidden';
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
    payment_status = coalesce(payment_status, 'manual_confirmed'),
    confirmation_source = case
      when provider = 'asaas' then 'manual_fallback'
      else 'manual'
    end,
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    confirmed_by_email = lower(coalesce(auth.jwt() ->> 'email', '')),
    rejection_reason = null
  where id = contribution_id
    and status in ('pending', 'awaiting_payment', 'pending_manual_review')
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

create or replace function public.process_asaas_payment_event(
  event_type text,
  event_fingerprint text,
  provider_payment_id text,
  provider_amount numeric,
  payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_payment public.payments;
  target_contribution public.contributions;
  target_product public.products;
  confirmed_total numeric(10, 2);
  next_total numeric(10, 2);
  paid_events text[] := array['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
begin
  begin
    insert into public.payment_events (
      provider,
      event_type,
      event_fingerprint,
      provider_payment_id,
      payload,
      processing_status
    )
    values (
      'asaas',
      event_type,
      event_fingerprint,
      provider_payment_id,
      coalesce(payload, '{}'::jsonb),
      'received'
    );
  exception
    when unique_violation then
      return jsonb_build_object('status', 'duplicate');
  end;

  if event_type <> all(paid_events) then
    update public.payment_events
    set processing_status = 'ignored', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'ignored', 'event_type', event_type);
  end if;

  select * into target_payment
  from public.payments
  where payments.provider = 'asaas'
    and payments.provider_payment_id = process_asaas_payment_event.provider_payment_id
  for update;

  if target_payment.id is null then
    update public.payment_events
    set processing_status = 'requires_manual_review', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'requires_manual_review', 'reason', 'payment_not_found');
  end if;

  select * into target_contribution
  from public.contributions
  where id = target_payment.contribution_id
  for update;

  select * into target_product
  from public.products
  where id = target_payment.product_id
  for update;

  if target_contribution.id is null or target_product.id is null then
    update public.payments
    set status = 'requires_manual_review', raw_provider_payload = payload
    where id = target_payment.id;

    update public.payment_events
    set processing_status = 'requires_manual_review', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'requires_manual_review', 'reason', 'missing_contribution_or_product');
  end if;

  if target_contribution.status = 'confirmed' then
    update public.payments
    set status = 'paid',
        paid_at = coalesce(paid_at, now()),
        raw_provider_payload = payload
    where id = target_payment.id;

    update public.payment_events
    set processing_status = 'processed', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'already_confirmed');
  end if;

  if abs(coalesce(provider_amount, 0) - target_payment.amount) > 0.01 then
    update public.payments
    set status = 'requires_manual_review',
        raw_provider_payload = payload
    where id = target_payment.id;

    update public.contributions
    set status = 'pending_manual_review',
        payment_status = 'requires_manual_review'
    where id = target_contribution.id
      and status in ('awaiting_payment', 'pending_manual_review', 'failed');

    update public.payment_events
    set processing_status = 'requires_manual_review', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'requires_manual_review', 'reason', 'amount_mismatch');
  end if;

  if not target_product.is_visible or target_product.status = 'recebido' then
    update public.payments
    set status = 'requires_manual_review',
        paid_at = coalesce(paid_at, now()),
        raw_provider_payload = payload
    where id = target_payment.id;

    update public.contributions
    set status = 'pending_manual_review',
        payment_status = 'paid'
    where id = target_contribution.id
      and status in ('awaiting_payment', 'pending_manual_review', 'failed');

    update public.payment_events
    set processing_status = 'requires_manual_review', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'requires_manual_review', 'reason', 'product_unavailable');
  end if;

  if target_product.type = 'inteiro' then
    if target_contribution.contribution_type <> 'inteiro' or target_contribution.amount <> target_product.price then
      update public.payments
      set status = 'requires_manual_review',
          paid_at = coalesce(paid_at, now()),
          raw_provider_payload = payload
      where id = target_payment.id;

      update public.contributions
      set status = 'pending_manual_review',
          payment_status = 'paid'
      where id = target_contribution.id
        and status in ('awaiting_payment', 'pending_manual_review', 'failed');

      update public.payment_events
      set processing_status = 'requires_manual_review', processed_at = now()
      where event_fingerprint = process_asaas_payment_event.event_fingerprint;

      return jsonb_build_object('status', 'requires_manual_review', 'reason', 'invalid_whole_contribution');
    end if;
  else
    select coalesce(sum(amount), 0)
    into confirmed_total
    from public.contributions
    where product_id = target_product.id
      and status = 'confirmed'
      and id <> target_contribution.id;

    next_total := confirmed_total + target_contribution.amount;

    if next_total > target_product.price then
      update public.payments
      set status = 'requires_manual_review',
          paid_at = coalesce(paid_at, now()),
          raw_provider_payload = payload
      where id = target_payment.id;

      update public.contributions
      set status = 'pending_manual_review',
          payment_status = 'paid'
      where id = target_contribution.id
        and status in ('awaiting_payment', 'pending_manual_review', 'failed');

      update public.payment_events
      set processing_status = 'requires_manual_review', processed_at = now()
      where event_fingerprint = process_asaas_payment_event.event_fingerprint;

      return jsonb_build_object('status', 'requires_manual_review', 'reason', 'exceeds_remaining_amount');
    end if;
  end if;

  update public.contributions
  set status = 'confirmed',
      payment_status = 'paid',
      confirmation_source = 'asaas_webhook',
      confirmed_at = now(),
      confirmed_by = null,
      confirmed_by_email = 'asaas-webhook',
      rejection_reason = null
  where id = target_contribution.id
    and status in ('awaiting_payment', 'pending_manual_review', 'failed')
  returning * into target_contribution;

  if target_contribution.id is null then
    update public.payment_events
    set processing_status = 'requires_manual_review', processed_at = now()
    where event_fingerprint = process_asaas_payment_event.event_fingerprint;

    return jsonb_build_object('status', 'requires_manual_review', 'reason', 'invalid_contribution_status');
  end if;

  update public.payments
  set status = 'paid',
      paid_at = coalesce(paid_at, now()),
      raw_provider_payload = payload
  where id = target_payment.id;

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

  update public.payment_events
  set processing_status = 'processed', processed_at = now()
  where event_fingerprint = process_asaas_payment_event.event_fingerprint;

  return jsonb_build_object('status', 'processed', 'contribution_id', target_contribution.id);
end;
$$;

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.pix_charge_attempts enable row level security;

drop policy if exists "Admins can read payments" on public.payments;
create policy "Admins can read payments"
on public.payments
for select
to authenticated
using (public.current_user_is_admin());

drop policy if exists "Admins can update payments" on public.payments;
create policy "Admins can update payments"
on public.payments
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists "Admins can read payment events" on public.payment_events;
create policy "Admins can read payment events"
on public.payment_events
for select
to authenticated
using (public.current_user_is_admin());

revoke all on function public.process_asaas_payment_event(text, text, text, numeric, jsonb) from public, anon, authenticated;
grant select, update on public.payments to authenticated;
grant select on public.payment_events to authenticated;
grant execute on function public.process_asaas_payment_event(text, text, text, numeric, jsonb) to service_role;
