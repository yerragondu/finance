"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  Info, Calendar, PiggyBank, Zap, RefreshCw, Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Insight = {
  icon: string;
  title: string;
  detail: string;
  color: string;
};

type Props = {
  transactions: object[];
  accounts: object[];
  owings: object[];
  handLoans: object[];
  recurringBills: object[];
  department: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "alert": AlertCircle,
  "check": CheckCircle2,
  "info": Info,
  "calendar": Calendar,
  "piggy-bank": PiggyBank,
  "zap": Zap,
};

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  green:  { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0", iconBg: "#DCFCE7" },
  red:    { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", iconBg: "#FEE2E2" },
  amber:  { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", iconBg: "#FEF3C7" },
  blue:   { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", iconBg: "#DBEAFE" },
  violet: { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", iconBg: "#EDE9FE" },
  orange: { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA", iconBg: "#FFEDD5" },
};

export function AIInsightsPanel({ transactions, accounts, owings, handLoans, recurringBills, department }: Props) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions, accounts, owings, handLoans, recurringBills, department }),
    });

    const data = await res.json();
    setLoading(false);
    setHasLoaded(true);

    if (!res.ok || data.error) {
      setError(data.error || "Failed to generate insights");
      return;
    }
    setInsights(Array.isArray(data.insights) ? data.insights : []);
  }, [transactions, accounts, owings, handLoans, recurringBills, department]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-orange-100">
            <Sparkles className="h-3.5 w-3.5 text-orange-700" />
          </div>
          <h2 className="text-xs font-semibold text-orange-700 uppercase tracking-widest">AI Insights</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchInsights}
          disabled={loading}
          className="h-7 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-50"
        >
          {loading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <><RefreshCw className="h-3.5 w-3.5 mr-1" />{hasLoaded ? "Refresh" : "Generate"}</>
          }
        </Button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
          {error.includes("GOOGLE_AI_API_KEY")
            ? "Add your Gemini API key to .env to enable AI insights. (Free at aistudio.google.com)"
            : error
          }
        </div>
      )}

      {!hasLoaded && !loading && !error && (
        <div className="py-6 text-center space-y-2">
          <div className="p-3 rounded-full bg-orange-50 w-fit mx-auto">
            <Sparkles className="h-6 w-6 text-orange-500" />
          </div>
          <p className="text-sm text-[#9B9088]">AI can analyze your spending and give smart insights</p>
          <Button
            size="sm"
            onClick={fetchInsights}
            className="bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white border-0"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Insights
          </Button>
        </div>
      )}

      {loading && (
        <div className="py-6 flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
          <p className="text-xs text-[#9B9088]">Analyzing your finances…</p>
        </div>
      )}

      {insights && insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const IconComp = ICON_MAP[insight.icon] ?? Info;
            const colors = COLOR_MAP[insight.color] ?? COLOR_MAP.blue;
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl border"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <div className="p-1.5 rounded-lg shrink-0 mt-0.5" style={{ backgroundColor: colors.iconBg }}>
                  <IconComp className="h-3.5 w-3.5" style={{ color: colors.text }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: colors.text }}>{insight.title}</p>
                  <p className="text-[11px] text-[#6B6360] mt-0.5 leading-relaxed">{insight.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {insights && insights.length === 0 && !loading && (
        <p className="text-sm text-[#9B9088] text-center py-4">No insights yet — add more transactions!</p>
      )}
    </div>
  );
}
