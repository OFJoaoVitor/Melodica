import { uploadMedia } from "@/integrations/supabase/client";
import type { PostType } from "@/lib/melodica";

export const MEDIA_RULES = {
  IMAGE: {accept:"image/jpeg,image/png,image/webp,image/gif", max:5*1024*1024,description:"JPG, PNG, WebP ou GIF (até 5 MB)"},
  VIDEO: {accept:"video/mp4,video/webm,video/ogg", max:50*1024*1024,description:"MP4, WebM ou OGG (até 50 MB)"},
  AUDIO: {accept:"audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/webm",max:20*1024*1024,description:"MP3, WAV, OGG ou WebM (até 20 MB)"},
} as const;

export function validateMediaFile(file:File,type:PostType):string|null {
  if(type==="TEXT") return "Selecione um tipo de mídia antes do arquivo.";
  const rule=MEDIA_RULES[type];
  if(!rule.accept.split(",").includes(file.type)) return `Formato incompatível. Use ${rule.description}.`;
  if(file.size===0) return "O arquivo escolhido está vazio.";
  if(file.size>rule.max) return `Arquivo muito grande. Use ${rule.description}.`;
  return null;
}
export async function uploadPostMedia(file:File,type:PostType) {
  const error=validateMediaFile(file,type);
  if(error) throw new Error(error);
  const signatureError=await verifyMediaSignature(file,type);
  if(signatureError) throw new Error(signatureError);
  return uploadMedia(file);
}

/** Verificação rápida de assinatura, além do MIME informado pelo navegador. */
export async function verifyMediaSignature(file:File,type:PostType):Promise<string|null> {
  if(type==="TEXT") return "Nenhuma mídia foi selecionada.";
  const bytes=new Uint8Array(await file.slice(0,4096).arrayBuffer());
  const ascii=(start:number,end:number)=>Array.from(bytes.slice(start,end),b=>String.fromCharCode(b)).join("");
  const has=(word:string)=>ascii(0,bytes.length).includes(word);
  const riff=ascii(0,4)==="RIFF";
  const ebml=bytes.length>4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3&&has("webm");
  const ogg=ascii(0,4)==="OggS";
  let valid=false;
  switch(file.type) {
    case "image/jpeg":valid=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;break;
    case "image/png":valid=bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);break;
    case "image/webp":valid=riff&&ascii(8,12)==="WEBP";break;
    case "image/gif":valid=["GIF87a","GIF89a"].includes(ascii(0,6));break;
    case "video/mp4":valid=ascii(4,8)==="ftyp";break;
    case "video/webm":case "audio/webm":valid=ebml;break;
    case "audio/mpeg":valid=ascii(0,3)==="ID3"||(bytes[0]===0xff&&!!bytes[1]&&(bytes[1]&0xe0)===0xe0&&(bytes[1]&0x06)!==0);break;
    case "audio/wav":case "audio/x-wav":valid=riff&&ascii(8,12)==="WAVE";break;
    case "audio/ogg":valid=ogg&&(has("OpusHead")||has("vorbis"));break;
    case "video/ogg":valid=ogg&&has("theora");break;
  }
  return valid?null:`O arquivo não contém dados válidos do formato ${file.type}.`;
}
