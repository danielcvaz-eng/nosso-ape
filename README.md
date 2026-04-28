# Nosso Apê

Lista de presentes para casa nova feita como site estático com HTML, CSS e JavaScript puro.

O projeto já cobre catálogo, filtros, fluxo de presente com modal, Pix, confirmação simulada, progresso de itens colaborativos, WhatsApp e um modo local de operação para os moradores. Nesta etapa, a base foi reorganizada para ficar mais publicável, mais estável e mais preparada para uma futura migração para backend.

## Links

- Repositório: `https://github.com/danielcvaz-eng/nosso-ape`
- Site publicado: `https://danielcvaz-eng.github.io/nosso-ape/`

## Funcionalidades atuais

- catálogo oficial com 15 produtos reais
- agrupamento por categoria
- busca por nome
- filtros por categoria, prioridade e status
- cards com prioridade, tipo, status, descrição e link externo
- modal de presente com múltiplas etapas
- fluxo Pix com cópia de chave
- confirmação simulada de pagamento
- mensagem final para WhatsApp
- itens colaborativos com progresso, valor arrecadado e valor faltante
- modo moradores para ajuste local de status
- persistência local com `localStorage`
- aviso explícito de que a confirmação real continua manual
- botão para limpar dados locais do navegador

## Stack

- HTML
- CSS
- JavaScript puro com módulos ES
- `localStorage` para persistência local
- Supabase para backend compartilhado, quando configurado
- Playwright Test para QA automatizado em navegador
- Playwright MCP para QA assistido no navegador, quando disponível no Codex

## Extensões recomendadas no VS Code

O projeto inclui recomendações em `.vscode/extensions.json`.

- Live Server: útil para abrir o site localmente sem digitar comando.
- Playwright Test for VS Code: útil para visualizar e rodar testes pelo editor.
- GitHub Pull Requests and Issues: útil depois que o projeto estiver no GitHub.
- GitLens: útil para entender histórico de commits e alterações.
- Error Lens: útil para enxergar avisos diretamente no código.
- Prettier: útil para manter formatação consistente.
- GitHub Actions: opcional nesta fase; pode ser útil no futuro para automatizar testes.

Nesta etapa, GitHub Actions não é obrigatório porque o projeto ainda é simples e os testes já rodam localmente.

## Estrutura do projeto

```text
nosso-ape/
├── index.html
├── script.js
├── style.css
├── produtos.js
├── package.json
├── package-lock.json
├── playwright.config.mjs
├── .gitignore
├── data/
│   └── produtos.js
├── scripts/
│   ├── api.js
│   ├── config.js
│   ├── main.js
│   ├── storage.js
│   ├── supabase.example.js
│   ├── supabaseClient.js
│   └── utils.js
├── styles/
│   └── main.css
├── supabase/
│   └── schema.sql
├── docs/
│   └── technical.md
├── tests/
│   └── playwright/
│       └── nosso-ape.spec.mjs
├── tools/
│   └── playwright-mcp.sh
└── README.md
```

Observação:

- `script.js`, `style.css` e `produtos.js` continuam existindo na raiz como wrappers de compatibilidade.
- a implementação real está em `data/`, `scripts/` e `styles/`.

## Como rodar localmente

### Opção 1: Live Server

1. Abra a pasta `nosso-ape` no VS Code.
2. Abra `index.html`.
3. Clique com o botão direito no editor.
4. Escolha `Open with Live Server`.

### Opção 2: servidor estático com Python

```bash
cd /home/danielcvaz1147/code/PROJETOS/nosso-ape
python3 -m http.server 8000
```

Abra no navegador:

```text
http://localhost:8000
```

Se a porta estiver ocupada:

```bash
python3 -m http.server 8001
```

## Como testar manualmente

### Catálogo

1. Abra a página.
2. Verifique se os 15 produtos aparecem.
3. Use busca, filtro de categoria, prioridade e status.
4. Clique em `Limpar filtros`.

### Fluxo de presente

1. Clique em `Quero presentear` em um item disponível.
2. Preencha nome.
3. Escolha presente inteiro ou colaboração.
4. Se escolher colaboração, informe um valor.
5. Avance para a etapa de Pix.
6. Copie a chave Pix.
7. Marque a caixa de registro após fazer o Pix.
8. Clique em `Registrar intenção`.
9. Verifique a etapa de sucesso.
10. Clique em `Enviar WhatsApp`.

### Itens colaborativos

1. Escolha um item colaborativo.
2. Registre uma colaboração parcial.
3. Verifique atualização de valor arrecadado e percentual.
4. Recarregue a página.
5. Confirme se os dados persistiram no navegador.

### Modo moradores local

1. Ative `Modo moradores local`.
2. Altere status de um item.
3. Recarregue a página.
4. Confirme se o status local foi mantido.

### Limpeza local

1. Clique em `Limpar dados locais`.
2. Confirme a ação.
3. Recarregue a página.
4. Verifique se status e contribuições locais foram removidos.

## Como rodar os testes com Playwright

Instale as dependências uma vez:

```bash
npm install
```

Se o Playwright ainda não tiver navegador instalado:

```bash
npx playwright install chromium
```

Suba o site em outra aba do terminal:

```bash
python3 -m http.server 8000
```

Rode os testes:

```bash
npm run test:e2e
```

Se precisar usar outra porta:

```bash
BASE_URL=http://localhost:8001 npm run test:e2e
```

Os testes atuais validam:

- carregamento do catálogo
- busca e filtros
- fluxo de presente inteiro
- fluxo colaborativo com validação de valor
- persistência em `localStorage`
- modo moradores local
- limpeza de dados locais
- responsividade básica em desktop e celular

### Teste smoke com Supabase real

Depois de aplicar o schema no Supabase e subir o servidor local, rode:

```bash
RUN_SUPABASE_SMOKE=1 BASE_URL=http://localhost:8000 npx playwright test tests/playwright/supabase-smoke.spec.mjs
```

Esse teste valida que o catálogo carrega usando Supabase real nos projetos configurados do Playwright.

### Observação sobre Playwright MCP

O arquivo `tools/playwright-mcp.sh` existe para ajudar a inicializar o MCP do Playwright em ambientes WSL/Windows. Se o MCP não conectar no Codex, use os testes automatizados com `npm run test:e2e`, que continuam validando o site em navegador real.

## Conceitos rápidos de Git e GitHub

- Git: ferramenta que salva o histórico do projeto na sua máquina.
- GitHub: site onde você hospeda o repositório online.
- Repositório: pasta versionada com arquivos e histórico.
- Commit: um ponto salvo no histórico, como uma fotografia organizada do projeto.
- Branch `main`: linha principal do projeto.
- Remote `origin`: endereço do repositório no GitHub.
- Push: envio dos commits locais para o GitHub.
- GitHub Pages: recurso do GitHub que publica sites estáticos direto do repositório.

Este projeto usa GitHub Pages porque ele é um site estático: não precisa de servidor, backend ou banco de dados para funcionar.

## Fluxo de Git recomendado

Verificar o estado atual:

```bash
git status
```

Criar o repositório Git local, se ainda não existir:

```bash
git init
```

Garantir que a branch principal se chame `main`:

```bash
git branch -M main
```

Adicionar os arquivos do projeto ao próximo commit:

```bash
git add .
```

Criar o primeiro commit:

```bash
git commit -m "chore: prepare Nosso Ape for static publication"
```

Depois de criar o repositório no GitHub, conectar o remote:

```bash
git remote add origin https://github.com/USUARIO/nosso-ape.git
```

Enviar para o GitHub:

```bash
git push -u origin main
```

## Status do GitHub CLI neste ambiente

Durante a preparação desta etapa, o comando `gh` não estava instalado no ambiente WSL.

Por isso, a criação do repositório GitHub e a ativação do GitHub Pages devem ser feitas manualmente no site do GitHub, ou depois que o GitHub CLI for instalado e autenticado.

## Dados operacionais atuais

### Pix

- Chave: `daniel.vazbtg@gmail.com`
- Tipo: `e-mail`
- Recebedor: `Daniel Correia Vaz`

### WhatsApp

- Número: `5561991982923`
- Nome de referência: `Moradores do apê`

## Onde alterar dados importantes

Arquivo:

- `scripts/config.js`

Campos principais:

- `whatsappNumber`
- `referenceName`
- `pix.key`
- `pix.type`
- `pix.receiver`
- `finalGiftMessage`
- `supabase.projectUrl`
- `supabase.restUrl`
- `supabase.anonKey`

## Backend Supabase

O projeto agora tem uma base preparada para usar Supabase como backend compartilhado.

O que muda quando o Supabase estiver configurado e o SQL aplicado:

- produtos passam a ser carregados da tabela `products`
- progresso confirmado passa a vir do Supabase
- visitantes registram contribuições como `pending`
- contribuições pendentes não entram no progresso oficial
- moradores autorizados entram por magic link
- moradores confirmam ou rejeitam contribuições manualmente
- status oficial passa a ser compartilhado entre dispositivos

Se o Supabase estiver indisponível ou o schema ainda não tiver sido aplicado, o site continua funcionando em modo local/fallback com os dados atuais.

Para forçar o modo local em testes ou diagnóstico:

```text
http://localhost:8000/?backend=local
```

### Dados já configurados no frontend

Arquivo:

- `scripts/config.js`

Valores:

```text
Project URL: https://nhoexiahfcqqgzombptj.supabase.co
REST URL: https://nhoexiahfcqqgzombptj.supabase.co/rest/v1
Anon/publishable key: configurada no arquivo de config
```

A anon/publishable key pode aparecer no frontend. Ela não é senha privada. A segurança vem das policies RLS do Supabase.

Nunca coloque a `service_role key` no frontend, no GitHub Pages ou em arquivos públicos.

### Como criar as tabelas no Supabase

1. Abra o painel do Supabase.
2. Entre no projeto `danielcvaz datacenter`.
3. Vá em `SQL Editor`.
4. Abra o arquivo `supabase/schema.sql` deste projeto.
5. Copie todo o conteúdo.
6. Cole no SQL Editor.
7. Clique em `Run`.

Esse SQL cria:

- `products`
- `contributions`
- `allowed_admins`
- view `product_progress`
- funções `current_user_is_admin`, `confirm_contribution` e `reject_contribution`
- policies RLS
- seeds dos 15 produtos oficiais
- admins autorizados

Se você já aplicou uma versão anterior do schema e o insert público de contribuição `pending` foi bloqueado por RLS, execute também:

- `supabase/patch-allow-public-pending-contributions.sql`

Se o Security Advisor do Supabase apontar `Security Definer View` na view `product_progress`, execute:

- `supabase/patch-security-invoker-product-progress.sql`

Se o Security Advisor apontar warnings de `SECURITY DEFINER` em funções públicas ou `Function Search Path Mutable`, execute:

- `supabase/patch-security-advisor-function-warnings.sql`

### Auth e Redirect URLs

No Supabase, configure as URLs em:

```text
Authentication > URL Configuration
```

Site URL:

```text
https://danielcvaz-eng.github.io/nosso-ape/
```

Redirect URLs recomendadas:

```text
https://danielcvaz-eng.github.io/nosso-ape/
http://localhost:8000/
http://localhost:8001/
http://localhost:8002/
http://localhost:8003/
```

O login dos moradores usa magic link por e-mail. O frontend não cria usuários automaticamente; crie previamente os usuários autorizados no Supabase Auth ou mantenha apenas contas já testadas.

No template do magic link, use `{{ .ConfirmationURL }}` no link principal. Se o template montar link manual com `{{ .SiteURL }}`, o usuário pode cair em `https://danielcvaz-eng.github.io/#access_token=...` e receber 404 por faltar `/nosso-ape/`.

Admins permitidos no SQL:

```text
dvaz538@gmail.com
nathamgil10@gmail.com
```

### Por que contribuições ficam pendentes

O Pix acontece fora do site. Por isso, o site não deve marcar uma contribuição como confirmada automaticamente.

Fluxo correto:

1. Visitante preenche intenção.
2. Visitante faz Pix.
3. Site registra contribuição como `pending`.
4. Morador entra no modo moradores com magic link.
5. Morador confere o Pix manualmente.
6. Morador confirma ou rejeita a contribuição.
7. Apenas contribuições confirmadas entram no progresso oficial.

## Publicação em GitHub Pages

Esta base já está preparada para publicação estática:

- usa caminhos relativos
- usa módulos ES nativos
- funciona como site estático no GitHub Pages
- usa Supabase quando configurado, com fallback local para testes e indisponibilidade
- não depende de build

### Passo a passo

1. Crie um repositório no GitHub.
2. Suba o conteúdo da pasta `nosso-ape`.
3. Garanta que `index.html` esteja na raiz publicada.
4. No GitHub, vá em `Settings > Pages`.
5. Escolha a branch principal e a pasta `/ (root)`.
6. Salve.
7. Aguarde a URL pública ser gerada.
8. Teste a página publicada.

URL pública:

```text
https://danielcvaz-eng.github.io/nosso-ape/
```

Para rodar os testes contra a versão publicada:

```bash
BASE_URL=https://danielcvaz-eng.github.io/nosso-ape/ npm run test:e2e
```

## Como publicar uma nova versão

Depois de editar o site:

```bash
git status
git add .
git commit -m "descreva a mudança aqui"
git push
```

O GitHub Pages atualiza a publicação automaticamente após o push para a branch configurada.

### Observações para GitHub Pages

- não use caminhos absolutos começando com `/`
- mantenha os imports relativos como estão
- não há necessidade de framework ou build tool
- `window.open` para WhatsApp depende do navegador permitir abertura de aba

## Checklist de publicação

- revisar chave Pix
- revisar número de WhatsApp
- revisar texto final do convite para WhatsApp
- testar links dos produtos
- testar busca e filtros
- testar fluxo de item inteiro
- testar fluxo de item colaborativo
- testar em celular
- limpar dados locais no navegador antes de gravar prints ou fazer demo pública, se necessário
- criar repositório no GitHub
- ativar GitHub Pages
- testar a URL pública final

## Comunicação sobre Pix e confirmação manual

O projeto deixa claro que:

- o pagamento é feito por Pix com a chave exibida no modal
- o botão `Registrar intenção` registra a intenção no site
- com Supabase ativo, esse registro fica como pendente no backend
- em modo fallback, esse registro continua local ao navegador atual
- a confirmação oficial continua manual pelos moradores
- dúvidas podem ser tratadas via WhatsApp

Isso reduz risco de interpretação errada e evita passar a impressão de confirmação bancária automática.

## Limitações atuais

- não existe confirmação bancária automática
- o Supabase não confirma Pix automaticamente; moradores ainda conferem manualmente
- em modo fallback local, status e contribuições salvos no navegador não sincronizam entre dispositivos
- o fluxo Pix é assistido, não transacional
- o convite de WhatsApp depende de o navegador conseguir abrir a URL externa

## Próximas evoluções de backend

Com Supabase, a primeira camada de backend já existe. Próximos pontos possíveis:

- auditoria de alterações
- integração com notificações e mensageria
- validações operacionais mais rígidas para evitar spam de contribuições pendentes

## Documentação técnica adicional

Veja:

- `docs/technical.md`

Esse arquivo explica:

- onde ficam produtos, status e contribuições
- como o `localStorage` funciona
- quais chaves são usadas
- como resetar dados locais
- como funciona a integração Supabase

## Próximo passo recomendado

O próximo salto grande é revisar o PR da branch Supabase, rodar os testes e validar o fluxo real com contribuições pendentes:

- autenticação por magic link
- status oficiais compartilhados
- contribuições persistidas em servidor
- confirmação manual centralizada pelos moradores

Antes disso, também vale decidir a política oficial de reserva:

- reservar imediatamente após intenção
- reservar só após confirmação manual
- ou exibir um estado intermediário no futuro
