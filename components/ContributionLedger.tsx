"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PayPalSandboxPayment from "@/components/PayPalSandboxPayment";

type Cycle = {
  id: string;
  cycleNumber: number;
  dueDate: string;
};

type Contribution = {
  id: string;
  cycleId: string | null;
  cycleNumber: number | null;
  memberId: string;
  payoutPosition: number | null;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
};

type LedgerResponse = {
  circle: {
    id: string;
    name: string;
    currency: string;
  };
  cycles: Cycle[];
  contributions: Contribution[];
  summary: {
    contributionRecords: number;
    pendingRecords: number;
    paidRecords: number;
  };
};

type Props = {
  circleId: string;
};

export default function ContributionLedger({ circleId }: Props) {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("all");

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/circles/${encodeURIComponent(circleId)}/ledger`,
        {
          cache: "no-store"
        }
      );

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
            : "Could not load the ledger."
        );
      }

      setData(result as unknown as LedgerResponse);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load the ledger."
      );
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const visibleContributions = useMemo(() => {
    if (!data) return [];

    if (selectedCycleId === "all") {
      return data.contributions;
    }

    return data.contributions.filter(
      (row) => row.cycleId === selectedCycleId
    );
  }, [data, selectedCycleId]);

  const selectedCycle = useMemo(() => {
    if (!data || selectedCycleId === "all") return null;

    return data.cycles.find(
      (cycle) => cycle.id === selectedCycleId
    );
  }, [data, selectedCycleId]);

  if (loading && !data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p role="status" className="text-sm text-slate-600">
          Loading contribution ledger…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">
          Ledger unavailable
        </h2>

        <p role="alert" className="mt-2 text-sm text-red-800">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadLedger()}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {data.circle.name}
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            Contribution ledger · {data.circle.currency}
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label
            htmlFor="cycle-filter"
            className="block text-sm font-medium text-slate-800"
          >
            Cycle
          </label>

          <select
            id="cycle-filter"
            value={selectedCycleId}
            onChange={(event) =>
              setSelectedCycleId(event.target.value)
            }
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All cycles</option>

            {data.cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                Cycle {cycle.cycleNumber} · due{" "}
                {new Date(cycle.dueDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-600">
            Contribution records
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {selectedCycleId === "all"
              ? data.summary.contributionRecords
              : visibleContributions.length}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-800">
            Pending records
          </p>

          <p className="mt-1 text-2xl font-bold text-amber-900">
            {selectedCycleId === "all"
              ? data.summary.pendingRecords
              : visibleContributions.filter(
                  (row) => row.status === "PENDING"
                ).length}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-xs font-medium text-green-800">
            Paid records
          </p>

          <p className="mt-1 text-2xl font-bold text-green-900">
            {selectedCycleId === "all"
              ? data.summary.paidRecords
              : visibleContributions.filter(
                  (row) => row.status === "PAID"
                ).length}
          </p>
        </div>
      </div>

      {selectedCycle ? (
        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          Showing Cycle {selectedCycle.cycleNumber}, due{" "}
          {new Date(selectedCycle.dueDate).toLocaleDateString()}.
        </p>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          Showing all cycles. These totals count contribution records, not
          unique members or one payout pot.
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Cycle
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Member
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Amount
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Due date
              </th>

              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {visibleContributions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-600"
                >
                  No contribution records for this selection.
                </td>
              </tr>
            ) : (
              visibleContributions.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-800">
                    {row.cycleNumber ?? "Legacy"}
                  </td>

                  <td className="px-4 py-3 text-slate-800">
                    Member {row.payoutPosition ?? "—"}
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.amount} {row.currency}
                  </td>

                  <td className="px-4 py-3 text-slate-700">
                    {new Date(row.dueDate).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        row.status === "PAID"
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800"
                          : "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800"
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => void loadLedger()}
        className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        Refresh ledger
      </button>

      <div className="mt-8">
        <PayPalSandboxPayment
          contributions={visibleContributions}
          onPaid={() => void loadLedger()}
        />
      </div>
    </section>
  );
}