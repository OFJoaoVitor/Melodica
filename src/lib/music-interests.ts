/** Opções de interesses para personalização e classificação de postagens. */
export const MUSIC_GENRES = ["Gospel e Worship", "Rock", "Pop", "Jazz", "Blues", "Música Clássica", "MPB", "Samba", "Pagode", "Sertanejo", "Funk", "Rap e Hip-Hop", "Trap", "R&B e Soul", "Reggae", "Eletrônica", "Indie", "Metal", "Punk", "Forró", "K-pop", "Lo-fi", "Country", "Bossa Nova"] as const;
export const MUSIC_INSTRUMENTS = ["Contrabaixo", "Guitarra", "Violão", "Piano", "Teclado", "Bateria", "Violino", "Violoncelo", "Saxofone", "Trompete", "Flauta", "Ukulele", "Percussão", "Voz/Canto", "Produção musical"] as const;
export const MUSIC_ARTISTS = ["Michael Jackson", "Bruno Mars", "The Weeknd", "Beyoncé", "Taylor Swift", "Coldplay", "Queen", "The Beatles", "Linkin Park", "Metallica", "Nirvana", "Kirk Franklin", "Hillsong Worship", "Gabriela Rocha", "Fernandinho", "Aline Barros", "Djavan", "Tim Maia", "Legião Urbana", "Charlie Brown Jr.", "Marília Mendonça", "Jorge & Mateus", "Kendrick Lamar", "Travis Scott"] as const;
export const MUSIC_TOPICS = ["Teoria musical", "Composição", "Produção musical", "Gravação e mixagem", "Improvisação", "Harmonia", "Técnica instrumental", "Covers musicais", "Aulas e tutoriais", "Equipamentos musicais", "Pedais e amplificadores", "Shows e festivais", "História da música", "Análise de músicas", "Partituras e tablaturas", "Criação de bandas", "Colaborações entre músicos"] as const;

export type MusicInterests = {
  genres: string[];
  instruments_played: string[];
  instruments_learning: string[];
  artists: string[];
  topics: string[];
  completed: boolean;
  updated_at: string | null;
};
export type InterestKey = "genres" | "instruments_played" | "instruments_learning" | "artists" | "topics";
export const EMPTY_INTERESTS: MusicInterests = {
  genres: [], instruments_played: [], instruments_learning: [], artists: [], topics: [],
  completed: false, updated_at: null,
};
export const selectedCount = (interests: MusicInterests) =>
  interests.genres.length + interests.instruments_played.length + interests.instruments_learning.length +
  interests.artists.length + interests.topics.length;
