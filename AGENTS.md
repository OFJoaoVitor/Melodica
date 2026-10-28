<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Data lives in Lovable Cloud (Postgres + RLS), not Prisma/MySQL as the original spec says — the platform stack is TanStack Start and cannot run Prisma.
- Shared UI for the signed-in area goes through `src/components/melodica/app-shell.tsx`; new protected pages are route files under `src/routes/_authenticated/` and render inside `<AppShell>`.
- Data access for feed/communities/profiles lives in `src/lib/posts.ts` with the browser Supabase client and TanStack Query; keep queries out of components so caching stays consistent.
- Domain labels/constants (tipos de perfil, níveis, instrumentos, gêneros) live in `src/lib/melodica.ts` so forms and profiles share one source.
