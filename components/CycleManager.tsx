"use client";

import { useRef, useState, type FormEvent } from "react";
import ContributionLedger from "@/components/ContributionLedger";

type Props = {
  circleId: string;
};

type Feedback = {
  type: "success" | "error";
  text: string;
} | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export default function CycleManager({ circleId }: Props) {
  const [cycleNumber, setCycleNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [ledgerVersion, setLedgerVersion] = useState(0);

  const busy = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy.current) return;

    setFeedback(null);

    const number = Number(cycleNumber);

    if (!/^[1-9]\d*$/.test(cycleNumber) || number > 2147483647) {
      setFeedback({
        type: "error",
        text: "Enter a positive whole number, such as 2."
      });
      return;
    }

    if (!isValidDate(dueDate)) {
      setFeedback({
        type: "error",
        text: "Choose a valid due date."
      });
      return;
    }

    busy.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        `/api/circles/${encodeURIComponent(circleId)}/cycles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cycleNumber: number,
            dueDate
          })
        }
      );

      let body: unknown;

      try {
        body = await response.json();
      } catch {
        throw new Error("The server sent an unreadable response.");
      }

      if (!response.ok) {
        const message =
          isRecord(body) && typeof body.error === "string"
            ? body.error
            : `The request failed with status ${response.status}.`;

        throw new Error(message);
      }

      if (
        !isRecord(body) ||
        typeof body.created !== "boolean" ||
        !isRecord(body.cycle) ||
        !Array.isArray(body.contributions)
      ) {
        throw new Error("The server sent an unexpected response.");
      }

      const count = body.contributions.length;

      setFeedback({
        type: "success",
        text: body.created
          ? `Cycle ${number} was created with ${count} contribution record(s).`
          : `Cycle ${number} already exists. ${count} existing record(s) were returned. No duplicates were created.`
      });

      setLedgerVersion((old) => old + 1);
    } catch (error: unknown) {
      setFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."
      });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Generate a contribution cycle
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        This creates one pending contribution record for each active member.
        It does not collect money or send payouts.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <fieldset disabled={loading} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cycle-number"
                className="block text-sm font-medium text-slate-800"
              >
                Cycle number
              </label>

              <input
                id="cycle-number"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                required
                value={cycleNumber}
                onChange={(event) => setCycleNumber(event.target.value)}
                placeholder="For example, 2"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="due-date"
                className="block text-sm font-medium text-slate-800"
              >
                Due date
              </label>

              <input
                id="due-date"
                type="date"
                required
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? "Working…" : "Generate contributions"}
          </button>
        </fieldset>

        {loading && (
          <p role="status" className="text-sm text-slate-600">
            Please wait. Do not press the button again.
          </p>
        )}

        {feedback && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            className={
              feedback.type === "error"
                ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                : "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            }
          >
            {feedback.text}
          </div>
        )}
      </form>
    </section>
  );
}