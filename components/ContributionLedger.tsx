"use client";

import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type Contribution = {
  id: string;
  memberId: string;
  memberName: string;
  payoutPosition: number;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
  paidAt: string | null;
};

type LedgerResponse = {
  circle: {
    id: string;
    name: string;
    currency: string;
  };
  contributions: Contribution[];
};

type Props = {
  circleId: string;
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isContribution(value: unknown): value is Contribution {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.memberId === "string" &&
    typeof value.memberName === "string" &&
    typeof value.payoutPosition === "number" &&
    typeof value.amount === "string" &&
    typeof value.currency === "string" &&
    typeof value.dueDate === "string" &&
    typeof value.status === "string" &&
    (value.paidAt === null || typeof value.paidAt === "string")
  );
}

function isLedgerResponse(value: unknown): value is LedgerResponse {
  if (!isRecord(value) || !isRecord(value.circle)) {
    return false;
  }

  return (
    typeof value.circle.id === "string" &&
    typeof value.circle.name === "string" &&
    typeof value.circle.currency === "string" &&
    Array.isArray(value.contributions) &&
    value.contributions.every(isContribution)
  );
}

function formatMoney(amount: string, currency: string): string {
  const number = Number(amount);

  if (!Number.isFinite(number)) {
    return `${currency} ${amount}`;
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency
    }).format(number);
  } catch {
    return `${currency} ${amount}`;
  }
}

export default function ContributionLedger({ circleId }: Props) {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const columns = useMemo<ColDef<Contribution>[]>(
    () => [
      {
        field: "memberName",
        headerName: "Member",
        minWidth: 190,
        flex: 1
      },
      {
        field: "payoutPosition",
        headerName: "Payout turn",
        width: 135
      },
      {
        field: "amount",
        headerName: "Contribution",
        minWidth: 180,
        valueFormatter: (params) =>
          params.data
            ? formatMoney(params.data.amount, params.data.currency)
            : "",
        // Amounts arrive as decimal strings from PostgreSQL.
        comparator: (first: string, second: string) =>
          Number(first) - Number(second)
      },
      {
        field: "dueDate",
        headerName: "Due date",
        width: 150
      },
      {
        field: "status",
        headerName: "Payment status",
        width: 165,
        cellStyle: (params) => ({
          fontWeight: 600,
          color:
            params.value === "PAID"
              ? "#166534"
              : params.value === "LATE"
                ? "#b91c1c"
                : "#92400e"
        })
      },
      {
        field: "paidAt",
        headerName: "Payment recorded",
        minWidth: 210,
        valueFormatter: (params) => {
          if (!params.value) return "Not recorded";

          const date = new Date(params.value);

          return Number.isNaN(date.getTime())
            ? "Invalid date"
            : date.toISOString();
        }
      }
    ],
    []
  );

  const defaultColumn = useMemo<ColDef<Contribution>>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true
    }),
    []
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadLedger() {
      setLoading(true);
      setError("");
      setData(null);

      try {
        const response = await fetch(
          `/api/circles/${encodeURIComponent(circleId)}/ledger`,
          {
            cache: "no-store",
            signal: controller.signal
          }
        );

        const body: unknown = await response.json();

        if (!response.ok) {
          const message =
            isRecord(body) && typeof body.error === "string"
              ? body.error
              : "Could not load the ledger.";

          throw new Error(message);
        }

        if (!isLedgerResponse(body)) {
          throw new Error("The ledger returned an unexpected data format.");
        }

        if (!controller.signal.aborted) {
          setData(body);
        }
      } catch (caught: unknown) {
        if (controller.signal.aborted) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load the ledger."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadLedger();

    return () => controller.abort();
  }, [circleId, refreshKey]);

  const rows = data?.contributions ?? [];

  const paidCount = rows.filter(
    (row) => row.status === "PAID"
  ).length;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-700">
            CirclePay AI · Local prototype
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {data?.circle.name ?? "Contribution ledger"}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Contribution obligations and recorded payment status.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => setRefreshKey((current) => current + 1)}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh ledger"}
        </button>
      </header>

      {loading && (
        <p role="status" className="text-sm text-slate-600">
          Loading contribution records…
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
        >
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">Contribution records</p>
              <p className="mt-1 text-2xl font-bold">{rows.length}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">Marked paid</p>
              <p className="mt-1 text-2xl font-bold">{paidCount}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">Circle currency</p>
              <p className="mt-1 text-2xl font-bold">
                {data.circle.currency}
              </p>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            style={{ height: 440 }}
          >
            <AgGridReact<Contribution>
              theme={themeQuartz}
              rowData={rows}
              columnDefs={columns}
              defaultColDef={defaultColumn}
              getRowId={(params) => params.data.id}
              overlayNoRowsTemplate="No contribution records yet."
            />
          </div>

          <p className="text-xs text-slate-600">
            PENDING means an obligation exists. It does not mean payment
            has been collected. This page cannot approve or send payouts.
          </p>
        </>
      )}
    </section>
  );
}