import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import CycleManager from "@/components/CycleManager";
import AITreasurer from "@/components/AITreasurer";
import ContributionLedger from "@/components/ContributionLedger";

export const instant = false;

const circleId = "705e8d90-be6e-45ef-92fc-1e68a416d77e";

export default async function LedgerPage() {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <CycleManager circleId={circleId} />
        <ContributionLedger circleId={circleId} />
        <AITreasurer circleId={circleId} />
      </div>
    </main>
  );
}