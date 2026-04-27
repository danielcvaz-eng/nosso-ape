# Documentação técnica curta

## Onde ficam os dados

- Produtos oficiais: `data/produtos.js`
- Configurações fixas de Pix, WhatsApp e textos principais: `scripts/config.js`
- Configurações do Supabase: `scripts/config.js`
- Exemplo de configuração pública: `scripts/supabase.example.js`
- Cliente REST/Auth do Supabase: `scripts/supabaseClient.js`
- Camada de API do projeto: `scripts/api.js`
- Persistência local e migração de chaves antigas: `scripts/storage.js`
- Fluxo principal do front-end: `scripts/main.js`
- Schema do banco: `supabase/schema.sql`

## Como funciona o localStorage

O projeto usa a chave principal:

```text
nossoApeAppState
```

Estrutura atual:

```json
{
  "version": 2,
  "statuses": {
    "1": "reservado"
  },
  "contributions": {
    "1": 150
  }
}
```

Também existe migração automática das chaves antigas:

- `nossoApeStatusProdutos`
- `nossoApeContribuicoesProdutos`

## O que é salvo localmente

- status alterados no modo moradores
- contribuições simuladas de itens colaborativos

Esses dados valem apenas para o navegador atual.

Quando o Supabase estiver ativo e com schema aplicado, o `localStorage` deixa de ser a fonte oficial da verdade. Ele continua útil apenas como fallback local se a conexão com o backend falhar.

Para forçar fallback local:

```text
?backend=local
```

## Arquitetura Supabase

O frontend continua publicado no GitHub Pages.

O Supabase passa a cuidar de:

- produtos oficiais compartilhados
- status oficial dos produtos
- contribuições pendentes
- confirmação/rejeição manual por moradores
- autenticação dos moradores por magic link

Tabelas principais:

- `products`: catálogo oficial e status compartilhado
- `contributions`: intenções/contribuições enviadas pelos visitantes
- `allowed_admins`: e-mails autorizados como moradores/admins

View pública segura:

- `product_progress`: expõe apenas soma e quantidade de contribuições confirmadas por produto

Funções:

- `current_user_is_admin()`: verifica se o usuário logado está em `allowed_admins`
- `confirm_contribution(uuid)`: confirma contribuição pendente e atualiza status/progresso
- `reject_contribution(uuid, text)`: rejeita contribuição pendente

## RLS

RLS significa Row Level Security.

No Supabase, como o frontend acessa o banco usando uma anon/publishable key pública, a segurança precisa ficar nas policies do banco.

Policies propostas em `supabase/schema.sql`:

- qualquer pessoa pode ler `products`
- qualquer pessoa pode ler `product_progress`
- qualquer pessoa pode inserir contribuição com status `pending`
- visitantes não podem confirmar contribuição
- visitantes não podem alterar status de produto
- apenas usuários autenticados e autorizados em `allowed_admins` podem ler/atualizar contribuições
- apenas usuários autorizados podem alterar status oficial de produto

## Chaves Supabase

Anon/publishable key:

- pode ficar no frontend
- serve para identificar o projeto Supabase
- depende de RLS correta para ser segura

Service role key:

- nunca deve ir para o frontend
- nunca deve ir para GitHub Pages
- ignora RLS e deve ser usada apenas em backend seguro

## Como resetar os dados locais

Pelo site:

- use o botão `Limpar dados locais` no rodapé

Pelo navegador:

```js
localStorage.removeItem("nossoApeAppState");
```

## Como alterar Pix e WhatsApp

Arquivo:

- `scripts/config.js`

Campos:

```js
whatsappNumber
pix.key
pix.type
pix.receiver
supabase.projectUrl
supabase.restUrl
supabase.anonKey
```

## Como configurar Auth

No Supabase:

```text
Authentication > URL Configuration
```

Site URL:

```text
https://danielcvaz-eng.github.io/nosso-ape/
```

Redirect URLs:

```text
https://danielcvaz-eng.github.io/nosso-ape/
http://localhost:8000/
http://localhost:8001/
http://localhost:8002/
http://localhost:8003/
```

O login dos moradores usa magic link. O frontend valida o e-mail contra a allowlist antes de pedir o link, e o banco valida novamente via RLS/função `current_user_is_admin()`.

## Observações de deploy

O projeto foi preparado para publicação estática em GitHub Pages.

Repositório:

```text
https://github.com/danielcvaz-eng/nosso-ape
```

URL pública:

```text
https://danielcvaz-eng.github.io/nosso-ape/
```

Regras importantes:

- manter `index.html` na raiz publicada
- manter caminhos relativos nos imports e links internos
- publicar pela branch `main` e pasta `/ (root)`
- não publicar `node_modules`, caches ou resultados de teste
- testar a URL pública depois da ativação do GitHub Pages
- aplicar `supabase/schema.sql` antes de esperar dados compartilhados reais
- configurar Redirect URLs do Supabase antes de testar magic link

Para validar uma URL publicada com Playwright:

```bash
BASE_URL=https://danielcvaz-eng.github.io/nosso-ape/ npm run test:e2e
```

Para validar carregamento com Supabase real:

```bash
RUN_SUPABASE_SMOKE=1 BASE_URL=http://localhost:8000 npx playwright test tests/playwright/supabase-smoke.spec.mjs
```

Se o insert público de contribuição `pending` retornar erro de RLS, execute no Supabase:

```text
supabase/patch-allow-public-pending-contributions.sql
```

## Limites operacionais do localStorage

O `localStorage` salva dados apenas no navegador atual.

Isso significa:

- uma alteração feita em um celular não aparece automaticamente em outro celular
- em fallback local, o modo moradores não é uma área administrativa real
- limpar dados do navegador apaga status e contribuições locais
- o registro local não comprova pagamento Pix

Esses limites são aceitáveis para a fase estática, mas precisam virar backend se o site for usado como sistema oficial de controle.

Com Supabase configurado, esses limites são reduzidos para produtos, status e contribuições confirmadas. Ainda continuam sem confirmação bancária automática, porque o Pix segue manual.

## O que deve virar backend no futuro

- status oficiais dos itens
- contribuições reais por item
- confirmação de pagamento
- autenticação do modo moradores
- histórico de reservas e confirmações

Com a etapa Supabase, os quatro primeiros pontos começam a ser atendidos em modo manual. O próximo salto real seria automação operacional: auditoria melhor, notificações e talvez integração de pagamento no futuro.
