# Enviar publicações para alguém que você segue

A ação **Compartilhar** nos cartões de publicações abre, por padrão, a aba **Na Melodica**.

1. A lista de perfis seguidos aparece automaticamente (sem precisar digitar duas letras).
2. É possível buscar por nome, `@usuário` ou instrumento e escolher uma pessoa.
3. Uma mensagem de acompanhamento é opcional.
4. **Enviar** cria uma mensagem direta vinculada à publicação e notifica o destinatário.
5. Depois do envio, **Ver conversa** abre o chat com aquela pessoa; o cartão da publicação leva ao post.
6. A aba **Outros aplicativos** preserva os compartilhamentos externos e o link copiável.

A lista exibida nessa nova opção inclui **somente perfis que você segue**; o backend de mensagens permanece compatível com as conversas já existentes. Não houve alteração no formato do banco de dados.

## Como colocar no site

- Copie os arquivos atualizados para seu projeto, mantendo a estrutura de pastas.
- **Não substitua o arquivo `backend/data/melodica.sqlite`** nem os arquivos SQLite auxiliares da sua instalação anterior; eles contêm as contas, publicações e mensagens locais.
- No terminal, dentro de `Melodica-main`, execute `npm ci` se necessário e depois `npm run dev`.
- Entre na sua conta, siga outro perfil, abra uma publicação e clique em **Compartilhar**.
- As verificações do backend podem ser executadas com `npm run test:messages`, `npm run test:notifications`, `npm run test:communities` e `npm run test:interests`.

## Arquivos alterados

- `src/components/melodica/share-post-dialog.tsx` — novo seletor de pessoas seguidas, prévia e envio por DM.
- `src/components/melodica/post-card.tsx` — nome acessível do botão de compartilhar.
- `src/components/melodica/profile-page.tsx` — atualização imediata da lista ao seguir ou deixar de seguir.
- `tests/messages.integration.mjs` — novo teste de post enviado com mensagem e notificação.
