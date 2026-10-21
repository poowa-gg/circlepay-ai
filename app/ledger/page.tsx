import ContributionLedger from "@/components/ContributionLedger";

export default function LedgerPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <ContributionLedger
          circleId="705e8d90-be6e-45ef-92fc-1e68a416d77e"
        />
      </div>
    </main>
  );
}