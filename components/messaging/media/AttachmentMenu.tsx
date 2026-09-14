import { useState, useRef, useEffect } from "react";
import { Plus, Image as ImageIcon, FileText, Music, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/infrastructure/i18n/translations";

interface AttachmentMenuProps {
  onAttachImages: () => void;
  onAttachAudio?: () => void;
  onAttachVideo?: () => void;
  onCreateProposal?: () => void;
  showProposalOption?: boolean;
  disabled?: boolean;
  audioDisabled?: boolean;
  videoDisabled?: boolean;
}

interface AttachmentMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function AttachmentMenuItem({
  icon,
  label,
  onClick,
  disabled = false,
}: AttachmentMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg md:rounded-xl transition-all cursor-pointer"
      role="menuitem"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface AttachmentDropdownProps extends AttachmentMenuProps {
  onSelect: (action?: () => void) => void;
}

function AttachmentDropdown({
  onAttachImages,
  onAttachAudio,
  onAttachVideo,
  onCreateProposal,
  showProposalOption,
  audioDisabled,
  videoDisabled,
  onSelect,
}: AttachmentDropdownProps) {
  return (
    <div
      className="absolute bottom-12 left-0 mt-2 w-56 rounded-xl md:rounded-2xl border border-slate-300 bg-white p-2 shadow-md ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="menu"
      aria-orientation="vertical"
    >
      <AttachmentMenuItem
        icon={<ImageIcon className="w-4 h-4 text-slate-500" />}
        label={t.messaging.attachmentMenu.attachImages}
        onClick={() => onSelect(onAttachImages)}
      />
      {onAttachAudio && (
        <AttachmentMenuItem
          icon={<Music className="w-4 h-4 text-slate-500" />}
          label={t.messaging.attachmentMenu.attachAudio}
          onClick={() => onSelect(onAttachAudio)}
          disabled={audioDisabled}
        />
      )}
      {onAttachVideo && (
        <AttachmentMenuItem
          icon={<VideoIcon className="w-4 h-4 text-slate-500" />}
          label={t.messaging.attachmentMenu.attachVideo}
          onClick={() => onSelect(onAttachVideo)}
          disabled={videoDisabled}
        />
      )}
      {showProposalOption && onCreateProposal && (
        <AttachmentMenuItem
          icon={<FileText className="w-4 h-4 text-slate-500" />}
          label={t.messaging.attachmentMenu.createProposal}
          onClick={() => onSelect(onCreateProposal)}
        />
      )}
    </div>
  );
}

export function AttachmentMenu(props: AttachmentMenuProps) {
  const { disabled = false } = props;
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

  const handleSelect = (action?: () => void) => {
    if (!action) return;
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-label={t.messaging.attachmentMenu.openMenu}
        className="text-slate-500 hover:text-brand-primary cursor-pointer"
      >
        <Plus className="w-5 h-5" />
      </Button>

      {isOpen && <AttachmentDropdown {...props} onSelect={handleSelect} />}
    </div>
  );
}
