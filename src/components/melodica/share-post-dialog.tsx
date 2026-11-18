import { useEffect,useState } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Mail, Send, Share2 } from "lucide-react";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar";
import { Tabs,TabsContent,TabsList,TabsTrigger } from "@/components/ui/tabs";
import { initials } from "@/lib/melodica";
import { searchMelodica,sendMessage,type FeedPost } from "@/lib/posts";

export function SharePostDialog({post,open,onOpenChange,userId}:{post:FeedPost;open:boolean;onOpenChange:(open:boolean)=>void;userId:string}) {
  const queryClient=useQueryClient();
  const [search,setSearch]=useState("");
  const [debounced,setDebounced]=useState("");
  const [recipient,setRecipient]=useState<{id:string;name:string}|null>(null);
  const [sent,setSent]=useState(false);
  const url=typeof window!=="undefined"?`${window.location.origin}/post/${post.id}`:`/post/${post.id}`;
  useEffect(()=>{const t=setTimeout(()=>setDebounced(search.trim()),300);return ()=>clearTimeout(t);},[search]);
  useEffect(()=>{if(!open){setSearch("");setRecipient(null);setSent(false);}},[open]);
  const {data,isFetching,error}=useQuery({queryKey:["share-search",debounced],queryFn:()=>searchMelodica(debounced),enabled:open&&debounced.length>=2,staleTime:15_000});
  const send=useMutation({mutationFn:()=>sendMessage(recipient!.id,post.id,"Compartilhou uma publicação"),onSuccess:()=>{
    setSent(true);queryClient.invalidateQueries({queryKey:["conversations"]});toast.success("Publicação enviada com sucesso.");
  },onError:e=>toast.error(e instanceof Error?e.message:"Não foi possível enviar a publicação.")});
  async function copyLink(){try{await navigator.clipboard.writeText(url);toast.success("Link copiado.");}
    catch{toast.error("Não foi possível copiar automaticamente. Selecione o link abaixo.");}}
  const external=(base:string)=>window.open(base,"_blank","noopener,noreferrer");
  async function nativeShare(){
    if(navigator.share){try{await navigator.share({title:post.title,url});}catch(e){if((e as Error)?.name!=="AbortError")toast.error("Falha ao abrir o compartilhamento nativo.");}}
    else{await copyLink();toast.info("Cole o link no Instagram ou em outro aplicativo.");}
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Compartilhar publicação</DialogTitle><DialogDescription>{post.title}</DialogDescription></DialogHeader>
      <Tabs defaultValue="external" className="w-full"><TabsList className="w-full"><TabsTrigger value="external" className="flex-1">Externamente</TabsTrigger><TabsTrigger value="internal" className="flex-1">Na Melodica</TabsTrigger></TabsList>
        <TabsContent value="external" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={()=>external(`https://api.whatsapp.com/send?text=${encodeURIComponent(post.title+' '+url)}`)}>WhatsApp <ExternalLink className="h-3 w-3"/></Button>
            <Button variant="outline" onClick={()=>external(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`)}>Telegram <ExternalLink className="h-3 w-3"/></Button>
            <Button variant="outline" onClick={()=>external(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}>Facebook <ExternalLink className="h-3 w-3"/></Button>
            <Button variant="outline" onClick={()=>{window.location.href=`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`;}}><Mail className="h-4 w-4"/> E-mail</Button>
            <Button variant="outline" onClick={()=>void nativeShare()}><Share2 className="h-4 w-4"/> Instagram / Apps</Button>
            <Button variant="outline" onClick={()=>void copyLink()}><Copy className="h-4 w-4"/> Copiar link</Button>
          </div>
          <Input value={url} aria-label="Link da publicação" readOnly onFocus={e=>e.currentTarget.select()}/>
          <p className="text-xs text-muted-foreground">O Instagram não oferece compartilhamento direto de URLs pelo navegador. Use o menu nativo do dispositivo, quando disponível, ou copie o link.</p>
        </TabsContent>
        <TabsContent value="internal" className="mt-4 space-y-3">
          <Input value={search} onChange={e=>{setSearch(e.target.value);setRecipient(null);setSent(false);}} placeholder="Buscar pelo nome ou @usuário" aria-label="Buscar destinatário"/>
          {isFetching&&<p className="text-xs text-muted-foreground">Buscando músicos...</p>}
          {error&&<p role="alert" className="text-xs text-destructive">Não foi possível procurar usuários.</p>}
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {(data?.users??[]).filter(person=>person.id!==userId).map(person=><button type="button" key={person.id}
              onClick={()=>{setRecipient({id:person.id,name:person.display_name});setSent(false);}}
              className={`flex w-full items-center gap-2 rounded-md border p-2 text-left hover:bg-accent ${recipient?.id===person.id?"border-primary bg-primary-soft":"border-transparent"}`}>
              <Avatar className="h-8 w-8">{person.avatar_url&&<AvatarImage src={person.avatar_url} alt=""/>}<AvatarFallback>{initials(person.display_name)}</AvatarFallback></Avatar>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm">{person.display_name}</span><span className="block truncate text-xs text-muted-foreground">@{person.username}</span></span>
              {recipient?.id===person.id&&<Check className="h-4 w-4 text-primary"/>}
            </button>)}
            {debounced.length>=2&&!isFetching&&!error&&data?.users.filter(x=>x.id!==userId).length===0&&<p className="text-xs text-muted-foreground">Nenhum destinatário encontrado.</p>}
          </div>
          {recipient&&<p className="text-sm">Enviar para <strong>{recipient.name}</strong></p>}
          <Button className="w-full" disabled={!recipient||send.isPending||sent} onClick={()=>send.mutate()}><Send className="h-4 w-4"/>{sent?"Enviado":send.isPending?"Enviando...":"Enviar publicação"}</Button>
          {sent&&<div role="status" className="space-y-1 text-sm text-primary"><p>Publicação compartilhada com sucesso.</p><Link to="/messages" onClick={()=>onOpenChange(false)} className="underline">Abrir mensagens</Link></div>}
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>;
}
