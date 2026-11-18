import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/melodica";
import { searchMelodica } from "@/lib/posts";

export function SearchBox() {
  const [text,setText]=useState("");
  const [query,setQuery]=useState("");
  const [open,setOpen]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setQuery(text.trim()),300);return ()=>clearTimeout(timer);},[text]);
  const {data,isFetching,error}=useQuery({queryKey:["search",query],queryFn:()=>searchMelodica(query),enabled:query.length>=2,staleTime:15_000});
  const active=open&&text.trim().length>=2;
  const close=()=>{setOpen(false);setText("");setQuery("");};
  return <div className="relative mx-auto w-full max-w-md" onKeyDown={e=>{if(e.key==="Escape")setOpen(false);}}>
    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden/>
    <Input type="search" value={text} onFocus={()=>setOpen(true)} onChange={e=>{setText(e.target.value);setOpen(true);}}
      placeholder="Buscar músicos e publicações" aria-label="Buscar na Melodica" autoComplete="off" aria-expanded={active}
      className="bg-surface pl-9 pr-9"/>
    {text && <Button size="icon" variant="ghost" aria-label="Limpar pesquisa" onClick={close} className="absolute right-0 top-0 h-full w-9"><X className="h-4 w-4"/></Button>}
    {active && <>
      <button type="button" aria-label="Fechar resultados" onClick={()=>setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-transparent"/>
      <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border bg-popover p-3 shadow-lg" role="region" aria-label="Resultados da pesquisa">
        {isFetching&&<p className="text-xs text-muted-foreground">Pesquisando...</p>}
        {error&&<p role="alert" className="text-sm text-destructive">Não foi possível buscar. Verifique sua conexão.</p>}
        {!isFetching&&!error&&data&&<>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usuários ({data.users.length})</h3>
          {data.users.length===0&&<p className="mb-3 text-xs text-muted-foreground">Nenhum músico encontrado.</p>}
          <ul className="mb-3 space-y-1">{data.users.map(person=><li key={person.id}>
            <Link to="/u/$username" params={{username:person.username}} onClick={close} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
              <Avatar className="h-8 w-8">{person.avatar_url&&<AvatarImage src={person.avatar_url} alt=""/>}<AvatarFallback>{initials(person.display_name)}</AvatarFallback></Avatar>
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{person.display_name}</span><span className="block truncate text-xs text-muted-foreground">@{person.username}</span></span>
            </Link>
          </li>)}</ul>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Postagens ({data.posts.length})</h3>
          {data.posts.length===0&&<p className="text-xs text-muted-foreground">Nenhuma publicação encontrada.</p>}
          <ul className="space-y-1">{data.posts.map(post=><li key={post.id}>
            <Link to="/post/$postId" params={{postId:post.id}} onClick={close} className="block rounded-md px-2 py-2 hover:bg-accent">
              <span className="block truncate text-sm font-medium">{post.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{post.display_name} · {post.content?.slice(0,110)||"Publicação de mídia"}</span>
            </Link>
          </li>)}</ul>
          {data.users.length===0&&data.posts.length===0&&<p className="mt-2 text-center text-sm text-muted-foreground">Nenhum resultado encontrado para “{query}”.</p>}
        </>}
      </div>
    </>}
  </div>;
}
