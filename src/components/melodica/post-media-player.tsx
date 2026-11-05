import { useRef,useState } from "react";
import { Volume2 } from "lucide-react";

/** Controles HTML5 preservados e ajuste de volume acessível, mesmo em layouts estreitos. */
export function PostMediaPlayer({url,type}:{url:string;type:"AUDIO"|"VIDEO"}) {
  const ref=useRef<HTMLMediaElement|null>(null);
  const [volume,setVolume]=useState(1);
  const changeVolume=(value:number)=>{
    setVolume(value);
    if(ref.current) ref.current.volume=value;
  };
  return <div className="mt-3 space-y-2">
    {type==="VIDEO"?<video ref={el=>{ref.current=el;}} src={url} controls playsInline preload="metadata" className="max-h-[28rem] w-full rounded-md border bg-black">Seu navegador não suporta este vídeo.</video>:
      <audio ref={el=>{ref.current=el;}} controls preload="metadata" src={url} className="w-full">Seu navegador não suporta áudio.</audio>}
    <label className="flex max-w-56 items-center gap-2 text-xs text-muted-foreground">
      <Volume2 className="h-4 w-4" aria-hidden/>
      <span>Volume</span>
      <input aria-label={`Volume do ${type==="VIDEO"?"vídeo":"áudio"}`} type="range" min={0} max={100} step={1}
        value={Math.round(volume*100)} onChange={event=>changeVolume(Number(event.target.value)/100)} className="w-24 accent-primary"/>
      <span>{Math.round(volume*100)}%</span>
    </label>
  </div>;
}
