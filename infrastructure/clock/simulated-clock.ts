import { Clock } from "@/ports/clock";

export class SimulatedClock implements Clock {
  private simulatedDate: Date | null = null;

  constructor(initialDate?: Date | string | number | null) {
    if (initialDate) {
      this.simulatedDate = new Date(initialDate);
    }
  }

  now(): Date {
    if (this.simulatedDate) {
      return new Date(this.simulatedDate.getTime());
    }
    return new Date();
  }

  setTime(dateInput: Date | string | number): void {
    this.simulatedDate = new Date(dateInput);
  }

  reset(): void {
    this.simulatedDate = null;
  }

  isSimulated(): boolean {
    return this.simulatedDate !== null;
  }

  getSimulatedDate(): Date | null {
    return this.simulatedDate ? new Date(this.simulatedDate.getTime()) : null;
  }
}
