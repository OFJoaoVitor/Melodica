import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, PenLine } from "lucide-react";
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
          <section className="melodica-panel rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold text-ink">Comunidades recomendadas</h2>
            <ul className="mt-3 space-y-2">
              {(communities ?? []).slice(0, 5).map((community) => (
                <li key={community.id} className="flex items-center justify-between gap-2">
                  <Link to="/c/$slug" params={{slug: community.slug}} className="truncate text-sm text-foreground hover:text-primary hover:underline">m/{community.slug}</Link>
                  <span className="text-xs text-muted-foreground">{community.member_count}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
              <Link to="/explore">Explorar comunidades</Link>
            </Button>
          </section>

          <section className="melodica-panel rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold text-ink">Músicos para conhecer</h2>
            {musicians && musicians.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {musicians.map((profile) => (
                  <li key={profile.id}>
                    <Link
                      to="/u/$username"
                      params={{ username: profile.username }}
                      className="flex min-w-0 items-center gap-2 rounded-md p-1 transition-colors hover:bg-primary-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      title={`Abrir perfil de @${profile.username}`}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />}
                        <AvatarFallback className="bg-primary-soft text-xs font-medium text-primary">
                          {initials(profile.display_name || profile.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{profile.display_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          @{profile.username} · {accountTypeLabel(profile.account_type)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Ainda não há outros perfis por aqui.
              </p>
            )}
          </section>
        </>
      }
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="melodica-page-heading py-1">
          <p className="melodica-kicker"><AudioLines className="h-3.5 w-3.5" /> O QUE ESTÁ TOCANDO</p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Seu feed musical<span className="text-primary">.</span></h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Novidades, ideias e sons compartilhados pela comunidade.</p>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(value) => setTab(value as FilterTab)}>
            <TabsList>
              <TabsTrigger value="for-you">Para você</TabsTrigger>
              <TabsTrigger value="following">Seguindo</TabsTrigger>
              <TabsTrigger value="communities">Comunidades</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSort(sort === "recent" ? "popular" : "recent")}
          >
            {sort === "recent" ? "Mais recentes" : "Populares"}
          </Button>
        </div>

        {tab === "for-you" ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary-soft/40 px-4 py-2.5 text-xs text-muted-foreground">
          <span>✨ Recomendações com base em seus interesses, interações e novas descobertas.</span>
          <Link to="/interests" className="font-semibold text-primary hover:underline">Editar interesses</Link>
        </div> : null}

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="melodica-composer flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left text-sm text-muted-foreground transition-all hover:border-primary/40"
        >
          <PenLine className="h-4 w-4 text-primary" aria-hidden />
          Compartilhe algo com a comunidade
        </button>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3 rounded-lg border bg-card p-5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} userId={userId} />)
        ) : (
          <div className="rounded-lg border bg-card p-10 text-center">
            <p className="font-medium text-ink">Nenhuma publicação ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "for-you"
                ? "Seja o primeiro a compartilhar algo com a Melodica."
                : tab === "following"
                  ? "Siga músicos para ver as publicações deles aqui."
                  : "Entre em comunidades para acompanhar as publicações delas."}
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              Criar publicação
            </Button>
          </div>
        )}
      </div>

      {userId ? (
        <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} userId={userId} />
      ) : null}
    </AppShell>
  );
}
