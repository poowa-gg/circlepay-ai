"use client";

import { useRef, useState, type FormEvent } from "react";

type Props = {
  circleId: string;
};

export default function AITreasurer({ circleId }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const busy = useRef(false);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy.current) return;

    const cleanQuestion = question.trim();

    if (!cleanQuestion || cleanQuestion.length > 1000) {
      setError("Please type a question with 1 to 1000 characters.");
      return;
    }

    busy.current = true;
    setLoading(true);
    setAnswer("");
    setError("");

    try {
      const response = await fetch("/api/ai/treasurer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          circleId,
          question: cleanQuestion
        })
      });

      const body: unknown = await response.json();

      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
      ) {
        throw new Error("The server sent an unexpected response.");
      }

      const result = body as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Could not contact the AI Treasurer."
        );
      }

      if (typeof result.answer !== "string") {
        throw new Error("The AI did not return an answer.");
      }

      setAnswer(result.answer);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "AI Treasurer is unavailable."
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-900">
        AI Treasurer
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Ask questions about the current ledger. This helper is read-only and
        cannot move money.
      </p>

      <form onSubmit={ask} className="mt-4 space-y-3">
        <label
          htmlFor="question"
          className="block text-sm font-medium text-slate-800"
        >
          Your question
        </label>

        <textarea
          id="question"
          rows={3}
          maxLength={1000}
          required
          value={question}
          disabled={loading}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="How many contribution records are pending?"
          className="w-full rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask Treasurer"}
        </button>
      </form>

      {loading && (
        <p role="status" className="mt-4 text-sm text-slate-600">
          Checking the ledger…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {answer && (
        <div
          role="status"
          className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800"
        >
          {answer}
        </div>
      )}
    </section>
  );
}