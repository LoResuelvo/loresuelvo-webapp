import { useState, useRef, useEffect } from "react";
import { Plus, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface AttachmentMenuProps {
  onAttachImages: () => void;
  onCreateProposal?: () => void;
  showProposalOption?: boolean;
  disabled?: boolean;
}

export function AttachmentMenu({
  onAttachImages,
  onCreateProposal,
  showProposalOption = false,
  disabled = false,
}: AttachmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={t.messaging.attachmentMenu.openMenu}
        className="text-slate-500 hover:text-brand-primary"
      >
        <Plus className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div
          className="absolute bottom-12 left-0 mt-2 w-56 rounded-xl md:rounded-2xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
          role="menu"
          aria-orientation="vertical"
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onAttachImages();
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg md:rounded-xl transition-all"
            role="menuitem"
          >
            <Image className="w-4 h-4 text-slate-500" />
            <span>{t.messaging.attachmentMenu.attachImages}</span>
          </button>
          {showProposalOption && onCreateProposal && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onCreateProposal();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg md:rounded-xl transition-all"
              role="menuitem"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>{t.messaging.attachmentMenu.createProposal}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
