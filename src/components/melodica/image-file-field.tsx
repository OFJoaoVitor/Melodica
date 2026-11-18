import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCEPTED_IMAGE_TYPES, validateImageFile } from "@/lib/image-upload";

type ImageFileFieldProps = {
  id: string;
  label: string;
  currentUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClear?: () => void;
  disabled?: boolean;
  helperText?: string;
};

export function ImageFileField({
  id,
  label,
  currentUrl,
  file,
  onFileChange,
  onClear,
  disabled = false,
  helperText,
}: ImageFileFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const imageUrl = previewUrl ?? (file ? null : currentUrl);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Prévia: ${label.toLowerCase()}`}
          className="max-h-48 w-auto max-w-full rounded-md border object-contain"
        />
      ) : null}
      <Input
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        disabled={disabled}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          // Permite selecionar novamente o mesmo arquivo após uma tentativa inválida.
          event.target.value = "";
          if (!chosen) return;
          const error = validateImageFile(chosen);
          if (error) {
            toast.error(error);
            return;
          }
          onFileChange(chosen);
        }}
        className="h-auto min-h-10 py-2"
      />
      <p className="text-xs text-muted-foreground">
        {helperText ?? "Escolha uma imagem do computador (JPG, PNG, WebP ou GIF, até 5 MB)."}
      </p>
      {(file || currentUrl) && onClear ? (
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onClear}>
          Remover imagem
        </Button>
      ) : null}
    </div>
  );
}
