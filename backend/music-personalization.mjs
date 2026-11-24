 
const CATALOG = {"genres": ["Gospel e Worship", "Rock", "Pop", "Jazz", "Blues", "Música Clássica", "MPB", "Samba", "Pagode", "Sertanejo", "Funk", "Rap e Hip-Hop", "Trap", "R&B e Soul", "Reggae", "Eletrônica", "Indie", "Metal", "Punk", "Forró", "K-pop", "Lo-fi", "Country", "Bossa Nova"], "instruments": ["Contrabaixo", "Guitarra", "Violão", "Piano", "Teclado", "Bateria", "Violino", "Violoncelo", "Saxofone", "Trompete", "Flauta", "Ukulele", "Percussão", "Voz/Canto", "Produção musical"], "artists": ["Michael Jackson", "Bruno Mars", "The Weeknd", "Beyoncé", "Taylor Swift", "Coldplay", "Queen", "The Beatles", "Linkin Park", "Metallica", "Nirvana", "Kirk Franklin", "Hillsong Worship", "Gabriela Rocha", "Fernandinho", "Aline Barros", "Djavan", "Tim Maia", "Legião Urbana", "Charlie Brown Jr.", "Marília Mendonça", "Jorge & Mateus", "Kendrick Lamar", "Travis Scott"], "topics": ["Teoria musical", "Composição", "Produção musical", "Gravação e mixagem", "Improvisação", "Harmonia", "Técnica instrumental", "Covers musicais", "Aulas e tutoriais", "Equipamentos musicais", "Pedais e amplificadores", "Shows e festivais", "História da música", "Análise de músicas", "Partituras e tablaturas", "Criação de bandas", "Colaborações entre músicos"]};
const fold = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g,' ').trim();
const parse = value => {try {const v=JSON.parse(value || '[]');return Array.isArray(v)?v:[];}catch{return []}};
const distinct = values => [...new Map(values.map(v=>[fold(v),v])).values()];
const fields=['genres','instruments_played','instruments_learning','artists','topics'];
export const emptyInterests = () => ({genres:[],instruments_played:[],instruments_learning:[],artists:[],topics:[],completed:false,updated_at:null});
export function readInterests(db,userId) {
  const row=db.prepare('SELECT * FROM user_music_interests WHERE user_id=?').get(userId);
  if (row) return Object.fromEntries([...fields.map(k=>[k,parse(row[k])]),['completed',!!row.completed],['updated_at',row.updated_at]]);
   
  const profile=db.prepare('SELECT genres,primary_instrument FROM profiles WHERE id=?').get(userId);
  const savedGenres=parse(profile?.genres).map(v=> CATALOG.genres.find(g=>fold(g)===fold(v) || (fold(g)==='gospel e worship' && fold(v)==='gospel') || (fold(g)==='musica classica' && fold(v)==='classica') || (fold(g)==='rap e hip hop' && fold(v)==='hip hop'))).filter(Boolean);
  const instrument=CATALOG.instruments.find(i=>fold(i)===fold(profile?.primary_instrument) || (i==='Contrabaixo' && fold(profile?.primary_instrument)==='baixo') || (i==='Voz/Canto' && fold(profile?.primary_instrument)==='voz'));
  return {...emptyInterests(),genres:distinct(savedGenres),instruments_played:instrument?[instrument]:[]};
}
function validateList(value,field,max) {
  if(!Array.isArray(value) || value.length>max) throw Object.assign(new Error(`Seleção inválida para ${field} (máximo de ${max}).`),{status:400});
  const normalized=[];
  const allowed=field.startsWith('instruments_')?'instruments':field;
  for(const raw of value){
    if(typeof raw!=='string' || !raw.trim() || raw.trim().length>80 || /[<>\r\n]/.test(raw)) throw Object.assign(new Error(`Interesse inválido em ${field}.`),{status:400});
    const canonical=CATALOG[allowed]?.find(label=>fold(label)===fold(raw));
    if(!canonical && field!=='artists') throw Object.assign(new Error(`Opção de ${field} não reconhecida.`),{status:400});
    normalized.push(canonical || raw.trim().replace(/\s+/g,' '));
  }
  return distinct(normalized);
}
export function validateInterests(payload) {
  if(!payload || typeof payload!=='object'||Array.isArray(payload)) throw Object.assign(new Error('Preferências inválidas.'),{status:400});
  const result={
    genres:validateList(payload.genres,'genres',24),
    instruments_played:validateList(payload.instruments_played,'instruments_played',15),
    instruments_learning:validateList(payload.instruments_learning,'instruments_learning',15),
    artists:validateList(payload.artists,'artists',40),
    topics:validateList(payload.topics,'topics',17),
  };
  const played=new Set(result.instruments_played.map(fold));
  if(result.instruments_learning.some(v=>played.has(fold(v)))) throw Object.assign(new Error('Um mesmo instrumento deve estar em apenas uma categoria.'),{status:400});
  if(!fields.some(k=>result[k].length)) throw Object.assign(new Error('Selecione pelo menos um interesse musical.'),{status:400});
  return result;
}
export function validatePostCategories(payload){
  return {
    genres:validateList(payload.genres ?? [],'genres',8),
    instruments:validateList(payload.instruments ?? [],'instruments',8),
    artists:validateList(payload.artists ?? [],'artists',8),
    topics:validateList(payload.topics ?? [],'topics',8),
  };
}
const intersect=(a,b)=>a.filter(x=>b.has(fold(x))).length;
function affinity(a,b){
  if(!a||!b)return 0;
  const i=(a.instruments_played || []).concat(a.instruments_learning || []);
  const j=new Set((b.instruments_played || []).concat(b.instruments_learning || []).map(fold));
  return Math.min(11,intersect(a.genres||[],new Set((b.genres||[]).map(fold)))*2.5+
    intersect(i,j)*1.6+intersect(a.artists||[],new Set((b.artists||[]).map(fold)))*2+
    intersect(a.topics||[],new Set((b.topics||[]).map(fold))));
}
 
const aliases = {
  'gospel e worship':['gospel','worship','louvor','corinho'],
  'rap e hip hop':['rap','hip hop'],
  'r b e soul':['r b','soul','rnb'],
  'musica classica':['musica classica','classica','erudita'],
  'voz canto':['voz','canto','vocal'],
  'contrabaixo':['contrabaixo','baixo','bass'],
  'producao musical':['producao musical','producao'],
  'aulas e tutoriais':['aula','aulas','tutorial','tutoriais'],
  'tecnica instrumental':['tecnica instrumental','tecnica'],
  'pedais e amplificadores':['pedais','amplificadores'],
};
const contains=(text,needle)=>[fold(needle),...(aliases[fold(needle)] || [])].some(term=>term.length>2 && (` ${text} `).includes(` ${term} `));
function interactionSignals(posts,voted,commented,shared) {
  const signal = {genres:new Map(),instruments:new Map(),artists:new Map(),topics:new Map()};
  for (const post of posts) {
    const weight=(voted.has(post.id)?2:0)+(commented.has(post.id)?3:0)+(shared.has(post.id)?4:0);
    if (!weight) continue;
    for (const key of Object.keys(signal)) {
      for (const tag of parse(post[key])) {
        const normalized=fold(tag);
        signal[key].set(normalized,Math.min(8,(signal[key].get(normalized)||0)+weight));
      }
    }
  }
  return signal;
}
function scorePost(post,interest,authorInterest,actions,sort,signals){
  const text=fold([post.title,post.content,post.community_name,post.community_category].join(' '));
  const tags=parse(post.tags);
  const metadata={genres:parse(post.genres),instruments:parse(post.instruments),artists:parse(post.artists),topics:parse(post.topics)};
  let match=0;
  const dimensions=[
    ['genres',interest.genres,7,2],
    ['instruments',[...interest.instruments_played,...interest.instruments_learning],6,2.2],
    ['artists',interest.artists,8,2.7],
    ['topics',interest.topics,6,2.2]
  ];
  for(const [key,preferences,exactWeight,textWeight] of dimensions){
    const known=new Set([...metadata[key],...tags].map(fold));
    for(const value of preferences){
      match+=known.has(fold(value))?exactWeight:contains(text,value)?textWeight:0;
    }
  }
  match=Math.min(match,60);
  match+=affinity(interest,authorInterest)*0.7;
   
  let learned=0;
  for(const key of Object.keys(signals)) {
    for(const tag of metadata[key]) learned+=Math.min(4,signals[key].get(fold(tag)) || 0)*0.85;
  }
  match+=Math.min(8,learned);
   
  match+=actions.voted?0.5:0;
  match+=actions.commented?0.6:0;
  match+=actions.shared?0.9:0;
  const ageH=Math.max(0,(Date.now()-new Date(post.created_at.endsWith('Z')?post.created_at:post.created_at.replace(' ','T')+'Z').getTime())/3600000);
  const freshness=6*Math.exp(-ageH/(24*14));
  const popularity=Math.min(5,Math.log2(1+post.votes_count)*1.8);
  return match+(sort==='popular'?1.6:1)*popularity+(sort==='recent'?1.3:1)*freshness;
}
export function personalizedFeed(db,userId,sort='recent',limit=30){
  const prefs=readInterests(db,userId);
  if(!prefs.completed)return [];
   
  const posts=db.prepare(`SELECT p.*, c.name AS community_name,c.category AS community_category,
    (SELECT COUNT(*) FROM post_votes pv WHERE pv.post_id=p.id) AS votes_count
    FROM posts p LEFT JOIN communities c ON c.id=p.community_id ORDER BY p.created_at DESC LIMIT 500`).all();
  const authors=new Map();
  const interests=db.prepare('SELECT * FROM user_music_interests WHERE completed=1').all();
  for(const record of interests)authors.set(record.user_id,Object.fromEntries(fields.map(k=>[k,parse(record[k])])));
   
  for(const post of posts) if(!authors.has(post.author_id))authors.set(post.author_id,readInterests(db,post.author_id));
  const voted=new Set(db.prepare('SELECT post_id FROM post_votes WHERE user_id=?').all(userId).map(r=>r.post_id));
  const commented=new Set(db.prepare('SELECT post_id FROM comments WHERE author_id=?').all(userId).map(r=>r.post_id));
  const shared=new Set(db.prepare('SELECT post_id FROM messages WHERE sender_id=? AND post_id IS NOT NULL').all(userId).map(r=>r.post_id));
  const signals=interactionSignals(posts,voted,commented,shared);
  const ranked=posts.map(p=>({post:p,score:scorePost(p,prefs,authors.get(p.author_id),{voted:voted.has(p.id),commented:commented.has(p.id),shared:shared.has(p.id)},sort,signals)}));
  const result=[],authorCount=new Map(),communityCount=new Map();
  while(ranked.length && result.length<limit){
     
    const explore=result.length%6===5;
    let best=0,bestScore=-Infinity;
    for(let i=0;i<ranked.length;i++){
      const item=ranked[i],p=item.post;
      const diversity=3*(authorCount.get(p.author_id)||0)+1.5*(communityCount.get(p.community_id)||0);
      const ageDays=Math.max(0,(Date.now()-Date.parse(p.created_at.replace(' ','T')+'Z'))/86400000);
      const discovery=8*Math.exp(-ageDays/14)+(authorCount.has(p.author_id)?0:5);
      const effective=(explore ? discovery+0.12*item.score : item.score)-diversity;
      if(effective>bestScore){best=i;bestScore=effective;}
    }
    const [{post}]=ranked.splice(best,1);
    result.push(post);
    authorCount.set(post.author_id,(authorCount.get(post.author_id)||0)+1);
    if(post.community_id)communityCount.set(post.community_id,(communityCount.get(post.community_id)||0)+1);
  }
  return result;
}
