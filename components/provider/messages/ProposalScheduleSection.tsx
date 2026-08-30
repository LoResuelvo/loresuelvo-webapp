import { CalendarIcon, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { t } from "@/infrastructure/i18n/translations";
import { DURATION_PRESETS, TIME_SLOTS } from "./useServiceProposalForm";

export interface ProposalScheduleState {
  scheduledDate: string;
  scheduledTime: string;
  selectedDurationPreset: string;
  estimatedDurationMinutes: string;
}

export interface ProposalScheduleHandlers {
  onChangeDate: (date: string) => void;
  onChangeTime: (time: string) => void;
  onChangeDurationPreset: (preset: string) => void;
  onChangeCustomDuration: (minutes: string) => void;
}

export interface ProposalScheduleErrors {
  dateError?: string;
  durationError?: string;
}

export interface ProposalScheduleSectionProps {
  schedule: ProposalScheduleState;
  onChange: ProposalScheduleHandlers;
  errors?: ProposalScheduleErrors;
  disabled?: boolean;
}

export function ProposalScheduleSection({
  schedule,
  onChange,
  errors,
  disabled = false,
}: ProposalScheduleSectionProps) {
  const {
    scheduledDate,
    scheduledTime,
    selectedDurationPreset,
    estimatedDurationMinutes,
  } = schedule;

  const {
    onChangeDate,
    onChangeTime,
    onChangeDurationPreset,
    onChangeCustomDuration,
  } = onChange;

  const dateError = errors?.dateError;
  const durationError = errors?.durationError;
  return (
    <>
      {/* Scheduled Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduledDate">{t.messaging.serviceProposal.dateLabel}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-transparent border-input cursor-pointer",
                  !scheduledDate && "text-muted-foreground",
                  dateError && "border-red-500 focus-visible:ring-red-500"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {scheduledDate ? format(parseISO(scheduledDate), "dd/MM/yyyy") : <span>{t.messaging.serviceProposal.datePlaceholder || "Seleccionar"}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduledDate ? parseISO(scheduledDate) : undefined}
                onSelect={(d) => {
                  if (d) onChangeDate(format(d, "yyyy-MM-dd"));
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduledTime">{t.messaging.serviceProposal.timeLabel}</Label>
          <Select
            value={scheduledTime}
            onValueChange={onChangeTime}
            disabled={disabled}
          >
            <SelectTrigger id="scheduledTime" className={dateError ? "border-red-500 focus:ring-red-500" : ""}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <SelectValue placeholder="Seleccionar" />
              </div>
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-[160px]">
              {TIME_SLOTS.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {dateError && (
        <p className="text-sm text-red-500 font-medium animate-in fade-in duration-200">
          {dateError}
        </p>
      )}

      {/* Estimated Duration */}
      <div className="space-y-2">
        <Label htmlFor="estimatedDurationMinutes">{t.messaging.serviceProposal.durationLabel}</Label>
        <Select
          value={selectedDurationPreset}
          onValueChange={onChangeDurationPreset}
          disabled={disabled}
        >
          <SelectTrigger
            id="estimatedDurationMinutes"
            className={durationError ? " border-red-500 focus:ring-red-500" : ""}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <SelectValue placeholder={t.messaging.serviceProposal.durationPlaceholder} />
            </div>
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[220px]">
            {DURATION_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDurationPreset === "custom" && (
          <div className="space-y-1 animate-in fade-in duration-200">
            <Input
              id="customEstimatedDurationMinutes"
              type="number"
              min={15}
              max={1440}
              step="1"
              placeholder={t.messaging.serviceProposal.durationCustomPlaceholder}
              value={estimatedDurationMinutes}
              onChange={(e) => onChangeCustomDuration(e.target.value)}
              className={durationError ? "border-red-500 focus-visible:ring-red-500" : ""}
              disabled={disabled}
              autoFocus
            />
          </div>
        )}

        {durationError && (
          <p className="text-sm text-red-500 font-medium animate-in fade-in duration-200">
            {durationError}
          </p>
        )}
      </div>
    </>
  );
}
