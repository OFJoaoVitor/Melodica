import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fetchCommunities, fetchFeed, fetchSuggestedProfiles } from "@/lib/posts";
import { AppShell } from "@/components/melodica/app-shell";
import { PostCard } from "@/components/melodica/post-card";
import { CreatePostDialog } from "@/components/melodica/create-post-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accountTypeLabel } from "@/lib/melodica";

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
    queryFn: () =>
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
          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-ink">Comunidades recomendadas</h2>
            <ul className="mt-3 space-y-2">
              {(communities ?? []).slice(0, 5).map((community) => (
                <li key={community.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-foreground">m/{community.slug}</span>
                  <span className="text-xs text-muted-foreground">{community.member_count}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
              <Link to="/communities">Ver todas</Link>
            </Button>
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-ink">Músicos para seguir</h2>
            {musicians && musicians.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {musicians.map((profile) => (
                  <li key={profile.id}>
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile.display_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{profile.username} · {accountTypeLabel(profile.account_type)}
                    </p>
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

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40"
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
