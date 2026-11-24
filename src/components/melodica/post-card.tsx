import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchComments, fetchFollowingMusicians, type Comment, type FeedPost } from "@/lib/posts";
import { initials, timeAgo } from "@/lib/melodica";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SharePostDialog } from "@/components/melodica/share-post-dialog";
import { PostMediaPlayer } from "@/components/melodica/post-media-player";

 
function CommentWithMentions({ item }: { item: Comment }) {
  const mentioned = new Map((item.mentions ?? []).map(person => [person.username.toLowerCase(), person.username]));
  const pieces: ReactNode[] = [];
  const pattern = /(^|[^a-zA-Z0-9_@])@([a-z0-9_]{3,24})(?![a-zA-Z0-9_])/gi;
  let lastIndex = 0;
  for (const match of item.content.matchAll(pattern)) {
    const prefix = match[1] ?? "";
    const handle = match[2] ?? "";
    const at = match.index + prefix.length;
    pieces.push(item.content.slice(lastIndex, at));
    const username = mentioned.get(handle.toLowerCase());
    pieces.push(username ? <Link key={at} to="/u/$username" params={{ username }} className="font-semibold text-primary hover:underline">@{handle}</Link> : `@${handle}`);
    lastIndex = at + handle.length + 1;
  }
  pieces.push(item.content.slice(lastIndex));
  return <p className="mt-1 whitespace-pre-wrap break-words text-sm">{pieces}</p>;
}

export function PostCard({ post, userId, autoOpenComments = false }: { post: FeedPost; userId: string; autoOpenComments?: boolean }) {
  const queryClient = useQueryClient();
  const [showComment, setShowComment] = useState(autoOpenComments);
  const [comment, setComment] = useState("");
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const { data:commentList=[],isLoading:commentsLoading,error:commentsError,refetch:refetchComments } = useQuery({
    queryKey:["comments",post.id], enabled:showComment, queryFn:()=>fetchComments(post.id),
  });

  const { data: following = [] } = useQuery({
    queryKey: ["messaging-following", userId], queryFn: fetchFollowingMusicians,
    enabled: showComment && !!userId, staleTime: 15_000,
  });
  const mentionMatch = useMemo(() => {
    const textBefore = comment.slice(0, caret);
    return /(?:^|\s)@([a-z0-9_]{0,24})$/i.exec(textBefore);
  }, [comment, caret]);
  const mentionCandidates = useMemo(() => {
    if (!mentionMatch || mentionDismissed) return [];
    const query = (mentionMatch[1] ?? "").toLowerCase();
    return following.filter(person => person.id !== userId &&
      (person.username.toLowerCase().includes(query) || person.display_name.toLowerCase().includes(query)))
      .slice(0, 6);
  }, [following, mentionMatch, mentionDismissed, userId]);

  function insertMention(username: string) {
    if (!mentionMatch) return;
    const start = caret - (mentionMatch[1]?.length ?? 0) - 1;
    const inserted = `@${username} `;
    const next = comment.slice(0, start) + inserted + comment.slice(caret);
    const nextCaret = start + inserted.length;
    setComment(next);
    setCaret(nextCaret);
    setMentionDismissed(true);
    requestAnimationFrame(() => {
      commentRef.current?.focus();
      commentRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  const liked = post.post_votes.some((vote) => vote.user_id === userId);
  const saved = (post.saved_posts ?? []).some((item) => item.user_id === userId);
  const commentCount = Math.max(post.comments?.[0]?.count ?? 0,commentList.length);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (liked) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_votes")
          .insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["profile-liked-ids"] });
    },
    onError: () => toast.error("Não foi possível registrar sua curtida."),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (saved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success(saved ? "Removido dos salvos" : "Salvo para depois");
    },
    onError: () => toast.error("Não foi possível salvar agora."),
  });

  const sendComment = useMutation({
    mutationFn: async () => {
      const content=comment.trim();
      if(content.length<2 || content.length>2000) throw new Error("O comentário deve ter de 2 a 2.000 caracteres.");
      const { data,error }=await supabase.from("comments")
        .insert({ post_id:post.id,author_id:userId,content });
      if(error) throw error;
      return data as Comment;
    },
    onSuccess: (created) => {
      setComment("");
      setCaret(0);
      setMentionDismissed(false);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
       
      queryClient.setQueryData<Comment[]>(["comments",post.id],old =>
        old?.some(row=>row.id===created.id) ? old : [...(old??[]),created]);
      queryClient.invalidateQueries({queryKey:["comments",post.id]});
      queryClient.invalidateQueries({queryKey:["feed"]});
      toast.success("Comentário publicado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível enviar o comentário."),
  });

  const authorName = post.author?.display_name || post.author?.username || "Usuário";

  return (
    <article id={post.id} className="melodica-post-card scroll-mt-24 p-4 sm:px-6 sm:py-5">
      <div className="flex items-center gap-3">
        {post.author?.username ? (
          <Link to="/u/$username" params={{ username: post.author.username }} className="shrink-0" title={`Ver perfil de @${post.author.username}`}>
            <Avatar className="h-10 w-10">
              {post.author.avatar_url && <AvatarImage src={post.author.avatar_url} alt="" className="object-cover" />}
              <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initials(authorName)}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="h-10 w-10 shrink-0">
            {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} alt="" className="object-cover" />}
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initials(authorName)}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1">
          {post.author?.username ? (
            <Link to="/u/$username" params={{ username: post.author.username }} className="block w-fit max-w-full truncate text-sm font-semibold text-ink hover:text-primary">{authorName}</Link>
          ) : <span className="block truncate text-sm font-semibold text-ink">{authorName}</span>}
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {post.author?.username && <span className="max-w-[135px] truncate">@{post.author.username}</span>}
            {post.author?.username && <span aria-hidden>·</span>}
            <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
          </p>
        </div>
        {post.community && <Link to="/c/$slug" params={{ slug: post.community.slug }} className="max-w-[35%] truncate rounded-full bg-muted px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-primary-soft hover:text-primary">m/{post.community.slug}</Link>}
      </div>

      <h2 className="mt-4 text-[17px] font-semibold leading-[1.45] text-ink sm:text-lg">{post.title}</h2>
      {post.content && <p className="mt-2 whitespace-pre-line break-words text-[14px] leading-[1.75] text-foreground/90">{post.content}</p>}
      {[post.genres, post.instruments, post.artists, post.topics].some(Boolean) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[post.genres, post.instruments, post.artists, post.topics].flatMap(raw => {
            if (!raw) return [];
            try { const values = JSON.parse(raw); return Array.isArray(values) ? values.filter((v): v is string => typeof v === "string") : []; }
            catch { return []; }
          }).slice(0, 6).map((value, i) => <span key={`${value}-${i}`} className="rounded-md bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">{value}</span>)}
        </div>
      )}
      {post.media_url && post.post_type === "IMAGE" && (
        <img src={post.media_url} alt={post.title} loading="lazy" className="mt-4 max-h-[460px] w-full rounded-xl border bg-muted/30 object-contain" />
      )}
      {post.media_url && post.post_type === "AUDIO" && <PostMediaPlayer type="AUDIO" url={post.media_url} />}
      {post.media_url && post.post_type === "VIDEO" && <PostMediaPlayer type="VIDEO" url={post.media_url} />}

      <div className="mt-4 flex flex-wrap items-center gap-1 border-t pt-3 sm:gap-3">
        <Button variant="ghost" size="sm" onClick={() => toggleLike.mutate()} disabled={toggleLike.isPending} aria-pressed={liked} aria-label={`${liked ? "Descurtir" : "Curtir"} publicação. ${post.post_votes.length} curtidas`}
          className={cn("gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-primary", liked && "text-primary")}>
          <Heart className={cn("h-[17px] w-[17px]", liked && "fill-current")} /> {post.post_votes.length} <span className="hidden sm:inline">Curtidas</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowComment((v) => !v)} aria-expanded={showComment}
          className="gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-primary">
          <MessageCircle className="h-[17px] w-[17px]" /> {commentCount} <span className="hidden sm:inline">Comentários</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)} title="Compartilhar publicação" aria-label={`Compartilhar ${post.title} com alguém que você segue`} className="gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-primary">
          <Share2 className="h-[17px] w-[17px]" /> <span className="hidden min-[380px]:inline">Compartilhar</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => toggleSave.mutate()} disabled={toggleSave.isPending} aria-pressed={saved} aria-label={saved ? "Remover dos salvos" : "Salvar publicação"}
          className={cn("ml-auto gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-primary", saved && "text-primary")}>
          <Bookmark className={cn("h-[17px] w-[17px]", saved && "fill-current")} /> <span className="hidden sm:inline">{saved ? "Salvo" : "Salvar"}</span>
        </Button>
      </div>

      {showComment ? (
        <section className="mt-4 space-y-3 border-t pt-4" aria-label={`Comentários de ${post.title}`}>
          <h3 className="text-sm font-semibold text-ink">Comentários ({commentCount})</h3>
          {commentsLoading ? <p className="text-xs text-muted-foreground">Carregando comentários...</p> : null}
          {commentsError ? <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
            Não foi possível carregar os comentários.
            <Button size="sm" variant="outline" type="button" onClick={()=>void refetchComments()}>Tentar novamente</Button>
          </div> : null}
          {!commentsLoading && !commentsError && commentList.length===0 ? <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p> : null}
          <div className="max-h-96 space-y-3 overflow-y-auto" aria-live="polite">
            {commentList.map(item=>{
              const name=item.author?.display_name||item.author?.username||"Usuário";
              return <div key={item.id} className="flex gap-3 rounded-xl bg-muted/50 p-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {item.author?.avatar_url && <AvatarImage src={item.author.avatar_url} alt="" className="object-cover"/>}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.author?.username ? <Link to="/u/$username" params={{username:item.author.username}} className="font-semibold text-foreground hover:text-primary">{name}</Link> : <span className="font-semibold">{name}</span>}
                    {item.author?.username && <span className="text-muted-foreground">@{item.author.username}</span>}
                    <time dateTime={item.created_at} title={new Date(item.created_at.replace(" ","T")+"Z").toLocaleString("pt-BR")} className="text-muted-foreground">{timeAgo(item.created_at)}</time>
                  </div>
                  <CommentWithMentions item={item} />
                </div>
              </div>;
            })}
          </div>
          <form className="space-y-2" onSubmit={event=>{
            event.preventDefault();if(sendComment.isPending)return;sendComment.mutate();
          }}>
            <div className="relative">
              <Textarea ref={commentRef} value={comment} maxLength={2000}
                onChange={event=>{setComment(event.target.value);setCaret(event.target.selectionStart);setMentionDismissed(false);}}
                onClick={event=>setCaret(event.currentTarget.selectionStart)}
                onKeyUp={event=>setCaret(event.currentTarget.selectionStart)}
                onKeyDown={event=>{
                  if (event.key === "Escape") setMentionDismissed(true);
                  if ((event.key === "Enter" || event.key === "Tab") && mentionCandidates.length) {
                    event.preventDefault();insertMention(mentionCandidates[0].username);
                  }
                }}
                placeholder="Escreva um comentário. Use @ para marcar quem você segue."
                aria-label="Comentário, digite arroba para marcar músicos que você segue" rows={3}/>
              {mentionCandidates.length > 0 && <div className="melodica-mention-menu absolute bottom-full left-0 z-20 mb-2 w-full max-w-sm overflow-hidden rounded-xl border bg-popover p-1 shadow-xl" role="listbox" aria-label="Músicos que você segue para marcar">
                <p className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">Marcar músico que você segue</p>
                {mentionCandidates.map(person => <button type="button" role="option" aria-selected="false" key={person.id} onMouseDown={event=>event.preventDefault()} onClick={()=>insertMention(person.username)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-primary-soft">
                  <Avatar className="h-7 w-7"><AvatarImage src={person.avatar_url || undefined} alt="" /><AvatarFallback className="bg-primary-soft text-[10px] text-primary">{initials(person.display_name)}</AvatarFallback></Avatar>
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold text-foreground">{person.display_name}</span><span className="block truncate text-[11px] text-muted-foreground">@{person.username}</span></span>
                </button>)}
              </div>}
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><AtSign className="h-3 w-3" /> Você só pode marcar perfis que segue.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={()=>setShowComment(false)}>Fechar</Button>
              <Button type="submit" size="sm" disabled={sendComment.isPending||comment.trim().length<2}>
                {sendComment.isPending?"Enviando...":"Comentar"}
              </Button>
            </div>
          </form>
        </section>
      ) : null}
      <SharePostDialog post={post} open={shareOpen} onOpenChange={setShareOpen} userId={userId}/>
    </article>
  );
}
