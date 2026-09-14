import { isIdentityVerificationPending } from "@/domain/identity-verification/result";
import type { IdentityVerificationStatus } from "@/domain/identity-verification/types";

export const IDENTITY_STATUS_POLL_INTERVAL_MS = 2_000;
export const IDENTITY_STATUS_POLL_TIMEOUT_MS = 30_000;

export type IdentityVerificationStatusReadResult =
  | { success: true; data: { status: IdentityVerificationStatus } }
  | { success: false; error: string };

export interface IdentityVerificationStatusControllerState {
  status: IdentityVerificationStatus | null;
  isLoading: boolean;
  isRefreshing: boolean;
  timedOut: boolean;
  error: string | null;
}

interface TimerApi {
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancel: (timerId: ReturnType<typeof setTimeout>) => void;
}

interface IdentityVerificationStatusControllerOptions {
  readStatus: () => Promise<IdentityVerificationStatusReadResult>;
  onStateChange: (state: IdentityVerificationStatusControllerState) => void;
  initialStatus?: IdentityVerificationStatus | null;
  pollPending?: boolean;
  timerApi?: TimerApi;
}

const browserTimerApi: TimerApi = {
  now: () => Date.now(),
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (timerId) => clearTimeout(timerId),
};

function initialState(
  status: IdentityVerificationStatus | null,
): IdentityVerificationStatusControllerState {
  return {
    status,
    isLoading: false,
    isRefreshing: false,
    timedOut: false,
    error: null,
  };
}

export interface IdentityVerificationStatusController {
  start: () => void;
  refresh: () => void;
  dispose: () => void;
  getState: () => IdentityVerificationStatusControllerState;
}

class IdentityVerificationStatusControllerImpl
  implements IdentityVerificationStatusController
{
  private state: IdentityVerificationStatusControllerState;
  private disposed = false;
  private started = false;
  private requestInFlight = false;
  private cycleId = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly readStatus: IdentityVerificationStatusControllerOptions["readStatus"],
    private readonly onStateChange: IdentityVerificationStatusControllerOptions["onStateChange"],
    private readonly pollPending: boolean,
    private readonly timerApi: TimerApi,
    initialStatus: IdentityVerificationStatus | null,
  ) {
    this.state = initialState(initialStatus);
  }

  private emit(changes: Partial<IdentityVerificationStatusControllerState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...changes };
    this.onStateChange(this.state);
  }

  private clearPollTimer(): void {
    if (this.pollTimer === null) return;
    this.timerApi.cancel(this.pollTimer);
    this.pollTimer = null;
  }

  private schedulePoll(currentCycleId: number, deadline: number): void {
    const remainingMs = deadline - this.timerApi.now();
    if (remainingMs <= 0) {
      this.emit({ timedOut: true });
      return;
    }

    this.pollTimer = this.timerApi.schedule(() => {
      this.pollTimer = null;
      void this.readStatusForCycle(currentCycleId, deadline);
    }, Math.min(IDENTITY_STATUS_POLL_INTERVAL_MS, remainingMs));
  }

  private async readStatusForCycle(currentCycleId: number, deadline: number): Promise<void> {
    if (this.disposed || currentCycleId !== this.cycleId || this.requestInFlight) return;
    this.requestInFlight = true;

    try {
      const result = await this.readStatus();
      if (this.disposed || currentCycleId !== this.cycleId) return;

      if (!result.success) {
        this.clearPollTimer();
        this.emit({ error: result.error, isLoading: false, isRefreshing: false });
        return;
      }

      const nextStatus = result.data.status;
      this.emit({
        status: nextStatus,
        error: null,
        isLoading: false,
        isRefreshing: false,
        timedOut: false,
      });

      if (this.pollPending && isIdentityVerificationPending(nextStatus)) {
        this.schedulePoll(currentCycleId, deadline);
      } else {
        this.clearPollTimer();
      }
    } catch {
      if (this.disposed || currentCycleId !== this.cycleId) return;
      this.clearPollTimer();
      this.emit({
        error: "No pudimos consultar el estado de tu identidad.",
        isLoading: false,
        isRefreshing: false,
      });
    } finally {
      this.requestInFlight = false;
    }
  }

  private beginCycle(kind: "initial" | "refresh"): void {
    if (this.disposed || this.requestInFlight) return;
    this.cycleId += 1;
    this.clearPollTimer();
    this.emit({
      error: null,
      isLoading: kind === "initial",
      isRefreshing: kind === "refresh",
      timedOut: false,
    });
    void this.readStatusForCycle(
      this.cycleId,
      this.timerApi.now() + IDENTITY_STATUS_POLL_TIMEOUT_MS,
    );
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.beginCycle("initial");
  }

  refresh(): void {
    this.started = true;
    this.beginCycle("refresh");
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cycleId += 1;
    this.clearPollTimer();
  }

  getState(): IdentityVerificationStatusControllerState {
    return this.state;
  }
}

export function createIdentityVerificationStatusController(
  options: IdentityVerificationStatusControllerOptions,
): IdentityVerificationStatusController {
  return new IdentityVerificationStatusControllerImpl(
    options.readStatus,
    options.onStateChange,
    options.pollPending ?? false,
    options.timerApi ?? browserTimerApi,
    options.initialStatus ?? null,
  );
}
