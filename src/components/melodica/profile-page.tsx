import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarDays, Compass, Headphones, Heart, Link2,
  MapPin, Mic2, Music2, PenLine, Settings2, Share2, Sparkles,
  UserCheck, UserPlus, Users, Waves,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile, useSession } from "@/hooks/use-session";
import { fetchCommunities, fetchFeed, type FeedPost } from "@/lib/posts";
import { accountTypeLabel, EXPERIENCE_LEVELS, initials } from "@/lib/melodica";
import { AppShell } from "@/components/melodica/app-shell";
import { CreatePostDialog } from "@/components/melodica/create-post-dialog";
import { PostCard } from "@/components/melodica/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  website_url?: string | null;
  location?: string | null;
  account_type?: string | null;
  primary_instrument?: string | null;
  experience_level?: string | null;
  genres?: string[] | string | null;
  created_at?: string | null;
};

type Community = {
  id: string; name: string; slug: string; description: string;
  accent?: string | null; category?: string | null; member_count: number;
};

type ProfileTab = "posts" | "communities" | "likes";

const waveform = [15, 26, 18, 39, 59, 34, 19, 49, 78, 52, 25, 46, 67, 32, 18, 41, 62, 33, 17, 44, 71, 53, 31, 58, 39, 19, 36, 51, 24, 15];

function safeImageUrl(url?: string | null) {
  if (!url) return undefined;
  try { return ["http:", "https:"].includes(new URL(url).protocol) ? url : undefined; }
  catch { return undefined; }
}

function safeWebsiteUrl(url?: string | null) { return safeImageUrl(url); }

function memberSince(value?: string | null) {
  if (!value) return "Membro da Melodica";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") || value.includes("+") ? "" : "Z"));
  return Number.isNaN(date.getTime()) ? "Membro da Melodica" :
    `Desde ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(date)}`;
}

function profileGenres(value?: Profile["genres"]) {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch { return []; }
}

export function ProfilePage({ username }: { username?: string }) {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const { data: myProfile } = useMyProfile();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery<Profile | null>({
    queryKey: ["public-profile", username ?? userId],
    enabled: !!(username || userId),
    queryFn: async () => {
      const query = supabase.from("profiles").select("*");
      const { data, error } = username
        ? await query.eq("username", username).maybeSingle()
        : await query.eq("id", userId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Profile | null;
    },
  });

  const isMine = !!profile && profile.id === userId;
  const { data: followRows } = useQuery({
    queryKey: ["profile-followers", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("id,follower_id,following_id").eq("following_id", profile!.id);
      if (error) throw error;
      return (data ?? []) as { id: string; follower_id: string; following_id: string }[];
    },
  });
  const { data: followingRows } = useQuery({
    queryKey: ["profile-following", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("id").eq("follower_id", profile!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: postCounts } = useQuery({
    queryKey: ["profile-post-count", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("id").eq("author_id", profile!.id).limit(1000);
      if (error) throw error;
      return (data ?? []).length;
    },
  });
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["feed", "profile-posts", profile?.id],
    enabled: !!profile?.id && tab === "posts",
    queryFn: () => fetchFeed({ sort: "recent", authorIds: [profile!.id], userId, limit: 100 }),
  });
  const { data: memberRows, isLoading: communitiesLoading } = useQuery({
    queryKey: ["profile-memberships", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("community_members").select("community_id").eq("user_id", profile!.id);
      if (error) throw error;
      return (data ?? []) as { community_id: string }[];
    },
  });
  const { data: allCommunities } = useQuery({
    queryKey: ["communities"],
    enabled: !!profile?.id,
    queryFn: fetchCommunities,
  });
  const memberships = (allCommunities ?? []).filter((c: Community) =>
    (memberRows ?? []).some((m) => m.community_id === c.id),
  ) as Community[];

  const { data: likedIds } = useQuery({
    queryKey: ["profile-liked-ids", userId],
    enabled: isMine && tab === "likes",
    queryFn: async () => {
      const { data, error } = await supabase.from("post_votes").select("post_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((r: {post_id: string}) => r.post_id);
    },
  });
  const { data: likedPosts, isLoading: likesLoading } = useQuery<FeedPost[]>({
    queryKey: ["feed", "profile-liked", userId, likedIds],
    enabled: isMine && tab === "likes" && !!likedIds,
    queryFn: () => fetchFeed({ sort: "recent", postIds: likedIds ?? [], userId, limit: 100 }),
  });

  const follow = useMutation({
    mutationFn: async () => {
      if (!profile || !userId || isMine) return;
      const alreadyFollowing = (followRows ?? []).some((f) => f.follower_id === userId);
      if (alreadyFollowing) {
        const { error } = await supabase.from("follows").delete().eq("following_id", profile.id).eq("follower_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: profile.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-followers", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile-following", userId] });
      queryClient.invalidateQueries({ queryKey: ["following", userId] });
    },
    onError: () => toast.error("Não foi possível atualizar o acompanhamento."),
  });

  const hasFollowed = (followRows ?? []).some((row) => row.follower_id === userId);
  const genres = profileGenres(profile?.genres);
  const website = safeWebsiteUrl(profile?.website_url);
  const displayName = profile?.display_name || profile?.username || "Usuário";
  const level = EXPERIENCE_LEVELS.find((l) => l.value === profile?.experience_level)?.label;
  const otherProfileIsLoading = profileLoading || (!username && !userId);

  const aside = profile ? (
    <>
      <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <Music2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-ink">Identidade musical</h2>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Instrumento principal</p>
            <p className="mt-1 text-sm font-medium text-foreground">{profile.primary_instrument || "Ainda não definido"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Experiência</p>
            <p className="mt-1 text-sm text-foreground">{level || "Não informado"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Estilos favoritos</p>
            {genres.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((genre) => <Badge key={genre} variant="secondary" className="rounded-full">{genre}</Badge>)}
              </div>
            ) : <p className="mt-1 text-sm text-muted-foreground">Em construção 🎵</p>}
          </div>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Comunidades</h2>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-accent-foreground">{memberships.length}</span>
        </div>
        {memberships.length ? (
          <div className="mt-4 space-y-3">
            {memberships.slice(0, 4).map((community) => (
              <div key={community.id} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><Headphones className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">m/{community.slug}</p>
                  <p className="text-xs text-muted-foreground">{community.member_count} membros</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">Nenhuma comunidade por enquanto.</p>}
        <Button asChild variant="outline" className="mt-4 w-full" size="sm"><Link to="/communities">Explorar comunidades</Link></Button>
      </section>
    </>
  ) : undefined;

  return (
    <AppShell aside={aside} onCreatePost={isMine ? () => setCreateOpen(true) : undefined}>
      <div className="mx-auto max-w-4xl space-y-5 pb-6">
        {otherProfileIsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        ) : profileError ? (
          <section className="rounded-xl border bg-card p-10 text-center">
            <p className="font-semibold text-ink">Não foi possível carregar este perfil.</p>
            <p className="mt-1 text-sm text-muted-foreground">Verifique se o backend local está ligado.</p>
          </section>
        ) : !profile ? (
          <section className="rounded-xl border bg-card p-10 text-center">
            <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-ink">Perfil não encontrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">O nome de usuário pode ter sido alterado.</p>
            <Button asChild className="mt-5"><Link to="/feed">Voltar ao início</Link></Button>
          </section>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <Link to="/feed" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition hover:text-primary">
                <ArrowLeft className="h-4 w-4" /> Voltar ao início
              </Link>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                <Waves className="h-3.5 w-3.5" /> {isMine ? "Meu espaço musical" : "Perfil musical"}
              </span>
            </div>

            <section className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
              <div
                className="relative h-40 overflow-hidden bg-[#0b1c48] sm:h-48"
                style={safeImageUrl(profile.banner_url) ? { backgroundImage: `linear-gradient(90deg,rgba(10,23,61,.72),rgba(10,23,61,.26)),url(${JSON.stringify(safeImageUrl(profile.banner_url))})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              >
                {!safeImageUrl(profile.banner_url) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c1d4a] via-[#164cba] to-[#3676fb]" />
                    <div className="absolute -right-20 -top-44 h-96 w-96 rounded-full border border-white/20" />
                    <div className="absolute -right-7 -top-24 h-72 w-72 rounded-full border border-white/20" />
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle, #fff 0.8px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "linear-gradient(to left, black, transparent 75%)" }} />
                    <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-center gap-1 opacity-35 sm:gap-1.5" aria-hidden>
                      {waveform.map((h, i) => <span key={i} className="w-1.5 rounded-full bg-white sm:w-2" style={{ height: `${h}%` }} />)}
                    </div>
                  </>
                )}
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur sm:left-7">
                  <Sparkles className="h-3.5 w-3.5" /> Aqui a música tem voz
                </div>
                <div className="absolute bottom-4 right-5 flex items-center gap-1.5 text-xs font-semibold text-white/90 sm:right-7">
                  <Waves className="h-4 w-4" /> melodica
                </div>
              </div>

              <div className="relative px-5 pb-6 sm:px-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <Avatar className="-mt-10 h-20 w-20 border-4 border-card bg-card shadow-md sm:-mt-12 sm:h-24 sm:w-24">
                    {safeImageUrl(profile.avatar_url) ? <AvatarImage src={safeImageUrl(profile.avatar_url)} alt={`Foto de ${displayName}`} className="object-cover" /> : null}
                    <AvatarFallback className="bg-primary-soft text-2xl font-bold text-primary">{initials(displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    {isMine ? (
                      <>
                        <Button asChild variant="outline" size="sm"><Link to="/settings"><Settings2 className="mr-1.5 h-4 w-4" />Editar perfil</Link></Button>
                        <Button size="sm" onClick={() => setCreateOpen(true)}><PenLine className="mr-1.5 h-4 w-4" />Publicar</Button>
                      </>
                    ) : (
                      <Button size="sm" disabled={follow.isPending} variant={hasFollowed ? "outline" : "default"} onClick={() => follow.mutate()}>
                        {hasFollowed ? <UserCheck className="mr-1.5 h-4 w-4" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
                        {hasFollowed ? "Seguindo" : "Seguir"}
                      </Button>
                    )}
                    <Button variant="outline" size="icon" aria-label="Compartilhar perfil" title="Copiar link do perfil" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/u/${encodeURIComponent(profile.username)}`);
                        toast.success("Link do perfil copiado!");
                      } catch { toast.error("Não foi possível copiar o link."); }
                    }}><Share2 className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{displayName}</h1>
                    <Badge className="rounded-full bg-primary-soft px-2.5 text-xs font-semibold text-accent-foreground hover:bg-primary-soft">
                      <Music2 className="mr-1 h-3 w-3" />{accountTypeLabel(profile.account_type)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">@{profile.username}</p>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85">
                    {profile.bio?.trim() || (isMine ? "Este é o seu espaço para contar sua história com a música. Adicione uma biografia nas configurações." : "A história musical deste perfil ainda está sendo escrita.")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    {profile.primary_instrument && <span className="inline-flex items-center gap-1.5"><Mic2 className="h-3.5 w-3.5 text-primary" />{profile.primary_instrument}</span>}
                    {profile.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>}
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{memberSince(profile.created_at)}</span>
                    {website && <a href={website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-primary hover:underline"><Link2 className="h-3.5 w-3.5" />Site pessoal</a>}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 divide-x rounded-xl bg-surface p-3 text-center sm:max-w-md">
                  <div><p className="font-display text-xl font-bold text-ink">{postCounts ?? "–"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Publicações</p></div>
                  <div><p className="font-display text-xl font-bold text-ink">{followRows?.length ?? "–"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Seguidores</p></div>
                  <div><p className="font-display text-xl font-bold text-ink">{followingRows?.length ?? "–"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">Seguindo</p></div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-soft)]">
              <div className="flex gap-1 overflow-x-auto border-b px-3 pt-2 sm:px-5" role="tablist" aria-label="Conteúdo do perfil">
                {([
                  { id: "posts" as const, label: "Publicações", icon: PenLine },
                  { id: "communities" as const, label: "Comunidades", icon: Users },
                  ...(isMine ? [{ id: "likes" as const, label: "Curtidas", icon: Heart }] : []),
                ]).map(({ id, label, icon: Icon }) => (
                  <button type="button" key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                    className={cn("relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition-colors hover:text-primary", tab === id ? "text-primary" : "text-muted-foreground")}
                  >
                    <Icon className="h-4 w-4" />{label}
                    {tab === id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
              <div role="tabpanel" className="space-y-3 bg-surface/30 p-3 sm:p-4">
                {tab === "posts" && (postsLoading ? (
                  [0, 1].map(i => <Skeleton key={i} className="h-44 rounded-lg" />)
                ) : posts?.length ? (
                  posts.map(post => <PostCard key={post.id} post={post} userId={userId} />)
                ) : (
                  <EmptyPanel icon={PenLine} title="Ainda não há publicações" description={isMine ? "Compartilhe sua primeira descoberta, música ou conversa com a comunidade." : "Quando esta pessoa publicar algo, vai aparecer aqui."} action={isMine ? <Button onClick={() => setCreateOpen(true)}><PenLine className="mr-2 h-4 w-4" />Criar publicação</Button> : undefined} />
                ))}
                {tab === "communities" && (communitiesLoading ? (
                  <Skeleton className="h-40 rounded-lg" />
                ) : memberships.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {memberships.map(community => (
                      <div key={community.id} className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary" style={{ backgroundColor: "var(--color-primary-soft)" }}><Headphones className="h-5 w-5" /></span>
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">m/{community.slug}</p><p className="text-xs text-muted-foreground">{community.member_count} membros</p></div>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{community.description}</p>
                      </div>
                    ))}
                  </div>
                ) : <EmptyPanel icon={Headphones} title="Nenhuma comunidade por enquanto" description="Encontre outros apaixonados pelo mesmo estilo musical." action={<Button asChild variant="outline"><Link to="/communities"><Compass className="mr-2 h-4 w-4" />Explorar comunidades</Link></Button>} />)}
                {tab === "likes" && isMine && (likesLoading || !likedIds ? (
                  [0, 1].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)
                ) : likedPosts?.length ? (
                  likedPosts.map(post => <PostCard key={post.id} post={post} userId={userId} />)
                ) : <EmptyPanel icon={Heart} title="Nenhuma curtida ainda" description="Curta publicações interessantes para encontrá-las aqui." action={<Button asChild variant="outline"><Link to="/explore">Explorar publicações</Link></Button>} />)}
              </div>
            </section>
            <div className="flex items-center justify-center gap-2 pb-3 text-xs text-muted-foreground"><Waves className="h-3.5 w-3.5 text-primary" />Encontre sua frequência na Melodica.</div>
          </>
        )}
      </div>
      {isMine && userId ? <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} userId={userId} /> : null}
    </AppShell>
  );
}

function EmptyPanel({ icon: Icon, title, description, action }: {
  icon: typeof PenLine;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return <div className="rounded-xl border border-dashed bg-card px-5 py-12 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon className="h-6 w-6" /></div>
    <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>;
}
