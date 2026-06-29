"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface ImagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

export function ImagePreviewModal({
  open,
  onClose,
  imageUrl,
  altText,
}: ImagePreviewModalProps) {
  const lastUrl = React.useRef(imageUrl);
  const lastAlt = React.useRef(altText);

  if (open && imageUrl) {
    lastUrl.current = imageUrl;
    lastAlt.current = altText;
  }

  const displayUrl = open ? imageUrl : lastUrl.current;
  const displayAlt = open ? altText : lastAlt.current;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 p-4 outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 max-w-[100vw] max-h-[100vh] flex items-center justify-center pointer-events-none"
        >
          <DialogPrimitive.Title className="sr-only">
            {t.messaging.previewTitle}
          </DialogPrimitive.Title>
          <div className="relative inline-block pointer-events-auto">
            {displayUrl && (
              <img
                src={displayUrl}
                alt={displayAlt}
                className="max-w-[90vw] max-h-[85vh] rounded-md object-contain shadow-2xl"
              />
            )}
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-4 -right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-900 hover:text-white transition-colors h-10 w-10 border border-white/20 shadow-lg"
                aria-label={t.messaging.closePreview}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
