"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  overlayClassName?: string;
  footer?: React.ReactNode;
  variant?: "default" | "dark";
  onCloseAutoFocus?: (event: Event) => void;
}

export function Modal({
  open,
  onClose,
  title,
  closeLabel = "Cerrar",
  children,
  className,
  bodyClassName,
  overlayClassName,
  footer,
  variant = "default",
  onCloseAutoFocus,
}: ModalProps) {
  const isDark = variant === "dark";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out",
            isDark ? "bg-black/85 backdrop-blur-sm" : "bg-black/50",
            overlayClassName
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[580px] max-h-[90vh] flex flex-col -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-xl",
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95",
            isDark ? "bg-slate-950 text-white border border-slate-800" : "bg-white",
            className
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between p-4 border-b shrink-0",
              isDark ? "border-slate-800" : "border-slate-200"
            )}
          >
            <DialogPrimitive.Title
              className={cn("text-lg font-semibold", isDark ? "text-white" : "text-brand-primary")}
            >
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "p-2 rounded-lg transition-colors h-8 w-8",
                  isDark
                    ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                    : "hover:bg-slate-100 text-slate-500"
                )}
                aria-label={closeLabel}
              >
                <X className={cn("h-5 w-5", isDark ? "text-slate-400" : "text-slate-500")} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className={cn("overflow-y-auto flex-1 min-h-0", bodyClassName)}>
            {children}
          </div>

          {/* Footer (opcional) */}
          {footer && (
            <div className={cn("shrink-0 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
