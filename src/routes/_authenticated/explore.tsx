import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { fetchFeed } from "@/lib/posts";
import { AppShell } from "@/components/melodica/app-shell";
import { PostCard } from "@/components/melodica/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explorar — Melodica" },
      { name: "description", content: "Descubra as publicações musicais mais comentadas da Melodica." },
      { property: "og:title", content: "Explorar — Melodica" },
      { property: "og:description", content: "Descubra novos artistas e conteúdos na Melodica." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed", "explore", userId],
    queryFn: () => fetchFeed({ sort: "popular", userId }),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Explorar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O que está repercutindo na Melodica agora.
          </p>
        </div>

        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} userId={userId} />)
        ) : (
          <div className="rounded-lg border bg-card p-10 text-center">
            <p className="font-medium text-ink">Nada por aqui ainda.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assim que as primeiras publicações chegarem, elas aparecem nesta página.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
