"use client";

import { useRef, useState } from "react";


type Contribution = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  cycleNumber: number | null;
  payoutPosition: number | null;
};

type Props = {
  contributions: Contribution[];
  onPaid: () => void;
};

export default function PayPalSandboxPayment({
  contributions,
  onPaid
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  const pendingContributions = contributions.filter(
    (row) => row.status === "PENDING"
  );

  async function pay() {
    if (busy.current || !selectedId) return;

    busy.current = true;
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const createResponse = await fetch(
        "/api/payments/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contributionId: selectedId
          })
        }
      );

      const createBody: unknown = await createResponse.json();

      if (
        typeof createBody !== "object" ||
        createBody === null ||
        Array.isArray(createBody)
      ) {
        throw new Error("Unexpected server response.");
      }

      const createResult = createBody as Record<string, unknown>;

      if (!createResponse.ok) {
        throw new Error(
          typeof createResult.error === "string"
            ? createResult.error
            : "Could not create PayPal order."
        );
      }

      if (typeof createResult.orderId !== "string") {
        throw new Error("PayPal order ID was missing.");
      }

      const captureResponse = await fetch(
        "/api/payments/capture-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contributionId: selectedId,
            orderId: createResult.orderId
          })
        }
      );

      const captureBody: unknown = await captureResponse.json();

      if (
        typeof captureBody !== "object" ||
        captureBody === null ||
        Array.isArray(captureBody)
      ) {
        throw new Error("Unexpected server response.");
      }

      const captureResult = captureBody as Record<string, unknown>;

      if (!captureResponse.ok) {
        throw new Error(
          typeof captureResult.error === "string"
            ? captureResult.error
            : "Could not complete PayPal payment."
        );
      }

      setMessage(
        "PayPal Sandbox payment completed. The contribution is now marked PAID."
      );

      onPaid();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Payment could not be completed."
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-slate-900">
        PayPal Sandbox payment
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Pay one pending contribution in PayPal Sandbox. No real money moves.
      </p>

      {pendingContributions.length === 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          No pending contributions are available for Sandbox payment.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="contribution"
              className="block text-sm font-medium text-slate-800"
            >
              Choose a pending contribution
            </label>

            <select
              id="contribution"
              value={selectedId}
              onChange={(event) =>
                setSelectedId(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select an obligation</option>

              {pendingContributions.map((row) => (
                <option key={row.id} value={row.id}>
                  Cycle {row.cycleNumber ?? "Legacy"} · Member{" "}
                  {row.payoutPosition ?? "—"} · {row.amount}{" "}
                  {row.currency}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void pay()}
            disabled={loading || !selectedId}
            className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {loading
              ? "Processing Sandbox payment…"
              : "Pay with PayPal Sandbox"}
          </button>
        </div>
      )}

      {loading && (
        <p role="status" className="mt-4 text-sm text-slate-600">
          Creating and capturing the PayPal Sandbox order…
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
    </section>
  );
}