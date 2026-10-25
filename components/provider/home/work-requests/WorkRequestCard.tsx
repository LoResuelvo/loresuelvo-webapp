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
    <li className="bg-white border border-slate-200 rounded-xl p-4 transition-colors hover:border-brand-secondary/40 sm:p-5">
      <article className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
            <User className="h-5 w-5" aria-hidden="true" />
          </div>
          <p data-field="client-name" className="min-w-0 flex-1 break-words text-sm font-semibold text-brand-primary">
            {request.clientName}
          </p>
          <span data-field="published-at" className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            {request.publishedAtLabel}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <h3
            data-field="problem-title"
            className="text-lg leading-snug font-semibold text-brand-primary"
          >
            {request.problemTitle}
          </h3>

          <p
            data-field="description"
            className="text-body leading-6 text-slate-600 line-clamp-3"
          >
            {request.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              data-field="location"
              className="flex items-center gap-1.5 text-sm text-slate-500 break-words"
            >
              <MapPin className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
              {request.location || t.providerHome.overview.missingLocation}
            </p>
            {request.images && request.images.length > 0 && (
              <span
                data-testid="images-indicator"
                className="flex items-center gap-1 text-caption font-bold text-brand-primary bg-brand-secondary/15 px-2.5 py-1 rounded-full uppercase tracking-wider"
              >
                <ImageIcon className="h-3.5 w-3.5 text-brand-primary" aria-hidden="true" />
                {request.images.length} {request.images.length === 1 ? "Imagen" : "Imágenes"}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <Button
            variant="brandSecondary"
            className="w-full sm:w-auto"
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
