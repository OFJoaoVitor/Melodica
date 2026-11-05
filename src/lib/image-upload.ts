import { uploadImage } from "@/integrations/supabase/client";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";

const allowedTypes = new Set(ACCEPTED_IMAGE_TYPES.split(","));

export function validateImageFile(file: File): string | null {
  if (!allowedTypes.has(file.type)) {
    return "Escolha uma imagem JPG, PNG, WebP ou GIF.";
  }
  if (file.size === 0) return "A imagem escolhida está vazia.";
  if (file.size > MAX_IMAGE_SIZE) return "A imagem deve ter no máximo 5 MB.";
  return null;
}

export async function uploadImageFile(file: File): Promise<string> {
  const error = validateImageFile(file);
  if (error) throw new Error(error);
  return uploadImage(file);
}
