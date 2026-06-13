/* ═══════════════════════════════════════════════════════════════
   AvatarUpload — Molecule
   Clickable avatar with hover overlay for uploading a new photo.
   Follows Atomic Design: combines Avatar atom + file input + overlay.
   ═══════════════════════════════════════════════════════════════ */

import { useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, type AvatarProps } from "@/atoms/Avatar";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export interface AvatarUploadProps {
  /** Current avatar URL */
  src?: string | null;
  /** Display name for fallback */
  name: string;
  /** Avatar size */
  size?: AvatarProps["size"];
  /** Called when a valid file is selected. Parent handles the API call. */
  onUpload: (file: File) => Promise<void>;
  /** Whether upload is disabled (e.g. insufficient permissions) */
  disabled?: boolean;
  /** Additional className for the root */
  className?: string;
}

export function AvatarUpload({
  src,
  name,
  size = "xl",
  onUpload,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }, [disabled, uploading]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be re-selected
      e.target.value = "";

      // Client-side validation
      if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
        // Let parent handle error display via try/catch or toast
        throw new Error(t("avatar.invalidType"));
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(t("avatar.tooLarge"));
      }

      // Show local preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploading(true);

      try {
        await onUpload(file);
      } finally {
        setUploading(false);
        // Cleanup preview — the parent should have updated `src` by now
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
      }
    },
    [onUpload, t],
  );

  const displaySrc = previewUrl ?? src;

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Clickable wrapper */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        aria-label={t("avatar.change")}
        className={cn(
          "group relative rounded-full focus-visible:outline-none",
          "focus-visible:ring-[3px] focus-visible:ring-primary/30",
          !disabled && !uploading && "cursor-pointer",
          (disabled || uploading) && "cursor-not-allowed opacity-70",
        )}
      >
        <Avatar
          src={displaySrc}
          name={name}
          size={size}
          className="rounded-full shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
        />

        {/* Hover overlay — camera icon */}
        {!disabled && !uploading && (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-full",
              "bg-black/0 transition-[background-color] duration-200 ease-out",
              "group-hover:bg-black/40",
            )}
          >
            <Camera
              size={size === "xl" ? 22 : 16}
              className={cn(
                "text-white opacity-0 transition-opacity duration-200",
                "group-hover:opacity-100",
              )}
            />
          </span>
        )}

        {/* Uploading spinner overlay */}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2
              size={size === "xl" ? 22 : 16}
              className="animate-spin text-white"
            />
          </span>
        )}
      </button>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          void handleFileChange(e);
        }}
        disabled={disabled || uploading}
        tabIndex={-1}
      />
    </div>
  );
}
