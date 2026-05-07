-- Hotfix operacional: remanejamento Micro-ondas/Cafeteira/Lixeiros.
--
-- Contexto:
-- - R$ 500,00 foram recebidos para o micro-ondas.
-- - Os valores antes alocados para cafeteira (R$ 119,00) e lixeiros (R$ 70,00)
--   foram remanejados para ajudar a completar o micro-ondas.
-- - Depois da revisao do PR, o micro-ondas foi comprado: R$ 60,00 antes
--   alocados na lava e seca foram remanejados para ele e o restante
--   (R$ 44,12) foi complementado pelos moradores.
-- - Cafeteira e lixeiros voltaram ao catalogo como disponiveis.
--
-- Este patch e documental/auditavel. Ele foi aplicado em producao em
-- 2026-05-06. Reaplique somente se estiver restaurando o mesmo estado em
-- outro banco.

begin;

-- 1. Cancela a cobranca Asaas criada para o lancamento incorreto do
-- micro-ondas em valor cheio, preservando o historico.
update public.payments
set status = 'cancelled',
    raw_provider_payload = coalesce(raw_provider_payload, '{}'::jsonb)
      || jsonb_build_object(
        'cleanup_reason',
        'charge superseded by operational remanejamento before production validation',
        'cleanup_at',
        now()
      )
where contribution_id in (
  '31954daa-09e5-4da8-9ce2-d2658c6a87f6',
  'aa7dca82-5e87-432e-87ae-f2d4e0307610'
);

update public.contributions
set status = 'rejected',
    payment_status = 'failed',
    rejection_reason = 'Lancamento incorreto substituido pelo remanejamento real: 500 reais recebidos + cafeteira + lixeiros para o micro-ondas.',
    confirmed_at = now(),
    confirmed_by = 'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
    confirmed_by_email = 'dvaz538@gmail.com'
where id = '31954daa-09e5-4da8-9ce2-d2658c6a87f6';

-- 2. Confirma os R$ 500,00 reais recebidos para o micro-ondas como fallback
-- manual, sem depender de webhook retroativo.
update public.contributions
set status = 'confirmed',
    payment_status = 'manual_confirmed',
    confirmation_source = 'manual_fallback',
    confirmed_at = now(),
    confirmed_by = 'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
    confirmed_by_email = 'dvaz538@gmail.com',
    rejection_reason = null
where id = 'aa7dca82-5e87-432e-87ae-f2d4e0307610';

-- 3. Remove do progresso de cafeteira e lixeiros os valores que foram
-- remanejados para o micro-ondas, preservando o historico como rejeitado.
update public.contributions
set status = 'rejected',
    payment_status = null,
    rejection_reason = 'Valor remanejado para completar o micro-ondas; item voltou a ficar disponivel para novos presentes.',
    confirmed_at = now(),
    confirmed_by = 'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
    confirmed_by_email = 'dvaz538@gmail.com'
where id in (
  '99e14c67-512f-4560-b4a4-290dcd380786',
  '2a392d9c-f199-4323-8f9a-fdd3cec55d4e'
);

-- 4. Cria lancamentos manuais no micro-ondas para manter a auditoria da
-- realocacao.
insert into public.contributions (
  product_id,
  giver_name,
  giver_message,
  amount,
  contribution_type,
  payment_method,
  status,
  confirmed_at,
  confirmed_by,
  confirmed_by_email,
  payment_status,
  confirmation_source
)
values
  (
    2,
    'Remanejamento da cafeteira',
    'Valor da cafeteira remanejado para completar o micro-ondas; cafeteira voltou ao catalogo como disponivel.',
    119.00,
    'colaborativo',
    'pix',
    'confirmed',
    now(),
    'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
    'dvaz538@gmail.com',
    'manual_confirmed',
    'manual'
  ),
  (
    2,
    'Remanejamento dos lixeiros',
    'Valor dos lixeiros remanejado para completar o micro-ondas; lixeiros voltaram ao catalogo como disponiveis.',
    70.00,
    'colaborativo',
    'pix',
    'confirmed',
    now(),
    'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
    'dvaz538@gmail.com',
    'manual_confirmed',
    'manual'
  );

-- 5. Reabre os produtos conforme decisao operacional inicial.
update public.products
set status = 'disponivel'
where id in (2, 12, 16);

-- 6. Revisao final do PR: o micro-ondas ja foi comprado.
--
-- Remove os R$ 60,00 do progresso da lava e seca, preservando o historico
-- como rejeitado/remanejado.
update public.contributions
set status = 'rejected',
    payment_status = null,
    rejection_reason = 'Valor remanejado para completar o micro-ondas; lava e seca voltou a manter somente o progresso restante real.',
    confirmed_at = now(),
    confirmed_by = 'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
    confirmed_by_email = 'dvaz538@gmail.com'
where id = '60217c28-5fe7-4f6d-b61b-b97688b16317'
  and status = 'confirmed';

-- Cria os lancamentos finais no micro-ondas sem duplicar caso o patch seja
-- revisado/rodado novamente no mesmo banco.
insert into public.contributions (
  product_id,
  giver_name,
  giver_message,
  amount,
  contribution_type,
  payment_method,
  status,
  confirmed_at,
  confirmed_by,
  confirmed_by_email,
  payment_status,
  confirmation_source
)
select
  2,
  'Remanejamento da lava e seca',
  'R$ 60,00 remanejados da lava e seca para completar a compra do micro-ondas.',
  60.00,
  'colaborativo',
  'pix',
  'confirmed',
  now(),
  'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
  'dvaz538@gmail.com',
  'manual_confirmed',
  'manual'
where not exists (
  select 1
  from public.contributions
  where product_id = 2
    and giver_name = 'Remanejamento da lava e seca'
    and amount = 60.00
    and status = 'confirmed'
);

insert into public.contributions (
  product_id,
  giver_name,
  giver_message,
  amount,
  contribution_type,
  payment_method,
  status,
  confirmed_at,
  confirmed_by,
  confirmed_by_email,
  payment_status,
  confirmation_source
)
select
  2,
  'Complemento dos moradores',
  'Complemento final pago pelos moradores para fechar a compra do micro-ondas.',
  44.12,
  'colaborativo',
  'pix',
  'confirmed',
  now(),
  'f81c2e5e-658f-4b11-82a4-cc7690e5953d',
  'dvaz538@gmail.com',
  'manual_confirmed',
  'manual'
where not exists (
  select 1
  from public.contributions
  where product_id = 2
    and giver_name = 'Complemento dos moradores'
    and amount = 44.12
    and status = 'confirmed'
);

update public.products
set status = 'recebido'
where id = 2;

commit;
