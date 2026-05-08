-- Patch: expansão de catálogo e fotos.
-- Execute no SQL Editor do Supabase depois dos patches anteriores.
--
-- O site mantém imagens em assets locais, ligadas por id em scripts/api.js.
-- Este SQL atualiza apenas dados do catálogo em public.products.
-- Em conflitos, o status operacional existente é preservado para não apagar
-- histórico real nem reabrir item já marcado como recebido.

begin;

insert into public.products
  (id, name, category, price, priority, type, description, link, status, estimated_price, is_visible)
values
  (16, 'Cafeteira Oster Inox Compacta 0,75L OCAF300 - 220V', 'Cozinha', 92.40, 'media', 'inteiro', 'Cafeteira compacta em inox para o café do dia a dia dos moradores.', 'https://www.amazon.com.br/dp/B093HGNHR2', 'disponivel', false, true),
  (17, 'Fruteira Metaltec 3 cestos com rodízios', 'Cozinha', 143.90, 'media', 'inteiro', 'Fruteira de chão com três cestos e rodízios para organizar frutas e itens da cozinha.', 'https://www.amazon.com.br/Metaltec-Fruteira-Resistente-Organizador-Refor%C3%A7ado/dp/B07RCZ552L/', 'disponivel', false, true),
  (18, 'Smart TV 4K 65" LG QNED73', 'Sala', 3499.00, 'alta', 'colaborativo', 'Televisão 65 polegadas 4K para compor a sala e melhorar os momentos de filme, jogo e visitas.', 'https://www.amazon.com.br/LG-Processador-Upscaling-Integrado-Controle/dp/B0GL9JXK9N/', 'disponivel', false, true),
  (19, 'Poltrona Balance bouclé premium para sala', 'Sala / Decoração', 575.09, 'media', 'colaborativo', 'Poltrona confortável com leve balanço para criar um canto de leitura e descanso na sala.', 'https://produto.mercadolivre.com.br/MLB-6047740144-poltrona-balance-para-sala-com-leve-balanco-boucle-premium-_JM', 'disponivel', false, true),
  (20, 'Dois puffs decorativos redondos em suede nude', 'Sala / Decoração', 139.80, 'media', 'inteiro', 'Par de puffs redondos para colocar embaixo do aparador e ter assentos extras na sala.', 'https://www.amazon.com.br/Decorativo-Redondo-Quarto-Banqueta-Estofado/dp/B0FXGYM9JB/', 'disponivel', false, true),
  (21, 'Ventilador torre silencioso para sala', 'Sala / Conforto', 207.00, 'media', 'inteiro', 'Ventilador de torre discreto e silencioso para deixar a sala mais confortável nos dias quentes.', 'https://www.amazon.com.br/Ventilador-Silencioso-Potente-Coluna-velocidades/dp/B0DQ1P3HCL/', 'disponivel', false, true),
  (22, 'Kit tomadas para embutir com USB-C', 'Cozinha', 180.40, 'alta', 'inteiro', 'Torre de tomada para embutir com três tomadas, USB e USB-C para deixar a bancada mais funcional.', 'https://www.amazon.com.br/tomadas-Embutir-Cozinha-Reuni%C3%A3o-Premium/dp/B0DFFZLZDR/', 'disponivel', false, true),
  (23, 'Kit para bebidas com coqueteleira e suporte', 'Cozinha / Bar', 161.97, 'baixa', 'inteiro', 'Kit completo com coqueteleira e acessórios para preparar drinks e caipirinhas em casa.', 'https://www.amazon.com.br/Coqueteleira-Completo-Caipirinha-Suporte-Madeira/dp/B0FY7PSS22/', 'disponivel', false, true)
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

commit;

-- Conferencia rapida apos aplicar:
-- select id, name, price, priority, type, status, estimated_price, is_visible
-- from public.products
-- where id between 16 and 23
-- order by id;
