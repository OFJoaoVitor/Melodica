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

## Colocar imagens do computador

Agora você pode selecionar **arquivos do seu próprio computador** em vez de copiar links de imagens:

1. Em **Configurações**, escolha um arquivo para a **foto do perfil** ou para a **capa** e clique em **Salvar alterações**.
2. Ao **criar uma publicação**, selecione o tipo **Imagem**, escolha o arquivo e clique em **Publicar**.
3. Antes de salvar/publicar, o site mostra uma **prévia da imagem**. Também é possível remover uma imagem do perfil.

Formatos permitidos: **JPG, PNG, WebP e GIF**. Tamanho máximo: **5 MB por imagem**.
Os arquivos são guardados em `backend/data/uploads/` e permanecem lá quando você reinicia o servidor.
Eles não são copiados para `public/` nem enviados para um serviço externo. Os links já salvos anteriormente continuam visíveis,
mas as telas de imagens não exigem mais links.

**Backup:** para guardar uma cópia dos dados, copie tanto `backend/data/melodica.sqlite` quanto a pasta `backend/data/uploads/`.
Se apagar os arquivos da pasta de uploads, as imagens correspondentes deixarão de aparecer.
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
  publicações, upload de imagens, comunidades, entrar/sair de comunidades, curtidas, comentários e salvamentos.
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

## Atualização — comentários, mídias, pesquisa e compartilhamento

Esta edição preserva o banco SQLite, a interface TanStack/React e o funcionamento de cadastro e login da versão anterior.

### Comentários

Em qualquer postagem, clique no ícone de comentários. A caixa exibe a lista real do banco de dados (autor, avatar, data e texto). Após enviar um comentário, ele aparece ali sem recarregar, e é recuperado novamente do SQLite quando a postagem é aberta em outra sessão. O servidor confere a existência da postagem, a conta autenticada, o autor e o limite de 2 a 2.000 caracteres.

### Publicar imagem, vídeo ou música

Ao criar uma publicação, selecione **Imagem**, **Vídeo** ou **Música/Áudio**, escolha o arquivo do computador, confira a prévia e clique em **Publicar**. Não é necessário colar links. O upload de imagens da versão anterior foi mantido.

| Tipo | Formatos | Limite |
| --- | --- | --- |
| Imagem | JPG, PNG, WebP, GIF | 5 MB |
| Vídeo | MP4, WebM, OGG (Theora) | 50 MB |
| Áudio | MP3, WAV, OGG (Opus/Vorbis), WebM | 20 MB |

O frontend confere tipo MIME, tamanho e assinatura do arquivo. A API repete essas verificações e inspeciona a assinatura do arquivo para rejeitar extensões incompatíveis. A validação de assinatura identifica o formato do contêiner; **não garante que todos os codecs internos sejam reproduzíveis em todos os navegadores**. Para máxima compatibilidade de vídeo, prefira MP4 (H.264/AAC) ou WebM (VP8/VP9). Os players nativos oferecem reprodução, pausa, progresso, volume e vídeo em tela cheia. O servidor suporta requisições HTTP `Range` para navegação na linha do tempo. Os arquivos são gravados em `backend/data/uploads/`, junto com os uploads já existentes.

### Pesquisar usuários e postagens

Digite **ao menos dois caracteres** no campo de pesquisa no topo da tela. Os resultados são agrupados em **Usuários** e **Postagens**, com acesso ao perfil ou ao endereço da publicação. A pesquisa espera 300 ms após a última tecla antes de consultar o SQLite, usa parâmetros SQL e não diferencia maiúsculas e minúsculas para letras latinas básicas. Somente usuários autenticados consultam a API.

### Compartilhar

Em uma publicação, clique em **Compartilhar**. Na aba **Externamente**, você encontrará WhatsApp, Telegram, Facebook, e-mail, cópia do link e compartilhamento nativo (para Instagram e outros apps, quando suportado). Nem todo navegador permite enviar links ao Instagram diretamente, portanto o botão oferece cópia do link como alternativa.

Na aba **Na Melodica**, pesquise um músico, selecione o destinatário e clique em **Enviar publicação**. A mensagem é salva no SQLite, associada a ambas as contas e à publicação original. Em **Mensagens** (no menu lateral e na navegação mobile), é possível abrir a conversa e acessar o link da postagem. Conversas abertas são atualizadas automaticamente a cada 10–15 segundos (sem depender de notificações externas).

**Importante:** na instalação local, links têm o endereço do seu próprio computador (`localhost` ou `127.0.0.1`), por isso **não funcionarão para pessoas em outros dispositivos** até que o site e o backend sejam hospedados em uma URL pública. As mensagens internas funcionam entre contas cadastradas no mesmo servidor.

### Banco de dados, arquivos e compatibilidade

- A tabela `messages` é criada automaticamente por `backend/db.mjs` ao iniciar o backend; há índices novos para mensagens e comentários. Não é necessário resetar um banco existente.
- Não foram adicionadas dependências npm.
- O banco continua em `backend/data/melodica.sqlite`; **faça backup de toda a pasta `backend/data` antes de substituir a versão antiga**. Preserve-a ao migrar para não perder usuários, comentários, publicações, mensagens e arquivos.
- A página `/post/<id>` abre uma publicação individual, mesmo que ela não esteja entre as últimas postagens do feed. A página `/messages` exibe a caixa de entrada.
- Não publique a pasta `backend/data` em repositórios Git nem em arquivos ZIP compartilhados.

### Roteiro de testes manuais

1. Execute `npm install` e `npm run dev`, abra o site e crie duas contas de teste.
2. Na primeira conta, crie uma postagem com imagem, outra com MP3 e outra com MP4. Verifique as prévias, a reprodução nos players e recarregue a página.
3. Na segunda conta, abra uma postagem e envie um comentário; confirme a exibição imediata e depois recarregue.
4. Pesquise parte do título e do nome da outra conta, usando também letras maiúsculas.
5. Compartilhe uma publicação da segunda conta para a primeira; entre novamente na primeira conta, abra **Mensagens** e confira o link da publicação.
6. Experimente as opções externas do modal de compartilhamento e teste as mensagens para arquivos ou usuários inexistentes.
7. Faça backup da pasta de dados e reinicie o backend; confirme se os arquivos, comentários e mensagens ainda aparecem.

**Limitação dos testes realizados nesta entrega:** a API SQLite, o upload e a leitura de arquivos verdadeiros (MP4, WebM, MP3, WAV e OGG), as rotas de comentário, pesquisa e mensagens foram testados. A sintaxe dos componentes TS/TSX alterados foi verificada, mas o build/preview completo no navegador não foi executado neste ambiente, pois as dependências de frontend não puderam ser instaladas. Antes de disponibilizar publicamente, execute `npm run build` e teste em computador e celular, além de configurar hospedagem HTTPS, backups e limites de armazenamento.

### Principais arquivos alterados/criados nesta edição

**Backend:** `backend/db.mjs`, `backend/server.mjs`.

**Adaptador e utilitários:** `src/integrations/supabase/client.ts`, `src/lib/posts.ts`, `src/lib/media-upload.ts` (novo), `src/lib/melodica.ts`.

**Componentes:** `src/components/melodica/post-card.tsx`, `src/components/melodica/post-media-player.tsx` (novo), `src/components/melodica/post-media-field.tsx` (novo), `src/components/melodica/share-post-dialog.tsx` (novo), `src/components/melodica/search-box.tsx` (novo), `src/components/melodica/create-post-dialog.tsx`, `src/components/melodica/app-shell.tsx`.

**Páginas:** `src/routes/_authenticated/messages.tsx` (novo), `src/routes/_authenticated/post/$postId.tsx` (novo), `src/routes/_authenticated/feed.tsx`.

O arquivo `src/routeTree.gen.ts` é gerado automaticamente pelo plugin TanStack Router ao iniciar/compilar o Vite e incorporará as rotas novas. Não precisa ser editado manualmente.

---

## Atualização — interesses musicais e recomendações personalizadas

Esta atualização mantém o frontend **TanStack Start + React**, a API **Node.js** e o banco **SQLite** local. Não é preciso instalar dependências adicionais ou substituir o banco existente.

### Novo fluxo de cadastro e login

1. O cadastro coleta os dados básicos de conta (sem exigir interesses na primeira tela).
2. Ao criar uma conta, o usuário autenticado abre automaticamente `/interests` (**Seus interesses musicais**).
3. O assistente mostra cinco etapas: **gêneros**, **instrumentos que toca ou quer aprender**, **artistas e bandas**, **assuntos musicais** e **revisão**.
4. É possível marcar e desmarcar opções, pesquisar artistas, adicionar artistas personalizados e pular categorias. Para concluir, é necessário selecionar **pelo menos um** interesse.
5. Depois de concluir, o usuário é direcionado ao feed **Para você**, agora classificado por afinidade. As outras abas (**Seguindo** e **Comunidades**) preservam seus filtros.
6. Em **Configurações → Meus interesses musicais**, o usuário pode editar preferências já salvas. Ao retornar ao feed, o ranking considera imediatamente a nova seleção.
7. Ao fazer login, contas antigas sem preferências concluídas são encaminhadas para `/interests`, inclusive quando tentam navegar diretamente para o feed, perfis, mensagens etc. Dados de perfil anteriores reconhecidos (ex.: `Gospel` e `Baixo`) aparecem como sugestões já selecionadas, mas **a personalização só é concluída quando o usuário confirmar**.

O progresso **antes de concluir** é mantido no armazenamento local do navegador, separado por identificador de usuário, evitando perda ao atualizar a página. As escolhas **concluídas** são salvas no SQLite e continuam disponíveis após encerrar a sessão e entrar novamente. Um progresso ainda não concluído em um dispositivo não se sincroniza com outros dispositivos.

### Classificação de novas postagens

A caixa **Criar publicação** agora inclui classificadores opcionais de **gêneros**, **instrumentos**, **artistas/bandas** e **assuntos musicais**. O autor pode atribuir múltiplos valores a cada categoria (até oito por categoria). Os novos campos são armazenados em cada publicação no SQLite, não apenas na interface.

As **postagens antigas** continuam aparecendo no feed. Para elas, o algoritmo também utiliza correspondência com título, descrição e nome/categoria da comunidade. Algumas expressões comuns são reconhecidas como equivalentes, como `Gospel e Worship` ≈ `Gospel` / `Worship`, `Contrabaixo` ≈ `Baixo`, `Música Clássica` ≈ `Clássica`. Postagens sem etiquetas e com descrições vagas podem ter menos precisão até receberem classificação adequada.

### Banco de dados e migração automática

`backend/db.mjs` realiza uma migração incremental ao iniciar:

- Cria a tabela `user_music_interests` (`user_id` PRIMARY KEY e FOREIGN KEY, `genres`, `instruments_played`, `instruments_learning`, `artists`, `topics`, `completed`, `updated_at`). Cada conta tem **uma linha**, atualizada por UPSERT; todos os conjuntos são armazenados em arrays JSON deduplicados e validados no servidor.
- Adiciona às tabelas `posts` existentes quatro colunas TEXT com JSON e valor-padrão `[]`: `genres`, `instruments`, `artists`, `topics`.
- Preserva as tabelas e os dados já existentes de cadastro, perfis, comentários, mídias, mensagens e publicações. Não exige apagar `melodica.sqlite`.
- As rotas `GET /api/interests` e `PUT /api/interests` usam o identificador do usuário **validado pelo cookie de sessão HttpOnly**: não recebem um ID arbitrário de conta. A API rejeita seleções inválidas, listas acima do limite, campos inconsistentes e a conclusão com nenhuma seleção.
- A rota `GET /api/feed/recommendations` só é acessível após login e consulta **postagens reais** do banco local.

**Antes de atualizar uma instalação com dados importantes, faça backup da pasta inteira `backend/data`**, incluindo `melodica.sqlite` e os uploads. O pacote de distribuição não contém contas ou mídias dos testes.

### Como a recomendação é calculada

A pontuação inicial é baseada em regras, sem serviço externo de IA:

| Sinal | Peso inicial |
| --- | --- |
| Gênero classificado igual a um interesse | +7 pontos |
| Instrumento classificado igual ao que toca/quer aprender | +6 pontos |
| Artista ou banda classificado igual | +8 pontos |
| Assunto classificado igual | +6 pontos |
| Correspondência encontrada no texto/comunidade (quando não houver classificação exata) | +2 a +2,7 pontos |
| Interesses em comum com o autor | até +7,7 pontos |
| Afinidade aprendida com etiquetas de postagens curtidas, comentadas ou compartilhadas anteriormente | até +8 pontos |
| Interação direta com a publicação | até +2 pontos |
| Atualidade da postagem | até +6 pontos, com queda exponencial em ~14 dias |
| Popularidade (curtidas) | até +5 pontos (influência aumentada no filtro **Populares**) |

O algoritmo limita o peso combinado de correspondências explícitas a 60 pontos e aplica uma segunda etapa de **diversificação**: desconta pontos para autores e comunidades que já apareceram repetidamente e reserva aproximadamente **uma a cada seis posições** para dar mais espaço a postagens recentes de outros músicos. A ordenação é **calculada novamente** quando o usuário atualiza as preferências ou interage com conteúdos; o feed utiliza a atualização automática das consultas do React Query e pode ser recarregado normalmente.

O ranking considera até **500 publicações mais recentes** e entrega até 30 resultados por solicitação. É uma implementação inicial, adequada para desenvolvimento e pequenas comunidades. Para produção em maior escala, recomenda-se paginação, índices e modelos de associação de interesses normalizados. Não há rastreamento de visualizações, tempo assistido ou inferência por áudio; somente os sinais efetivamente registrados no sistema entram no cálculo.

### Arquivos criados e alterados

- **Criados:** `backend/music-personalization.mjs`, `src/lib/music-interests.ts`, `src/lib/interests-api.ts`, `src/routes/_authenticated/interests.tsx`, `tests/music-interests.integration.mjs`.
- **Alterados:** `backend/db.mjs`, `backend/server.mjs`, `src/integrations/supabase/client.ts`, `src/lib/posts.ts`, `src/routes/register.tsx`, `src/routes/_authenticated/route.tsx`, `src/routes/_authenticated/feed.tsx`, `src/routes/_authenticated/settings.tsx`, `src/components/melodica/create-post-dialog.tsx`, `src/components/melodica/post-card.tsx`, `src/routeTree.gen.ts`, `package.json`, `README.md`.
- `src/routeTree.gen.ts` também foi sincronizado com as rotas de **interesses**, **mensagens** e **detalhes de postagens**. O plugin TanStack Router poderá regenerá-lo quando o Vite iniciar.

### Como executar e testar

```bash
npm install
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`. Cadastre uma conta, selecione interesses, confira a aba **Para você** e depois faça uma postagem nova selecionando categorias. Para testar preferências independentes, crie uma segunda conta e escolha gêneros diferentes. Verifique também edição em configurações e persistência depois de sair e entrar.

Execute o teste automatizado de API, que **não usa nem altera sua base de dados**, com:

```bash
npm run test:interests
```

O teste cria um banco SQLite temporário e valida cadastro, login, logout, isolamento de preferências, validação de interesses, classificação de postagens, ranking por pessoa, mudança da ordem após edição, interações e persistência depois de reiniciar o backend. O esquema SQLite antigo também foi testado separadamente para verificar migração sem perda de publicações.

**Limitação de validação:** foram executados os testes reais da API e a verificação de sintaxe dos componentes TS/TSX; não foi possível concluir `npm run build` nem inspecionar todas as telas em navegador nesta execução, porque as dependências completas do Vite/TanStack não estavam disponíveis no ambiente. Execute `npm run build` e verifique layout mobile antes de colocar o site em produção.
