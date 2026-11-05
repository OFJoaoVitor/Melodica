import { createFileRoute,Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/melodica/app-shell";
import { PostCard } from "@/components/melodica/post-card";
import { fetchFeed } from "@/lib/posts";
import { useSession } from "@/hooks/use-session";
import { Skeleton } from "@/components/ui/skeleton";

export const Route=createFileRoute("/_authenticated/post/$postId")({
  head:()=>({meta:[{title:"Publicação — Melodica"}]}),
  component:PostDetail,
});
function PostDetail(){
  const {postId}=Route.useParams();
  const {user}=useSession();
  const {data,isLoading,error}=useQuery({queryKey:["feed","post",postId],queryFn:()=>fetchFeed({sort:"recent",postIds:[postId],limit:1})});
  return <AppShell><div className="mx-auto max-w-2xl space-y-4">
    <Link to="/feed" className="text-sm text-primary hover:underline">← Voltar ao feed</Link>
    {isLoading?<Skeleton className="h-64 w-full"/>:error?<p role="alert" className="rounded-lg border p-5 text-destructive">Não foi possível carregar a publicação.</p>:
      data?.[0]&&user?.id?<PostCard post={data[0]} userId={user.id}/>:<p className="rounded-lg border p-5">Publicação não encontrada.</p>}
  </div></AppShell>;
}
