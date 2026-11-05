import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowBigUp, Bookmark, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchComments, type Comment, type FeedPost } from "@/lib/posts";
import { initials, timeAgo } from "@/lib/melodica";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SharePostDialog } from "@/components/melodica/share-post-dialog";
import { PostMediaPlayer } from "@/components/melodica/post-media-player";

export function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const queryClient = useQueryClient();
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [shareOpen,setShareOpen]=useState(false);
  const { data:commentList=[],isLoading:commentsLoading,error:commentsError,refetch:refetchComments } = useQuery({
    queryKey:["comments",post.id], enabled:showComment, queryFn:()=>fetchComments(post.id),
  });

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
      // Atualiza a caixa imediatamente; refetch também mantém consistente após recarregar.
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
    <article id={post.id} className="scroll-mt-20 rounded-lg border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {post.author?.username ? (
          <Link to="/u/$username" params={{ username: post.author.username }} className="inline-flex min-w-0 items-center gap-2 rounded-md hover:text-primary" title={`Ver perfil de @${post.author.username}`}>
            <Avatar className="h-7 w-7">{post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} alt="" className="object-cover"/>}<AvatarFallback className="bg-primary-soft text-[10px] text-accent-foreground">{initials(authorName)}</AvatarFallback></Avatar>
            <span className="truncate font-medium text-foreground hover:text-primary">{authorName}</span>
            <span className="hidden text-muted-foreground sm:inline">@{post.author.username}</span>
          </Link>
        ) : (
          <><Avatar className="h-7 w-7">{post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} alt="" className="object-cover"/>}<AvatarFallback className="bg-primary-soft text-[10px] text-accent-foreground">{initials(authorName)}</AvatarFallback></Avatar><span className="font-medium text-foreground">{authorName}</span></>
        )}
        {post.community ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-primary">m/{post.community.slug}</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
      </div>

      <h2 className="mt-3 font-display text-base font-semibold text-ink">{post.title}</h2>
      {[post.genres, post.instruments, post.artists, post.topics].some(Boolean) ? <div className="mt-2 flex flex-wrap gap-1.5">
        {[post.genres, post.instruments, post.artists, post.topics].flatMap(raw => {
          if (!raw) return [];
          try { const values = JSON.parse(raw); return Array.isArray(values) ? values.filter((v): v is string => typeof v === "string") : []; }
          catch { return []; }
        }).slice(0, 6).map((value, i) => <span key={`${value}-${i}`} className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">{value}</span>)}
      </div> : null}
      {post.content ? (
        <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">{post.content}</p>
      ) : null}

      {post.media_url && post.post_type === "IMAGE" ? (
        <img
          src={post.media_url}
          alt={post.title}
          loading="lazy"
          className="mt-3 max-h-96 w-full rounded-md border object-cover"
        />
      ) : null}
      {post.media_url && post.post_type === "AUDIO" ? (
        <PostMediaPlayer type="AUDIO" url={post.media_url}/>
      ) : null}
      {post.media_url && post.post_type === "VIDEO" ? (
        <PostMediaPlayer type="VIDEO" url={post.media_url}/>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleLike.mutate()}
          disabled={toggleLike.isPending}
          aria-pressed={liked}
          className={cn("gap-1.5 text-muted-foreground", liked && "bg-primary-soft text-accent-foreground")}
        >
          <ArrowBigUp className="h-4 w-4" />
          {post.post_votes.length}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComment((v) => !v)}
          className="gap-1.5 text-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSave.mutate()}
          aria-pressed={saved}
          className={cn("gap-1.5 text-muted-foreground", saved && "text-primary")}
        >
          <Bookmark className="h-4 w-4" />
          Salvar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setShareOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          Compartilhar
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
              return <div key={item.id} className="flex gap-2 rounded-md bg-muted/40 p-3">
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
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.content}</p>
                </div>
              </div>;
            })}
          </div>
          <form className="space-y-2" onSubmit={event=>{
            event.preventDefault();if(sendComment.isPending)return;sendComment.mutate();
          }}>
            <Textarea value={comment} maxLength={2000} onChange={event=>setComment(event.target.value)} placeholder="Escreva um comentário" aria-label="Comentário" rows={2}/>
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
