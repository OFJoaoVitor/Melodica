# Melodica — versão independente com banco local SQLite

Esta versão do Melodica funciona **sem conta no Lovable e sem Supabase**.
O cadastro, login, perfis, publicações, comunidades, curtidas, comentários e favoritos
utilizam um banco de dados SQLite salvo no seu próprio computador.

## Como abrir no Windows (VS Code)

1. Extraia o ZIP (não execute o projeto dentro do arquivo ZIP).
2. Abra a pasta `Melodica-main` no VS Code (Arquivo > Abrir Pasta).
3. Instale o **Node.js 22.13 ou superior** (recomendado: Node.js 24 LTS) em https://nodejs.org/.
4. Abra Terminal > Novo Terminal (atalho Ctrl+J) e execute:

```powershell
npm install
npm run dev
```

O comando `npm run dev` **inicia dois servidores ao mesmo tempo**:

- **Site:** endereço apresentado pelo terminal do Vite (pode ser `http://localhost:3000` ou outro).
- **Backend:** `http://127.0.0.1:8787/api/health` (deve responder `{"ok":true,"engine":"SQLite local"}`).

Abra no navegador o endereço **Local** que aparecer no terminal do Vite.
Você NÃO precisa configurar `.env`, login do Lovable, Supabase, Docker nem Postgres.

**Primeiro acesso:** clique em "Criar conta", escolha um nome de usuário, seu email e senha de pelo menos 8 caracteres.
Após cadastrar, o aplicativo abre o feed. Para testar novamente, saia e entre com email e senha.
As rotas `/feed`, `/explore`, `/saved`, `/communities` e `/settings` exigem login.

## Onde fica o banco de dados?

O banco é criado automaticamente em `backend/data/melodica.sqlite` na primeira execução.
Contas criadas continuam salvas mesmo após fechar o VS Code e reiniciar o computador.
Não apague esse arquivo se quiser preservar as contas e publicações.
**Não envie o banco de dados para GitHub**: ele contém dados privados dos usuários.
O `.gitignore` já impede seu versionamento.

Para ver as tabelas com uma interface gráfica, você pode instalar o programa grátis "DB Browser for SQLite"
(https://sqlitebrowser.org/) e abrir `backend/data/melodica.sqlite`.
Faça backup e feche o servidor antes de alterar o banco com um editor externo.

## Recuperar senha

Esta versão não envia email (ela roda localmente, sem serviço de emails).
Se você perder a senha, o administrador do computador pode executar **em outro terminal**:

```powershell
npm run reset-password
```

Informe o email cadastrado e a nova senha. A senha digitada ficará visível no terminal.
Você pode fechar a janela do terminal após terminar. Quando conectado, também pode trocar
sua senha usando a página `/reset-password`.

## Recursos e limitações

- **Funciona localmente**: cadastro, login, logout, sessão persistente, perfis, feed,
  publicações, comunidades, entrar/sair de comunidades, curtidas, comentários e salvamentos.
- **Não depende de internet para o banco** (o próprio site pode usar fontes online para seu visual).
- **Não inclui login Google nem recuperação por email**: ambos exigem um serviço externo configurado.
- **Não migra os usuários e posts antigos do Lovable**: o banco começa vazio, com comunidades iniciais.
- **Não é uma hospedagem pública**: amigos em outros computadores não poderão usar este
  backend automaticamente. Para colocar o site na internet, será necessário hospedar o backend
  com HTTPS, domínio, backups e proteção adicional. Esta configuração foi preparada para
  desenvolvimento local, não para um serviço público em produção.
- **Use apenas com dados de teste no desenvolvimento** até ter uma implantação segura.

## Scripts disponíveis

```powershell
npm run dev             # Inicia site + backend SQLite (recomendado)
npm run dev:site        # Inicia somente o frontend
npm run dev:backend     # Inicia somente o servidor do banco
npm run reset-password  # Redefine uma senha na base local
```

Se aparecer a mensagem "Servidor local não está iniciado", confira se o terminal que
executa `npm run dev` continua aberto e se a porta 8787 não está ocupada por outro programa.

## Organização

- `backend/db.mjs`: tabelas SQLite e comunidades iniciais.
- `backend/server.mjs`: API local, autenticação e operações no banco.
- `backend/dev.mjs`: inicia frontend e backend juntos.
- `src/integrations/supabase/client.ts`: adaptador das telas para a API SQLite.
- `src/routes/`: páginas React do Melodica.

Os diretórios `supabase/` e alguns arquivos de integração originais permanecem como
referência histórica do projeto, mas **não são utilizados pelo login local**.
