"use client";

import { Provider } from "@/domain/provider/types";
import { WorkRequestModalHeader } from "./WorkRequestModalHeader";
import { WorkRequestForm } from "./WorkRequestForm";

interface WorkRequestModalProps {
  provider: Provider;
  onClose: () => void;
}

export default function WorkRequestModal({ provider, onClose }: WorkRequestModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <WorkRequestModalHeader onClose={onClose} />
        <WorkRequestForm provider={provider} />
      </div>
    </div>
  );
}
