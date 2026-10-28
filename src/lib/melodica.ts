export type AccountType = "MUSICIAN" | "SINGER" | "BAND" | "PRODUCER" | "FAN";
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL";
export type PostType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "MUSICIAN", label: "Músico" },
  { value: "SINGER", label: "Cantor(a)" },
  { value: "BAND", label: "Banda" },
  { value: "PRODUCER", label: "Produtor(a)" },
  { value: "FAN", label: "Apreciador(a)" },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "BEGINNER", label: "Iniciante" },
  { value: "INTERMEDIATE", label: "Intermediário" },
  { value: "ADVANCED", label: "Avançado" },
  { value: "PROFESSIONAL", label: "Profissional" },
];

export const INSTRUMENTS = [
  "Guitarra",
  "Violão",
  "Baixo",
  "Bateria",
  "Teclado",
  "Piano",
  "Voz",
  "Saxofone",
  "Violino",
  "Produção",
];

export const GENRES = [
  "Rock",
  "Metal",
  "MPB",
  "Jazz",
  "Blues",
  "Pop",
  "Samba",
  "Clássica",
  "Eletrônica",
  "Hip Hop",
  "Sertanejo",
  "Gospel",
];

export function accountTypeLabel(value?: string | null) {
  return ACCOUNT_TYPES.find((t) => t.value === value)?.label ?? "Apreciador(a)";
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
