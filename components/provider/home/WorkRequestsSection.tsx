import { MapPin, MessageCircle, Search, Timer } from "lucide-react";
import { ProviderWorkRequest } from "@/lib/provider-home/types";
import { Button } from "@/components/ui/button";

interface WorkRequestsSectionProps {
  requests: ProviderWorkRequest[];
}

export default function WorkRequestsSection({ requests }: WorkRequestsSectionProps) {
  return (
    <section
      aria-labelledby="work-requests-title"
      className="max-w-4xl"
    >
      <div className="mb-5">
        <h1
          id="work-requests-title"
          className="text-[26px] font-bold text-brand-primary"
        >
          Solicitudes de Trabajo
        </h1>
      </div>

      <ul
        aria-label="Lista de solicitudes de trabajo"
        className="flex flex-col gap-4"
      >
        {requests.map((request) => (
          <li
            key={request.id}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          >
            <article className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
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
                  <p
                    data-field="published-at"
                    className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 whitespace-nowrap"
                  >
                    <Timer className="h-4 w-4" aria-hidden="true" />
                    {request.publishedAtLabel}
                  </p>
                </div>

                <p
                  data-field="summary"
                  className="text-[14px] leading-6 text-slate-600"
                >
                  {request.summary}
                </p>

                <p
                  data-field="location"
                  className="flex items-center gap-1.5 text-[14px] font-medium text-slate-600"
                >
                  <MapPin className="h-4 w-4 text-brand-secondary" aria-hidden="true" />
                  {request.location}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="button" className="rounded-lg">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Responder
                </Button>
                <Button type="button" variant="outline" className="rounded-lg">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Detalles
                </Button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
