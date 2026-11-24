import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, ArrowRight, ArrowUpRight, Headphones, ImagePlus, Music2, PenLine, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fetchCommunities, fetchFeed, fetchPersonalizedFeed, fetchSuggestedProfiles } from "@/lib/posts";
import { AppShell } from "@/components/melodica/app-shell";
import { PostCard } from "@/components/melodica/post-card";
import { CreatePostDialog } from "@/components/melodica/create-post-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountTypeLabel, initials } from "@/lib/melodica";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Melodica" },
      { name: "description", content: "Acompanhe publicações das suas comunidades musicais." },
      { property: "og:title", content: "Feed — Melodica" },
      { property: "og:description", content: "Acompanhe publicações das suas comunidades musicais." },
    ],
  }),
  component: FeedPage,
});

type FilterTab = "for-you" | "following" | "communities";

function FeedPage() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const [tab, setTab] = useState<FilterTab>("for-you");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: myCommunities } = useQuery({
    queryKey: ["my-communities", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map((row) => row.community_id);
    },
  });

  const { data: following } = useQuery({
    queryKey: ["following", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (error) throw error;
      return data.map((row) => row.following_id);
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed", tab, sort, userId, myCommunities, following],
    enabled: !!userId,
    queryFn: () => tab === "for-you" ? fetchPersonalizedFeed(sort) :
      fetchFeed({
        sort,
        userId,
        ...(tab === "communities" ? { communityIds: myCommunities ?? [] } : {}),
        ...(tab === "following" ? { authorIds: following ?? [] } : {}),
      }),
  });

  const { data: communities } = useQuery({ queryKey: ["communities"], queryFn: fetchCommunities });
  const { data: musicians } = useQuery({
    queryKey: ["suggested", userId],
    enabled: !!userId,
    queryFn: () => fetchSuggestedProfiles(userId),
  });

  return (
    <AppShell
      onCreatePost={() => setCreateOpen(true)}
      aside={
        <>
          <section className="melodica-panel overflow-hidden border bg-card">
            <div className="border-b px-5 py-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary">Sua comunidade</p>
              <h2 className="text-base font-semibold text-ink">Encontre sua turma</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Gente que gosta dos mesmos sons que você.</p>
            </div>
            <div className="px-5 pb-2 pt-3">
              {(communities ?? []).slice(0, 5).map((community, index) => (
                <Link key={community.id} to="/c/$slug" params={{ slug: community.slug }} className="group flex items-center gap-3 rounded-lg py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground transition group-hover:text-primary">{community.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{community.member_count} {community.member_count === 1 ? "membro" : "membros"}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 transition group-hover:text-primary" />
                </Link>
              ))}
              {communities && communities.length === 0 && <p className="py-4 text-xs text-muted-foreground">As comunidades vão aparecer aqui.</p>}
            </div>
            <Link to="/explore" className="melodica-rail-link flex items-center justify-between px-5 py-3 text-xs font-semibold text-primary hover:bg-primary-soft/40">Ver todas as comunidades <ArrowRight className="h-4 w-4" /></Link>
          </section>

          <section className="melodica-panel border bg-card px-5 py-4">
            <h2 className="text-base font-semibold text-ink">Músicos para conhecer</h2>
            {musicians && musicians.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {musicians.slice(0, 5).map((person) => (
                  <li key={person.id}>
                    <Link to="/u/$username" params={{ username: person.username }} className="group flex items-center gap-3 rounded-lg py-2.5" title={`Abrir perfil de @${person.username}`}>
                      <Avatar className="h-10 w-10 shrink-0">
                        {person.avatar_url && <AvatarImage src={person.avatar_url} alt="" className="object-cover" />}
                        <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initials(person.display_name || person.username)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">{person.display_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{accountTypeLabel(person.account_type)}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-xs leading-5 text-muted-foreground">Novos perfis vão aparecer por aqui.</p>}
          </section>
          <p className="px-2 text-[11px] leading-5 text-muted-foreground">Melodica · Um espaço para compartilhar música e boas conversas.</p>
        </>
      }
    >
      <div className="mx-auto max-w-[724px] space-y-5">
        <header className="melodica-page-heading mb-1 pt-1">
          <p className="melodica-kicker"><Headphones className="h-3.5 w-3.5" /> ACONTECE NA MELODICA</p>
          <h1 className="mt-2.5 text-[26px] font-bold leading-tight text-ink sm:text-[30px]">Seu feed musical</h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Ideias, conversas e descobertas de quem vive música.</p>
        </header>

        <section className="melodica-composer rounded-[18px] border bg-card px-4 py-4 sm:px-5" aria-label="Criar uma publicação">
          <button type="button" onClick={() => setCreateOpen(true)} className="flex w-full items-center gap-3 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><PenLine className="h-4 w-4" /></span>
            <span className="flex-1 text-sm text-muted-foreground">O que você quer compartilhar hoje?</span>
            <span className="hidden rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground sm:inline-flex">Publicar</span>
          </button>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3">
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-primary"><ImagePlus className="h-4 w-4 text-primary" /> Foto</button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-primary"><Music2 className="h-4 w-4 text-primary" /> Áudio</button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-primary"><Video className="h-4 w-4 text-primary" /> Vídeo</button>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b">
          <Tabs value={tab} onValueChange={(value) => setTab(value as FilterTab)}>
            <TabsList className="melodica-feed-tabs">
              <TabsTrigger value="for-you">Para você</TabsTrigger>
              <TabsTrigger value="following">Seguindo</TabsTrigger>
              <TabsTrigger value="communities">Comunidades</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm" onClick={() => setSort(sort === "recent" ? "popular" : "recent")} className="gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowDownUp className="h-3.5 w-3.5" /> {sort === "recent" ? "Recentes" : "Populares"}
          </Button>
        </div>

        {tab === "for-you" && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Publicações escolhidas para você</span>
          <Link to="/interests" className="font-semibold text-primary hover:underline">Ajustar interesses</Link>
        </div>}

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3 rounded-[18px] border bg-card p-5">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-4">{posts.map((post) => <PostCard key={post.id} post={post} userId={userId} />)}</div>
        ) : (
          <div className="rounded-[18px] border bg-card px-8 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Music2 className="h-6 w-6" /></div>
            <p className="font-semibold text-ink">Ainda está tudo quietinho por aqui.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {tab === "for-you" ? "Que tal começar uma conversa sobre uma música que você gosta?" : tab === "following" ? "Siga outros músicos para ver as publicações deles." : "Entre em comunidades para acompanhar o que elas compartilham."}
            </p>
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>Criar publicação</Button>
          </div>
        )}
      </div>
      {userId && <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} userId={userId} />}
    </AppShell>
  );
}
