import dayjs from "dayjs";

export type PeriodKey = "today" | "yesterday" | "7d" | "month" | "lastMonth";

export type PeriodBounds = {
  key: PeriodKey;
  periodStart: string;
  periodEnd: string;
  label: string;
};

export function getPeriodBounds(key: PeriodKey): PeriodBounds {
  const today = dayjs();
  switch (key) {
    case "yesterday": {
      const d = today.subtract(1, "day");
      return {
        key,
        periodStart: d.format("YYYY-MM-DD"),
        periodEnd: d.format("YYYY-MM-DD"),
        label: "Hier",
      };
    }
    case "7d":
      return {
        key,
        periodStart: today.subtract(6, "day").format("YYYY-MM-DD"),
        periodEnd: today.format("YYYY-MM-DD"),
        label: "7 derniers jours",
      };
    case "lastMonth": {
      const start = today.subtract(1, "month").startOf("month");
      return {
        key,
        periodStart: start.format("YYYY-MM-DD"),
        periodEnd: start.endOf("month").format("YYYY-MM-DD"),
        label: "Mois dernier",
      };
    }
    case "month":
      return {
        key,
        periodStart: today.startOf("month").format("YYYY-MM-DD"),
        periodEnd: today.format("YYYY-MM-DD"),
        label: "Ce mois",
      };
    default:
      return {
        key: "today",
        periodStart: today.format("YYYY-MM-DD"),
        periodEnd: today.format("YYYY-MM-DD"),
        label: "Aujourd'hui",
      };
  }
}
