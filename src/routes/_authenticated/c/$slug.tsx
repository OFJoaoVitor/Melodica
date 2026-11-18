import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Music2, PenLine, Settings2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fetchCommunityBySlug, fetchFeed } from "@/lib/posts";
import { initials } from "@/lib/melodica";
import { AppShell } from "@/components/melodica/app-shell";
import { CommunityFormDialog } from "@/components/melodica/community-form-dialog";
import { CreatePostDialog } from "@/components/melodica/create-post-dialog";
import { PostCard } from "@/components/melodica/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/c/$slug")({
  head: () => ({ meta: [
    { title: "Comunidade musical — Melodica" },
    { name: "description", content: "Conheça uma comunidade, seus membros e suas publicações no Melodica." },
  ] }),
  component: CommunityProfilePage,
});

function CommunityProfilePage() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const { data: community, isLoading, isError, refetch } = useQuery({
    queryKey: ["community", slug], queryFn: () => fetchCommunityBySlug(slug),
  });
  const { data: creator } = useQuery({
    queryKey: ["community-creator", community?.creator_id], enabled: !!community?.creator_id,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("username,display_name").eq("id", community!.creator_id).maybeSingle();
      if (error) throw error;
      return data as { username: string; display_name: string } | null;
    },
  });
  const { data: posts, isLoading: postsLoading, isError: postsError } = useQuery({
    queryKey: ["feed", "community", community?.id], enabled: !!community?.id,
    queryFn: () => fetchFeed({ sort: "recent", communityIds: [community!.id], limit: 100 }),
  });
  const isCreator = !!community?.creator_id && community.creator_id === userId;
  const isMember = !!community?.community_members?.some((member) => member.user_id === userId);

  const membership = useMutation({
    mutationFn: async () => {
      if (!community || !userId) throw new Error("Faça login para participar.");
      const response = isMember
        ? await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", userId)
        : await supabase.from("community_members").insert({ community_id: community.id, user_id: userId });
      if (response.error) throw response.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community", slug] });
      void queryClient.invalidateQueries({ queryKey: ["communities"] });
      void queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      toast.success(isMember ? "Você saiu da comunidade." : "Você entrou na comunidade!");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar sua participação."),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar para Explorar
        </Link>
        {isLoading ? (
          <><Skeleton className="h-40 w-full rounded-xl" /><Skeleton className="h-32 w-full rounded-xl" /></>
        ) : isError ? (
          <div role="alert" className="rounded-xl border bg-card p-7">
            <p>Não foi possível carregar esta comunidade.</p>
            <Button variant="outline" className="mt-3" onClick={() => void refetch()}>Tentar novamente</Button>
          </div>
        ) : !community ? (
          <div className="rounded-xl border bg-card p-7">
            <h1 className="text-xl font-semibold">Comunidade não encontrada</h1>
            <p className="mt-2 text-sm text-muted-foreground">Talvez ela tenha sido excluída ou o endereço esteja incorreto.</p>
            <Button asChild className="mt-4"><Link to="/explore">Ver comunidades</Link></Button>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="relative h-36 w-full sm:h-52" style={{ backgroundColor: community.accent ?? "#2563eb" }}>
                {community.banner_url && <img src={community.banner_url} alt={`Capa da comunidade ${community.name}`} className="h-full w-full object-cover" />}
                {!community.banner_url && <div className="absolute inset-0 flex items-center justify-end pr-10 opacity-20"><Music2 className="h-28 w-28 text-white" aria-hidden /></div>}
              </div>
              <div className="px-4 pb-5 sm:px-6">
                <div className="-mt-9 flex flex-wrap items-end justify-between gap-3 sm:-mt-12">
                  <Avatar className="relative z-10 h-[76px] w-[76px] border-4 border-card bg-card shadow-sm sm:h-24 sm:w-24">
                    {community.avatar_url && <AvatarImage src={community.avatar_url} alt={`Foto de ${community.name}`} className="object-cover" />}
                    <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: community.accent ?? "#2563eb" }}>
                      {initials(community.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-wrap gap-2">
                    {isCreator ? (
                      <Button variant="outline" onClick={() => setEditOpen(true)}><Settings2 className="h-4 w-4" /> Editar perfil</Button>
                    ) : (
                      <Button disabled={!userId || membership.isPending} variant={isMember ? "outline" : "default"} onClick={() => membership.mutate()}>
                        <UsersRound className="h-4 w-4" /> {membership.isPending ? "Aguarde..." : isMember ? "Sair da comunidade" : "Participar"}
                      </Button>
                    )}
                    <Button onClick={() => setCreatePostOpen(true)}><PenLine className="h-4 w-4" /> Publicar</Button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight text-ink">{community.name}</h1>
                  <p className="text-sm text-muted-foreground">m/{community.slug}</p>
                  {community.category && <Badge variant="secondary">{community.category}</Badge>}
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {community.description || "Essa comunidade ainda não tem descrição."}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><UsersRound className="h-4 w-4" /> {community.member_count} {community.member_count === 1 ? "membro" : "membros"}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Criada em {new Date(community.created_at.replace(" ", "T") + (community.created_at.includes("T") ? "" : "Z")).toLocaleDateString("pt-BR")}</span>
                    {creator && <span>Criada por <Link to="/u/$username" params={{ username: creator.username }} className="font-medium text-primary hover:underline">@{creator.username}</Link></span>}
                  </div>
                  {isCreator && <p className="pt-1 text-xs font-medium text-primary">Você é o criador e administrador desta comunidade.</p>}
                </div>
              </div>
            </section>
            <section aria-labelledby="community-posts" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 id="community-posts" className="text-lg font-semibold text-ink">Publicações da comunidade</h2>
                  <p className="text-xs text-muted-foreground">Novidades e conversas de {community.name}.</p>
                </div>
                <Button size="sm" onClick={() => setCreatePostOpen(true)}><PenLine className="h-4 w-4" /> Nova publicação</Button>
              </div>
              {postsLoading ? <Skeleton className="h-48 w-full" /> : postsError ? (
                <p role="alert" className="rounded-xl border bg-card p-5 text-sm text-destructive">Não foi possível carregar as publicações.</p>
              ) : posts?.length ? posts.map((post) => <PostCard key={post.id} post={post} userId={userId} />) : (
                <div className="rounded-xl border bg-card p-9 text-center">
                  <Music2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
                  <h3 className="mt-2 font-semibold">Ainda não há publicações</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Seja o primeiro a iniciar uma conversa por aqui.</p>
                  <Button className="mt-4" onClick={() => setCreatePostOpen(true)}>Criar publicação</Button>
                </div>
              )}
            </section>
            <CommunityFormDialog key={community.id} open={editOpen} onOpenChange={setEditOpen} community={community} />
            <CreatePostDialog key={community.id} open={createPostOpen} onOpenChange={setCreatePostOpen} userId={userId} defaultCommunityId={community.id} />
          </>
        )}
      </div>
    </AppShell>
  );
}
