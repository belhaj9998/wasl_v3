"use client";

/**
 * Growth Chart Component
 * Displays a line chart showing stores and users growth over the last 12 months.
 * Uses recharts with dynamic import for code splitting.
 *
 * Requirements: 13.5
 */

import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { GrowthData } from "@/lib/api/services/platform.service";
import type { SupportedLocale } from "@/lib/i18n/config";

interface GrowthChartProps {
  data: GrowthData[];
  locale: SupportedLocale;
}

export function GrowthChart({ data, locale }: GrowthChartProps) {
  const t = useTranslations("platformDashboard");

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={t("growthChartDescription")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            reversed={locale === "ar"}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            orientation={locale === "ar" ? "right" : "left"}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "var(--radius)",
              direction: locale === "ar" ? "rtl" : "ltr",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Legend
            wrapperStyle={{
              direction: locale === "ar" ? "rtl" : "ltr",
            }}
          />
          <Line
            type="monotone"
            dataKey="stores"
            name={t("stores")}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="users"
            name={t("users")}
            stroke="hsl(142.1 76.2% 36.3%)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
