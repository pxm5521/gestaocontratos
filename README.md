# Contratos OCP — Gestão & Faturamento (versão Firebase)

Site estático (um único `index.html`, sem processo de build) que usa:

- **Firebase Authentication** — login por e-mail/senha, com um fluxo de **convite por e-mail** administrado por você (ninguém se autocadastra).
- **Cloud Firestore** como banco de dados (coleções `members`, `clients`, `contracts`, `billings`).
- **Firebase Storage** para os arquivos binários (modelos de BM em Excel e planilhas de custo).
- **GitHub + Netlify** para hospedagem e deploy contínuo.

## Como funciona o controle de acesso

- Só existe uma página de **Administração** (visível apenas para quem tem papel "Admin"), onde você cadastra **nome + e-mail** de uma pessoa e escolhe o papel (Admin ou Usuário).
- A pessoa recebe um **e-mail automático do Firebase** com um link. Ao clicar, ela cai no site e é levada direto para a tela de **"defina sua senha"**.
- Da próxima vez, ela entra normalmente com **e-mail + senha** na tela de login.
- Você pode a qualquer momento, na página de Administração, **trocar o papel** (Admin ↔ Usuário), **reenviar o convite** ou **revogar o acesso** de alguém — a revogação bloqueia o acesso aos dados imediatamente.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e clique em **Adicionar projeto**.
2. Dê um nome (ex.: `contratos-ocp`) e conclua a criação (pode desativar o Google Analytics).
3. Dentro do projeto, clique no ícone **`</>`** ("Web") para registrar um app da Web.
4. Dê um apelido e clique em **Registrar app**. Copie o bloco `firebaseConfig` que aparece — você vai colar no `index.html` no passo 5.

## 2. Ativar Authentication (e-mail/senha + link de convite)

1. **Build → Authentication → Get started**.
2. Aba **Sign-in method** → ative **E-mail/senha**.
3. Na mesma aba, ative também **E-mail link (sign-in sem senha)** ("Email link (passwordless sign-in)") — é esse recurso que permite mandar o convite por e-mail sem precisar de servidor próprio.
4. (Opcional) Aba **Templates → Email address sign-in**: dá pra personalizar o texto do e-mail de convite que o Firebase manda automaticamente.

## 3. Ativar o Firestore

1. **Build → Firestore Database → Create database** → modo produção → região `southamerica-east1` (São Paulo).
2. Aba **Regras** → apague tudo → cole o conteúdo de [`firestore.rules`](./firestore.rules) → **Publicar**.

## 4. Ativar o Storage

1. **Build → Storage → Get started** → opções padrão.
2. Aba **Rules** → cole o conteúdo de [`storage.rules`](./storage.rules) → **Publicar**.

## 5. Colar a configuração no `index.html`

Abra `index.html`, procure por `COLE_AQUI` (Ctrl+F) e substitua o bloco `firebaseConfig` inteiro pelos valores copiados no passo 1.

## 6. Configurar a chave da Anthropic (para a leitura automática por IA funcionar)

A leitura automática de contratos por IA precisa de uma função de servidor (já incluída no projeto, em `netlify/edge-functions/claude-extract.js`) que guarda sua chave da Anthropic em segredo. Sem isso, o upload de contrato dá erro "Failed to fetch". Essa função é do tipo **Edge Function** (não a "Netlify Function" clássica) — foi escolhida de propósito porque analisar um contrato inteiro com IA pode levar mais de 10 segundos, e as funções clássicas são interrompidas nesse limite (erro 504); Edge Functions não têm essa trava.

1. Crie uma conta em https://console.anthropic.com (se ainda não tiver) e gere uma chave em **API Keys → Create Key**. Copie a chave (começa com `sk-ant-...`).
2. No Netlify, abra o site → **Site configuration → Environment variables → Add a variable**.
3. Key: `ANTHROPIC_API_KEY` — Value: cole a chave copiada. Salvar.
4. Vá em **Deploys** e clique em **Trigger deploy → Deploy site** (as variáveis de ambiente só valem a partir do próximo deploy).

**Se o deploy falhar com "Secrets scanning found secrets in build"**: o Netlify pode confundir a `apiKey` do Firebase (que fica visível no `index.html` de propósito — não é segredo, é protegida pelas regras do Firestore/Storage) com uma chave vazada. Adicione mais uma variável de ambiente: Key `SECRETS_SCAN_SMART_DETECTION_ENABLED`, Value `false`, e faça o deploy de novo.

Isso tem custo — a Anthropic cobra por uso da API (não é o mesmo plano do Claude.ai). Para o volume de uma equipe pequena analisando contratos ocasionalmente, o custo tende a ser bem baixo, mas vale acompanhar em **console.anthropic.com → Usage**.

## 7. Cadastrar o PRIMEIRO administrador (manual, só uma vez)

A página de Administração só existe *dentro* do site — então o primeiríssimo admin precisa ser criado direto no Firebase Console, sem passar pelo convite:

1. **Authentication → Users → Add user** → digite seu e-mail e uma senha seguem.
2. **Firestore Database → Dados (Data) → Start collection**:
   - ID da coleção: `members`
   - ID do documento: **seu e-mail exatamente igual ao que você usou no passo anterior** (ex.: `pedro@environpact.com`)
   - Campos do documento:
     | Campo | Tipo | Valor |
     |---|---|---|
     | `nome` | string | seu nome |
     | `email` | string | seu e-mail |
     | `role` | string | `admin` |
     | `status` | string | `ativo` |
3. Salvar. Pronto — esse é o único cadastro manual; todo o resto (convidar as próximas pessoas) você faz pela página de Administração dentro do site.

## 8. Subir para o GitHub

```powershell
cd caminho\para\esta\pasta
git init
git add .
git commit -m "Primeira versao do site"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/contratos-ocp.git
git push -u origin main
```

## 9. Publicar no Netlify

1. https://app.netlify.com → **Add new site → Import an existing project** → conecte o GitHub → escolha o repositório.
2. Build command: em branco. Publish directory: `.`
3. **Deploy site**. Você recebe uma URL tipo `https://algum-nome.netlify.app`.

## 10. Autorizar o domínio no Firebase

**Authentication → Settings → Authorized domains → Add domain** → cole o domínio do Netlify (sem `https://`). Sem isso, login e envio de convite não funcionam no site publicado.

## Pronto

Acesse a URL do Netlify, entre com o e-mail/senha do primeiro admin (passo 6), vá em **Administração** na barra lateral e comece a convidar o resto da equipe.

## Perguntas comuns

**A pessoa não recebeu o e-mail de convite.** Confira a caixa de spam. O remetente é algo como `noreply@SEU-PROJETO.firebaseapp.com` — pode demorar 1–2 minutos. Se quiser, use "Reenviar convite" na página de Administração.

**Abri o link de convite no celular, mas pedi o convite pensando em usar no notebook.** Sem problema — o site vai pedir pra digitar o e-mail de novo pra confirmar (é uma proteção do próprio Firebase contra o link cair na mão errada), e depois disso funciona normalmente.

**"Revogar acesso" desliga a conta de login da pessoa?** Não — bloqueia o acesso aos *dados* (Firestore) imediatamente, que é o que importa no dia a dia. Se quiser impedir também o login em si, vá em **Authentication → Users**, ache o usuário e clique em **Disable account**.

**Posso ter mais de um admin?** Sim, quantos quiser — é só marcar "Admin" no papel da pessoa, seja convidando do zero ou trocando o papel de alguém que já tem acesso.

## Limitações desta versão

- Não há tela de "esqueci minha senha" própria do site — isso pode ser adicionado depois (o Firebase Auth já tem a função pronta, `sendPasswordResetEmail`).
- O plano gratuito (Spark) do Firebase costuma ser mais que suficiente para o volume de um time pequeno.
