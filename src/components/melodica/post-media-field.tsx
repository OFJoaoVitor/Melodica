import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEDIA_RULES, validateMediaFile, verifyMediaSignature } from "@/lib/media-upload";
import type { PostType } from "@/lib/melodica";

export function PostMediaField({type,file,onChange,disabled}:{
  type:Exclude<PostType,"TEXT">;file:File|null;onChange:(file:File|null)=>void;disabled?:boolean;
}) {
  const [preview,setPreview]=useState<string|null>(null);
  useEffect(()=>{
    if(!file){setPreview(null);return;}
    const url=URL.createObjectURL(file);setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  const rule=MEDIA_RULES[type];
  return <div className="space-y-2">
    <Label htmlFor="post-media">Arquivo de {type==="IMAGE"?"imagem":type==="AUDIO"?"áudio":"vídeo"}</Label>
    <Input id="post-media" type="file" accept={rule.accept} disabled={disabled} className="h-auto min-h-10 py-2"
      onChange={async e=>{const chosen=e.target.files?.[0];e.target.value="";if(!chosen)return;
        const error=validateMediaFile(chosen,type);if(error){toast.error(error);return;}
        try{const signatureError=await verifyMediaSignature(chosen,type);
          if(signatureError){toast.error(signatureError);return;}onChange(chosen);
        }catch{toast.error("Não foi possível ler o arquivo selecionado.");}
      }}/>
    <p className="text-xs text-muted-foreground">Formatos aceitos: {rule.description}.</p>
    {preview && type==="IMAGE" && <img src={preview} className="max-h-48 w-full rounded-md border object-contain" alt="Prévia da imagem"/>}
    {preview && type==="VIDEO" && <video key={preview} controls playsInline preload="metadata" className="max-h-64 w-full rounded-md border" src={preview}>Prévia de vídeo indisponível.</video>}
    {preview && type==="AUDIO" && <audio key={preview} controls className="w-full" src={preview}>Prévia de áudio indisponível.</audio>}
    {file && <div className="flex items-center justify-between gap-2"><span className="truncate text-xs text-muted-foreground">{file.name}</span>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={()=>onChange(null)}>Remover arquivo</Button></div>}
  </div>;
}
