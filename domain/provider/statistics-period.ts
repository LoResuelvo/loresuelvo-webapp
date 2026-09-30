export type StatisticsGranularity = "day" | "week" | "month";
export interface StatisticsPeriod {
  readonly from: string;
  readonly to: string;
  readonly granularity: StatisticsGranularity;
  readonly timeZone: "America/Argentina/Buenos_Aires";
}
