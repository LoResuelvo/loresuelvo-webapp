"use client";

import { ProviderWorkRequest } from "@/domain/provider/types";
import { Button } from "@/components/ui/button";
import { MapPin, Timer, User, Image as ImageIcon } from "lucide-react";
import { t } from "@/infrastructure/i18n/translations";

interface WorkRequestCardProps {
  request: ProviderWorkRequest;
  onViewDetails: () => void;
}

export default function WorkRequestCard({ request, onViewDetails }: WorkRequestCardProps) {
  return (
    <li className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <article className="flex items-center gap-4 relative">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-neutral text-brand-secondary shrink-0">
          <User className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-3 flex-1 pr-[140px]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p
                data-field="client-name"
                className="text-[14px] font-semibold text-brand-secondary"
              >
                {request.clientName}
              </p>
              <h2
                data-field="problem-title"
                className="mt-1 text-[18px] font-bold text-brand-primary"
              >
                {request.problemTitle}
              </h2>
            </div>
          </div>

          <p
            data-field="description"
            className="text-[14px] leading-6 text-slate-600"
          >
            {request.description}
          </p>

          <div className="flex items-center justify-between">
            <p
              data-field="location"
              className="flex items-center gap-1.5 text-[14px] font-medium text-slate-600"
            >
              <MapPin className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
              {request.location}
            </p>
            {request.images && request.images.length > 0 && (
              <span
                data-testid="images-indicator"
                className="flex items-center gap-1 text-[11px] font-bold text-brand-primary bg-brand-secondary/15 px-2.5 py-1 rounded-full uppercase tracking-wider"
              >
                <ImageIcon className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
                {request.images.length} {request.images.length === 1 ? "Imagen" : "Imágenes"}
              </span>
            )}
          </div>
        </div>

        <div data-field="published-at" className="absolute right-4 top-4 flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
          <Timer className="h-4 w-4" aria-hidden="true" />
          {request.publishedAtLabel}
        </div>

        <div className="flex items-center justify-center min-w-[120px]">
          <Button
            variant="brandSecondary"
            type="button"
            onClick={onViewDetails}
          >
            {t.providerHome.workRequestsSection.viewDetails}
          </Button>
        </div>
      </article>
    </li>
  );
}
