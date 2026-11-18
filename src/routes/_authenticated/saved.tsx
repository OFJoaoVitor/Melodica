import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/use-session";
import { fetchFeed } from "@/lib/posts";
import { AppShell } from "@/components/melodica/app-shell";
import { PostCard } from "@/components/melodica/post-card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Salvos — Melodica" },
      { name: "description", content: "Suas publicações salvas na Melodica." },
      { property: "og:title", content: "Salvos — Melodica" },
      { property: "og:description", content: "Suas publicações salvas na Melodica." },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed", "saved", userId],
    enabled: !!userId,
    queryFn: () => fetchFeed({ sort: "recent", userId, savedOnly: true }),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Salvos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publicações que você guardou para ver depois.
          </p>
        </div>

        {isLoading ? (
          [0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} userId={userId} />)
        ) : (
          <div className="rounded-lg border bg-card p-10 text-center">
            <p className="font-medium text-ink">Você ainda não salvou nada.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Toque em “Salvar” em qualquer publicação para encontrá-la aqui.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
