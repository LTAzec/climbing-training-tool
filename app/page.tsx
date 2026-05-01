"use client";

import { useEffect, useRef, useState, FormEvent } from "react";

type Level = "Beginner" | "Intermediate" | "Advanced";
type Days = "2" | "3" | "4";
type Goal = "Strength" | "Technique" | "Endurance" | "General improvement";

type SectionName = "Warm-up" | "Main" | "Extra" | "Recovery";
type DaySection = { name: SectionName; lines: string[] };
type ParsedDay = { number: string; focus: string; sections: DaySection[] };
type ParsedPlan = {
  days: ParsedDay[];
  generalTips: string[];
  disclaimer: string;
};

const SECTION_NAMES: SectionName[] = ["Warm-up", "Main", "Extra", "Recovery"];

function parsePlan(text: string): ParsedPlan {
  const lines = text.split(/\r?\n/);
  const days: ParsedDay[] = [];
  const generalTips: string[] = [];
  const disclaimerLines: string[] = [];

  let mode: "none" | "day" | "tips" | "disclaimer" = "none";
  let currentDay: ParsedDay | null = null;
  let currentSection: DaySection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // "Weekly Plan" intro — skip, the card has its own heading
    if (/^Weekly\s+Plan:?$/i.test(line)) continue;

    // Day header: "Day 1 - Focus: Strength" (or em/en dash)
    const dayMatch = line.match(/^Day\s+(\d+)\s*[-–—]\s*Focus:\s*(.*)$/i);
    if (dayMatch) {
      currentDay = {
        number: dayMatch[1],
        focus: dayMatch[2].trim(),
        sections: [],
      };
      currentSection = null;
      days.push(currentDay);
      mode = "day";
      continue;
    }

    if (/^General\s+tips:?$/i.test(line)) {
      mode = "tips";
      currentSection = null;
      continue;
    }

    if (/^Disclaimer:?$/i.test(line)) {
      mode = "disclaimer";
      currentSection = null;
      continue;
    }

    if (mode === "day" && currentDay) {
      const sectionMatch = line.match(
        /^(Warm-up|Main|Extra|Recovery):\s*(.*)$/i
      );
      if (sectionMatch) {
        const name = SECTION_NAMES.find(
          (n) => n.toLowerCase() === sectionMatch[1].toLowerCase()
        ) as SectionName;
        currentSection = { name, lines: [] };
        currentDay.sections.push(currentSection);
        const trailing = sectionMatch[2].trim().replace(/^-\s*/, "");
        if (trailing) currentSection.lines.push(trailing);
        continue;
      }
      if (currentSection) {
        currentSection.lines.push(line.replace(/^-\s*/, ""));
        continue;
      }
    }

    if (mode === "tips") {
      generalTips.push(line.replace(/^-\s*/, ""));
      continue;
    }

    if (mode === "disclaimer") {
      disclaimerLines.push(line);
      continue;
    }
  }

  return {
    days,
    generalTips,
    disclaimer: disclaimerLines.join(" ").trim(),
  };
}

export default function Home() {
  const [level, setLevel] = useState<Level>("Beginner");
  const [days, setDays] = useState<Days>("3");
  const [goal, setGoal] = useState<Goal>("General improvement");
  const [injuries, setInjuries] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          days: Number(days),
          goal,
          injuries: injuries.trim() || null,
        }),
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore JSON parse errors and fall back to status message
        }
        throw new Error(message);
      }

      const data = await res.json();
      const planText: string =
        typeof data?.plan === "string"
          ? data.plan
          : typeof data === "string"
          ? data
          : JSON.stringify(data, null, 2);

      setPlan(planText);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black font-sans">
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Climbing Training Plan Generator
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Get a personalized indoor climbing plan based on your level, schedule, and goals.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-sm space-y-5"
        >
          <div>
            <label
              htmlFor="level"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1.5"
            >
              Climbing level
            </label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="days"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1.5"
            >
              Training days per week
            </label>
            <select
              id="days"
              value={days}
              onChange={(e) => setDays(e.target.value as Days)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="2">2 days</option>
              <option value="3">3 days</option>
              <option value="4">4 days</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="goal"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1.5"
            >
              Goal
            </label>
            <select
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="Strength">Strength</option>
              <option value="Technique">Technique</option>
              <option value="Endurance">Endurance</option>
              <option value="General improvement">General improvement</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="injuries"
              className="block text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1.5"
            >
              Injuries or limitations{" "}
              <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id="injuries"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
              placeholder="e.g. recovering finger pulley, sore shoulder..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 font-medium transition-colors hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Generating plan...
              </>
            ) : (
              "Generate Plan"
            )}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200"
          >
            <p className="font-medium">Couldn&apos;t generate plan</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {plan && <PlanResult plan={plan} />}
      </main>
    </div>
  );
}

const SECTION_STYLES: Record<
  SectionName,
  { label: string; dot: string; chip: string }
> = {
  "Warm-up": {
    label: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    chip: "bg-amber-50 dark:bg-amber-950/40",
  },
  Main: {
    label: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  Extra: {
    label: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    chip: "bg-sky-50 dark:bg-sky-950/40",
  },
  Recovery: {
    label: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    chip: "bg-violet-50 dark:bg-violet-950/40",
  },
};

function PlanActions({ plan }: { plan: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function flash(message: string) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setFeedback(message);
    timerRef.current = window.setTimeout(() => {
      setFeedback(null);
      timerRef.current = null;
    }, 1800);
  }

  async function copyText(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(success);
    } catch {
      flash("Copy failed");
    }
  }

  async function handleCopy() {
    await copyText(plan, "Copied!");
  }

  function handleDownload() {
    try {
      const blob = new Blob([plan], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "climbing-training-plan.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash("Downloaded!");
    } catch {
      flash("Download failed");
    }
  }

  async function handleShare() {
    const url =
      typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: "Climbing Training Generator",
      text: "Generate your own AI climbing training plan.",
      url,
    };

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Silently ignore user-cancelled share; fall back on real failures.
        if ((err as DOMException)?.name !== "AbortError") {
          await copyText(url, "Link copied!");
        }
      }
    } else {
      await copyText(url, "Link copied!");
    }
  }

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={buttonClass}
        aria-label="Copy plan to clipboard"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy Plan
      </button>

      <button
        type="button"
        onClick={handleDownload}
        className={buttonClass}
        aria-label="Download plan as text file"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download Plan
      </button>

      <button
        type="button"
        onClick={handleShare}
        className={buttonClass}
        aria-label="Share this tool"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share Tool
      </button>

      <span
        role="status"
        aria-live="polite"
        className={`text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-opacity ${
          feedback ? "opacity-100" : "opacity-0"
        }`}
      >
        {feedback ?? ""}
      </span>
    </div>
  );
}

function PlanResult({ plan }: { plan: string }) {
  const parsed = parsePlan(plan);

  // Fallback to plain text if the model didn't follow the structured format.
  if (parsed.days.length === 0) {
    return (
      <section
        aria-label="Generated training plan"
        className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Your Training Plan
          </h2>
          <PlanActions plan={plan} />
        </div>
        <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-relaxed text-[15px]">
          {plan}
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Generated training plan" className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Your Training Plan
        </h2>
        <PlanActions plan={plan} />
      </div>

      {parsed.days.map((day) => (
        <article
          key={day.number}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
        >
          <header className="flex flex-wrap items-center gap-2 px-5 py-3 sm:px-6 bg-zinc-900 dark:bg-zinc-100">
            <span className="inline-flex items-center rounded-full bg-white/15 dark:bg-zinc-900/15 text-white dark:text-zinc-900 px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase">
              Day {day.number}
            </span>
            {day.focus && (
              <span className="text-white dark:text-zinc-900 text-sm sm:text-base font-medium">
                {day.focus}
              </span>
            )}
          </header>

          <div className="p-5 sm:p-6 space-y-4">
            {day.sections.map((section) => {
              const styles = SECTION_STYLES[section.name];
              return (
                <div key={section.name}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${styles.dot}`}
                    />
                    <h3
                      className={`text-xs font-semibold uppercase tracking-wider ${styles.label}`}
                    >
                      {section.name}
                    </h3>
                  </div>
                  {section.lines.length > 0 ? (
                    <ul className="space-y-1 pl-4 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {section.lines.map((line, i) => (
                        <li key={i} className="list-disc marker:text-zinc-400">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                      —
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      ))}

      {parsed.generalTips.length > 0 && (
        <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
            General tips
          </h3>
          <ul className="space-y-1 pl-4 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            {parsed.generalTips.map((tip, i) => (
              <li key={i} className="list-disc marker:text-zinc-400">
                {tip}
              </li>
            ))}
          </ul>
        </article>
      )}

      {parsed.disclaimer && (
        <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {parsed.disclaimer}
        </p>
      )}
    </section>
  );
}
