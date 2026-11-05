import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageSquare } from "lucide-react";
import { AppShell } from "@/components/melodica/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fetchConversations,fetchMessages } from "@/lib/posts";
import { useSession } from "@/hooks/use-session";
import { initials,timeAgo } from "@/lib/melodica";

export const Route=createFileRoute("/_authenticated/messages")({
  head:()=>({meta:[{title:"Mensagens — Melodica"}]}),component:MessagesPage,
});
function MessagesPage() {
  const {user}=useSession();
  const [selected,setSelected]=useState<string|null>(null);
  const {data:conversations=[],isLoading,error,refetch}=useQuery({queryKey:["conversations"],queryFn:fetchConversations,refetchInterval:15_000});
  const other=conversations.find(c=>c.other_id===selected)??null;
  const {data:messages=[],isLoading:loadingMessages,error:messagesError}=useQuery({
    queryKey:["messages",selected],queryFn:()=>fetchMessages(selected!),enabled:!!selected,refetchInterval:10_000,
  });
  return <AppShell><div className="mx-auto max-w-4xl">
    <h1 className="mb-1 text-xl font-semibold text-ink">Mensagens</h1>
    <p className="mb-5 text-sm text-muted-foreground">Publicações compartilhadas por outros músicos aparecem aqui. As conversas são atualizadas automaticamente.</p>
    <div className="grid min-h-72 gap-4 md:grid-cols-[17rem_minmax(0,1fr)]">
      <div className="rounded-lg border bg-card p-3">
        <h2 className="mb-3 text-sm font-semibold">Conversas</h2>
        {isLoading&&<p className="text-sm text-muted-foreground">Carregando...</p>}
        {error&&<div role="alert" className="text-sm text-destructive">Falha ao carregar conversas. <Button size="sm" variant="outline" onClick={()=>void refetch()}>Tentar de novo</Button></div>}
        {!isLoading&&!error&&!conversations.length&&<p className="text-sm text-muted-foreground">Você ainda não recebeu nem enviou publicações por mensagem.</p>}
        {conversations.map(c=><button key={c.other_id} type="button" onClick={()=>setSelected(c.other_id)}
          className={`mb-1 flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-accent ${selected===c.other_id?"bg-primary-soft":""}`}>
          <Avatar className="h-9 w-9">{c.avatar_url&&<AvatarImage src={c.avatar_url} alt=""/>}<AvatarFallback>{initials(c.display_name)}</AvatarFallback></Avatar>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.display_name}</span>
            <span className="block truncate text-xs text-muted-foreground">{c.post_title||c.content}</span></span>
        </button>)}
      </div>
      <div className="min-w-0 rounded-lg border bg-card p-4">
        {!other?<div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><MessageSquare className="h-8 w-8"/><p className="text-sm">Selecione uma conversa para visualizar as publicações compartilhadas.</p></div>:<>
          <div className="mb-3 flex items-center gap-2 border-b pb-3"><Mail className="h-4 w-4 text-primary"/><Link to="/u/$username" params={{username:other.username}} className="font-semibold hover:text-primary">{other.display_name}</Link></div>
          {loadingMessages&&<p className="text-sm text-muted-foreground">Carregando mensagens...</p>}
          {messagesError&&<p role="alert" className="text-sm text-destructive">Não foi possível carregar as mensagens.</p>}
          <div className="max-h-[32rem] space-y-3 overflow-y-auto" aria-live="polite">
            {messages.map(m=><article key={m.id} className={`max-w-[95%] rounded-lg border p-3 text-sm sm:max-w-[85%] ${m.sender_id===user?.id?"ml-auto bg-primary-soft":"bg-muted/40"}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-semibold"><span>{m.sender_id===user?.id?"Você":m.sender_name||other.display_name}</span><time dateTime={m.created_at} className="text-muted-foreground">{timeAgo(m.created_at)}</time></div>
              {m.content&&<p className="mb-2 whitespace-pre-wrap break-words">{m.content}</p>}
              {m.post_id?<Link to="/post/$postId" params={{postId:m.post_id}} className="block rounded-md border bg-background p-3 text-primary hover:underline">{m.post_title||"Abrir publicação original"}</Link>:null}
            </article>)}
          </div>
        </>}
      </div>
    </div>
  </div></AppShell>;
}
