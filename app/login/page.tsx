"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy.current) return;

    busy.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          email,
          country
        })
      });

      const body: unknown = await response.json();

      if (
        typeof body !== "object" ||
        body === null ||
        Array.isArray(body)
      ) {
        throw new Error("Unexpected server response.");
      }

      const result = body as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Could not sign in."
        );
      }

      router.push("/ledger");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not sign in."
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to CirclePay AI
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Enter your details to access the demo ledger.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-slate-800"
            >
              Full name
            </label>

            <input
              id="fullName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="For example, Ada Johnson"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-800"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="For example, ada@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="country"
              className="block text-sm font-medium text-slate-800"
            >
              Country
            </label>

            <input
              id="country"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="For example, Nigeria"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}