"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PayPalReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(
    "Completing your PayPal Sandbox payment…"
  );
  const [error, setError] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    async function completePayment() {
      if (busy.current) return;

      const contributionId = searchParams.get("contributionId");
      const orderId = searchParams.get("token");

      if (!contributionId || !orderId) {
        setError("Missing PayPal payment information.");
        return;
      }

      busy.current = true;

      try {
        const response = await fetch(
          "/api/payments/capture-order",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contributionId,
              orderId
            })
          }
        );

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
              : "PayPal payment could not be completed."
          );
        }

        setMessage(
          "PayPal Sandbox payment completed. Returning to the ledger…"
        );

        setTimeout(() => {
          router.push("/ledger");
        }, 1500);
      } catch (caught: unknown) {
        setError(
          caught instanceof Error
            ? caught.message
            : "PayPal payment could not be completed."
        );
      }
    }

    void completePayment();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          PayPal Sandbox
        </h1>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <p role="status" className="mt-4 text-sm text-slate-700">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={() => router.push("/ledger")}
          className="mt-6 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white"
        >
          Return to ledger
        </button>
      </div>
    </main>
  );
}