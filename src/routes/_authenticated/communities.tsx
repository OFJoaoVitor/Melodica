import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fetchCommunities } from "@/lib/posts";
import { AppShell } from "@/components/melodica/app-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/communities")({
  head: () => ({
    meta: [
      { title: "Comunidades — Melodica" },
      { name: "description", content: "Encontre comunidades por gênero, instrumento e ofício musical." },
      { property: "og:title", content: "Comunidades — Melodica" },
      { property: "og:description", content: "Encontre comunidades musicais na Melodica." },
    ],
  }),
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const { data: communities, isLoading } = useQuery({
    queryKey: ["communities"],
    queryFn: fetchCommunities,
  });

  const toggleMembership = useMutation({
    mutationFn: async ({ communityId, isMember }: { communityId: string; isMember: boolean }) => {
      if (isMember) {
        const { error } = await supabase
          .from("community_members")
          .delete()
          .eq("community_id", communityId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("community_members")
          .insert({ community_id: communityId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
    },
    onError: () => toast.error("Não foi possível atualizar sua participação."),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-ink">Comunidades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Espaços por gênero, instrumento e ofício. Entre nos que combinam com você.
        </p>

        {isLoading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(communities ?? []).map((community) => {
              const isMember = (community.community_members ?? []).some(
                (member: { user_id: string }) => member.user_id === userId,
              );
              return (
                <article key={community.id} className="rounded-lg border bg-card p-5">
                  <div
                    className="h-1.5 w-12 rounded-full"
                    style={{ background: community.accent ?? "var(--color-primary)" }}
                    aria-hidden
                  />
                  <h2 className="mt-3 font-display text-base font-semibold text-ink">
                    <span className="text-primary">m/</span>
                    {community.slug}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {community.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {community.member_count} membros
                    </span>
                    <Button
                      size="sm"
                      variant={isMember ? "outline" : "default"}
                      disabled={toggleMembership.isPending}
                      onClick={() =>
                        toggleMembership.mutate({ communityId: community.id, isMember })
                      }
                    >
                      {isMember ? "Sair" : "Participar"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
