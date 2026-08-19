import { Clock } from "@/ports/clock";

export class FixedClock implements Clock {
  private readonly date: Date;

  constructor(dateInput: Date | string | number) {
    this.date = new Date(dateInput);
  }

  now(): Date {
    return new Date(this.date.getTime());
  }
}
