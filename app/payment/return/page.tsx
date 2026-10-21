import { Suspense } from "react";
import PayPalReturnClient from "./PayPalReturnClient";

export default function PayPalReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              PayPal Sandbox
            </h1>

            <p role="status" className="mt-4 text-sm text-slate-700">
              Loading payment result…
            </p>
          </div>
        </main>
      }
    >
      <PayPalReturnClient />
    </Suspense>
  );
}