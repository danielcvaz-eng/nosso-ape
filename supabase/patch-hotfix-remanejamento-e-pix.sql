-- Hotfix operacional: remanejamento Micro-ondas/Cafeteira/Lixeiros.
--
-- Contexto:
-- - R$ 500,00 foram recebidos para o micro-ondas.
-- - Os valores antes alocados para cafeteira (R$ 119,00) e lixeiros (R$ 70,00)
--   foram remanejados para ajudar a completar o micro-ondas.
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

-- 5. Reabre os produtos conforme decisao operacional.
update public.products
set status = 'disponivel'
where id in (2, 12, 16);

commit;
