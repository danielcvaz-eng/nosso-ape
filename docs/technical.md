# Documentação técnica curta

## Onde ficam os dados

- Produtos oficiais: `data/produtos.js`
- Configurações fixas de Pix, WhatsApp e textos principais: `scripts/config.js`
- Persistência local e migração de chaves antigas: `scripts/storage.js`
- Fluxo principal do front-end: `scripts/main.js`

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
```

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

Para validar uma URL publicada com Playwright:

```bash
BASE_URL=https://danielcvaz-eng.github.io/nosso-ape/ npm run test:e2e
```

## Limites operacionais do localStorage

O `localStorage` salva dados apenas no navegador atual.

Isso significa:

- uma alteração feita em um celular não aparece automaticamente em outro celular
- o modo moradores local não é uma área administrativa real
- limpar dados do navegador apaga status e contribuições locais
- o registro local não comprova pagamento Pix

Esses limites são aceitáveis para a fase estática, mas precisam virar backend se o site for usado como sistema oficial de controle.

## O que deve virar backend no futuro

- status oficiais dos itens
- contribuições reais por item
- confirmação de pagamento
- autenticação do modo moradores
- histórico de reservas e confirmações
