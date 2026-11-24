# Melodica — Redesign 2

Esta versão parte do projeto **Melodica-limpo(1).zip** (não da primeira tentativa de redesign).

## Direção visual

Em vez de brilhos, gradientes fortes e cartões com efeitos em excesso, o projeto usa:

- superfícies neutras e textos de alto contraste;
- azul do mascote como cor de destaque, sem dominar toda a interface;
- hierarquia visual clara: nome, conteúdo, mídia e interações;
- navegação fixa no desktop, barra inferior compacta no mobile;
- componentes arredondados moderadamente, bordas discretas e espaçamento uniforme;
- imagens e mídias publicadas priorizadas em vez de elementos decorativos.

## Telas e componentes retrabalhados

- `src/styles.css`: sistema de cores e estilos claro/escuro.
- `src/components/melodica/app-shell.tsx`: navegação, busca, perfil, notificações e barra mobile.
- `src/components/melodica/logo.tsx`: proporções da marca e mascote estático.
- `src/routes/_authenticated/feed.tsx`: cabeçalho, compositor, filtros, sugestões e estados vazios.
- `src/components/melodica/post-card.tsx`: apresentação de autoria, tags, mídia e ações.
- `src/routes/_authenticated/explore.tsx`: cartões de comunidades e publicações em destaque.
- `src/components/melodica/profile-page.tsx`: capa, informações e conteúdo.
- `src/routes/_authenticated/c/$slug.tsx`: identidade das comunidades.
- `src/routes/_authenticated/saved.tsx`: visual das publicações salvas.
- `src/routes/_authenticated/messages.tsx`: cabeçalho e moldura da caixa de mensagens.
- `src/routes/_authenticated/settings.tsx`: cards e preferências.
- `src/routes/_authenticated/interests.tsx`: visual do cadastro de interesses.
- `src/routes/login.tsx`: nova composição do acesso e padrão das telas de autenticação.
- `src/components/melodica/search-box.tsx`: busca e resultados.
- `src/components/melodica/post-media-player.tsx`: cantos da mídia.

## Como rodar

```bash
npm ci
npm run dev
```

Execute dentro da pasta `Melodica-main`, com Node.js e npm disponíveis.

## Sobre a validação

Os 103 arquivos `.ts`/`.tsx` passaram na análise de sintaxe com o compilador TypeScript. O CSS foi conferido com um parser CSS. Não foi possível executar a compilação completa ou um teste visual no navegador neste ambiente porque as dependências npm não estavam instaladas e a instalação exigia pacotes indisponíveis. Verifique a aplicação localmente após `npm ci`.

O fluxo de dados, autenticação, upload e persistência da versão original foi preservado; o trabalho foi de interface. Mídias e textos reais continuam sendo carregados do banco de dados como antes.
