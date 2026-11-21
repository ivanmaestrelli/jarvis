# JARVIS Cloud Free — MVP 0.2

Versão adaptada para hospedagem gratuita na Cloudflare, sem servidor residencial e sem chave da OpenAI API.

## Arquitetura

- **Cloudflare Pages:** entrega a interface web/PWA.
- **Pages Functions / Workers:** endpoint `/api/chat` e controle de acesso.
- **Workers AI:** modelo `@cf/zai-org/glm-4.7-flash` para conversação.
- **D1:** histórico de conversas, com retenção de 30 dias e limite de 40 mensagens por conversa.
- **ChromeOS/Chrome:** reconhecimento de voz e síntese de fala no navegador, quando suportados.

O código não usa OpenAI API, Render, Docker ou servidor ligado em casa. Home Assistant está fora desta etapa porque foi informado que não há hardware residencial disponível.

## Implantação — passo a passo

### 1. Criar contas

1. Crie/acesse uma conta Cloudflare em https://dash.cloudflare.com/.
2. Crie/acesse uma conta GitHub em https://github.com/.
3. Crie um repositório **privado** no GitHub, por exemplo `jarvis-cloudfree`.
4. Envie todo o conteúdo desta pasta para a raiz do repositório (não envie a pasta externa `jarvis_cloudfree` como subpasta).

### 2. Criar a base D1

1. No painel Cloudflare, abra **Workers & Pages → D1 SQL Database**.
2. Crie uma base chamada `jarvis-db`.
3. Copie o Database ID.
4. No arquivo `wrangler.toml`, substitua `REPLACE_WITH_YOUR_D1_DATABASE_ID` pelo ID real.
5. No painel da base D1, abra **Console** e execute todo o conteúdo de `migrations/0001_init.sql`.

### 3. Criar o Pages

1. No Cloudflare, abra **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecione o repositório privado `jarvis-cloudfree`.
3. Configure o diretório de saída como `public` (não é necessário framework nem comando de build).
4. Conclua o deploy.
5. Em **Settings → Bindings**, confirme/crie os bindings:
   - Workers AI: variável de binding `AI`.
   - D1 database: variável de binding `DB`, apontando para `jarvis-memory`.
6. Salve e faça novo deploy para aplicar os bindings.

> Se o painel de Pages não importar automaticamente os bindings do `wrangler.toml`, configure-os manualmente na tela de Bindings. O nome precisa ser exatamente `AI` e `DB`.

### 4. Definir a senha de acesso

1. Em **Settings → Variables and Secrets**, adicione um secret chamado `JARVIS_ACCESS_PASSWORD`.
2. Use uma senha longa, exclusiva e diferente das demais senhas.
3. Salve e faça novo deploy.
4. Abra a URL `https://<seu-projeto>.pages.dev`. Na primeira mensagem, o navegador pedirá a senha. Ela fica apenas em `sessionStorage` daquela sessão do navegador.

### 5. Instalar no Chromebook

No Chrome, abra a URL publicada. Use o ícone de instalação na barra de endereço ou o menu do Chrome → **Instalar página como app** (a opção pode variar conforme a versão). Permita o microfone quando solicitado. O reconhecimento de voz do navegador pode variar conforme suporte e idioma.

## Limites e política de custo zero

- Workers Free: atualmente 100.000 requisições por dia e limites de CPU por invocação.
- Workers AI: franquia gratuita atual de 10.000 Neurons por dia; ao exceder, as chamadas gratuitas falham até a renovação da franquia. O modelo indicado consta entre os modelos disponíveis no plano gratuito na documentação consultada.
- D1 Free: armazenamento de até 500 MB por base, com limites diários de leituras e gravações; ao exceder, as consultas falham até a renovação da franquia.
- Pages: plano Free tem limites de builds e arquivos.

**Para manter R$ 0/mês:** permaneça nos planos Free; não habilite Workers Paid, AI Gateway com créditos, domínio pago ou serviços pagos. Não cadastre upgrade automático. Se o painel solicitar mudança para plano pago, pare e revise antes de confirmar. As franquias e condições podem mudar; consulte os links oficiais abaixo antes de implantar.

Documentação oficial:
- Workers AI e modelo: https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/
- Preços/franquia Workers AI: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Limites Workers: https://developers.cloudflare.com/workers/platform/limits/
- Limites D1: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare Pages: https://developers.cloudflare.com/pages/

## Segurança e limitações

- A senha é validada no backend; a chave/senha não é embutida no JavaScript nem no repositório.
- Use somente HTTPS e mantenha o repositório privado.
- Esta versão usa uma senha compartilhada de usuário único, não contas individuais. Não disponibilize a URL publicamente.
- O histórico é associado a um identificador aleatório de conversa e fica no D1. Conversas sem atividade por mais de 30 dias são removidas na próxima chamada; cada conversa mantém no máximo 40 mensagens.
- Não envie dados ferroviários sigilosos, documentos corporativos restritos, dados pessoais sensíveis ou informações bancárias. O conteúdo é enviado ao provedor de IA para processamento.
- O botão **Nova conversa** cria outro identificador; o histórico anterior permanece até a limpeza automática de 30 dias.
- Nenhuma integração externa está ativa: sem Gmail, Calendar, Home Assistant, dispositivos, pagamentos ou execução automática de ações.
- O service worker permite recursos básicos da PWA; a IA depende de conexão com a internet.

## Teste e diagnóstico

Se o chat não responder, verifique no painel Cloudflare:
1. O binding `AI` está ativo.
2. O binding `DB` aponta para a base `jarvis-memory`.
3. A migração SQL foi executada.
4. O secret `JARVIS_ACCESS_PASSWORD` está configurado.
5. A conta continua no plano Workers Free e ainda possui franquia diária disponível.
