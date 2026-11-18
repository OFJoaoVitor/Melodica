import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, ChevronLeft, ChevronRight, Compass, Flame, Plus, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fetchCommunities, fetchTrendingPosts } from "@/lib/posts";
import { initials } from "@/lib/melodica";
import { AppShell } from "@/components/melodica/app-shell";
import { CommunityFormDialog } from "@/components/melodica/community-form-dialog";
import { PostCard } from "@/components/melodica/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/explore")({
  head: () => ({
    meta: [
      { title: "Explorar — Melodica" },
      { name: "description", content: "Explore comunidades musicais e as publicações em alta na Melodica." },
      { property: "og:title", content: "Explorar — Melodica" },
      { property: "og:description", content: "Descubra comunidades e posts em alta na Melodica." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createCommunityOpen, setCreateCommunityOpen] = useState(false);
  const communityStrip = useRef<HTMLDivElement>(null);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  const {
    data: communities,
    isLoading: communitiesLoading,
    isError: communitiesError,
    refetch: reloadCommunities,
  } = useQuery({ queryKey: ["communities"], queryFn: fetchCommunities });

  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    refetch: reloadPosts,
  } = useQuery({
    queryKey: ["feed", "trending", selectedCommunityId],
    queryFn: () => fetchTrendingPosts(selectedCommunityId ?? undefined),
  });

  const toggleMembership = useMutation({
    mutationFn: async ({ communityId, isMember }: { communityId: string; isMember: boolean }) => {
      if (!userId) throw new Error("Entre na sua conta para participar.");
      const result = isMember
        ? await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId)
        : await supabase.from("community_members").insert({ community_id: communityId, user_id: userId });
      if (result.error) throw result.error;
    },
    onSuccess: (_, { isMember }) => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      toast.success(isMember ? "Você saiu da comunidade." : "Você entrou na comunidade!");
    },
    onError: () => toast.error("Não foi possível atualizar sua participação."),
  });

  const selectedCommunity = communities?.find((community) => community.id === selectedCommunityId);
  const scrollCommunities = (direction: -1 | 1) => {
    communityStrip.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-7">
        <header className="melodica-page-heading flex flex-wrap items-end justify-between gap-4 py-1">
          <div><p className="melodica-kicker"><AudioLines className="h-3.5 w-3.5" /> DESCUBRA NOVOS SONS</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Explore a cena<span className="text-primary">.</span></h1>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">Comunidades e publicações que estão fazendo barulho.</p></div>
          <Button type="button" onClick={() => setCreateCommunityOpen(true)} className="rounded-xl"><Plus className="h-4 w-4" /> Criar comunidade</Button>
        </header>

        <section aria-labelledby="explore-communities" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="explore-communities" className="text-lg font-semibold text-ink">Comunidades</h2>
              <p className="text-xs text-muted-foreground">Deslize para o lado e conheça novos espaços musicais.</p>
            </div>
            <div className="flex gap-1">
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => scrollCommunities(-1)} aria-label="Comunidades anteriores">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => scrollCommunities(1)} aria-label="Próximas comunidades">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {communitiesError ? (
            <div role="alert" className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              Não foi possível carregar as comunidades.
              <Button size="sm" variant="outline" className="ml-3" onClick={() => void reloadCommunities()}>Tentar novamente</Button>
            </div>
          ) : (
            <div
              ref={communityStrip}
              className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3"
              role="region"
              aria-label="Comunidades, deslize horizontalmente"
              tabIndex={0}
            >
              <article className={cn(
                "melodica-panel flex w-44 shrink-0 snap-start flex-col rounded-2xl border bg-card p-3 transition-colors",
                !selectedCommunityId && "border-primary bg-primary-soft/30",
              )}>
                <button type="button" onClick={() => setSelectedCommunityId(null)} aria-pressed={!selectedCommunityId}
                  className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg text-center focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Compass className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-ink">Todas</span>
                  <span className="text-xs text-muted-foreground">Posts de toda a Melodica</span>
                </button>
                <span className="mt-3 rounded-md bg-primary-soft px-2 py-1.5 text-center text-xs font-medium text-primary">
                  Ver todos os posts
                </span>
              </article>

              {communitiesLoading ? (
                [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-44 shrink-0 snap-start rounded-xl" />)
              ) : (
                (communities ?? []).map((community) => {
                  const isMember = (community.community_members ?? []).some((member) => member.user_id === userId);
                  const selected = selectedCommunityId === community.id;
                  const updating = toggleMembership.isPending && toggleMembership.variables?.communityId === community.id;
                  const isCreator = community.creator_id === userId;
                  return (
                    <article key={community.id} className={cn(
                      "melodica-panel flex w-44 shrink-0 snap-start flex-col rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40",
                      selected && "border-primary bg-primary-soft/30",
                    )}>
                      <Link
                        to="/c/$slug"
                        params={{ slug: community.slug }}
                        title={`Abrir o perfil de ${community.name}`}
                        className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-lg text-center hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Avatar className={cn("h-14 w-14 border-2 border-background shadow-sm", selected && "ring-2 ring-primary")}>
                          {community.avatar_url && <AvatarImage src={community.avatar_url} alt="" className="object-cover" />}
                          <AvatarFallback
                            style={{ backgroundColor: community.accent ?? "#2563eb" }}
                            className="text-base font-semibold text-white"
                          >
                            {initials(community.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="w-full truncate text-sm font-semibold text-ink" title={community.name}>{community.name}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UsersRound className="h-3 w-3" aria-hidden />
                          {community.member_count} {community.member_count === 1 ? "membro" : "membros"}
                        </span>
                      </Link>
                      <button type="button" onClick={() => setSelectedCommunityId(community.id)}
                        aria-pressed={selected} className="mt-2 text-xs font-medium text-primary hover:underline">
                        {selected ? "Mostrando posts" : "Ver posts"}
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isMember ? "outline" : "default"}
                        className="mt-3 w-full"
                        disabled={!userId || toggleMembership.isPending || isCreator}
                        onClick={() => toggleMembership.mutate({ communityId: community.id, isMember })}
                        aria-label={isCreator ? `Você criou ${community.name}` : `${isMember ? "Sair de" : "Participar de"} ${community.name}`}
                      >
                        {isCreator ? "Criador" : updating ? "Aguarde..." : isMember ? "Participando" : "Participar"}
                      </Button>
                    </article>
                  );
                })
              )}
            </div>
          )}
          {!communitiesLoading && !communitiesError && communities?.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma comunidade disponível por enquanto.</p>
          )}
        </section>

        <section aria-labelledby="explore-trending" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 id="explore-trending" className="flex items-center gap-2 text-lg font-semibold text-ink">
                <Flame className="h-5 w-5 text-primary" aria-hidden />
                {selectedCommunity ? `Em alta em ${selectedCommunity.name}` : "Posts virais do momento"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Publicações com mais engajamento recente, atualizadas conforme as interações.
              </p>
            </div>
            {selectedCommunity && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCommunityId(null)}>
                Ver todas
              </Button>
            )}
          </div>

          {postsError ? (
            <div role="alert" className="rounded-lg border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Não foi possível carregar os posts agora.</p>
              <Button variant="outline" className="mt-3" onClick={() => void reloadPosts()}>Tentar novamente</Button>
            </div>
          ) : postsLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full rounded-lg" />)}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => <PostCard key={post.id} post={post} userId={userId} />)}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-10 text-center">
              <p className="font-medium text-ink">Ainda não há publicações por aqui.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedCommunity
                  ? "Essa comunidade ainda não tem posts. Participe e compartilhe sua música!"
                  : "Assim que os músicos começarem a publicar, os posts vão aparecer aqui."}
              </p>
            </div>
          )}
        </section>
        <CommunityFormDialog
          open={createCommunityOpen}
          onOpenChange={setCreateCommunityOpen}
          onCreated={(slug) => { void navigate({ to: "/c/$slug", params: { slug } }); }}
        />
      </div>
    </AppShell>
  );
}
