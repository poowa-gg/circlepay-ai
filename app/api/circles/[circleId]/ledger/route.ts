import { getSessionUserId } from "@/lib/session";
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  contributions,
  cycles
} from "@/db/schema";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ circleId: string }> }
) {
  const { circleId } = await params;
    const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to view this ledger." },
      { status: 401 }
    );
  }

  if (!uuidPattern.test(circleId)) {
    return NextResponse.json(
      { error: "A valid circle ID is required." },
      { status: 400 }
    );
  }

  try {
    const [circle] = await db
      .select({
        id: circles.id,
        name: circles.name,
        currency: circles.currency
      })
      .from(circles)
      .where(eq(circles.id, circleId))
      .limit(1);

    if (!circle) {
      return NextResponse.json(
        { error: "Circle not found." },
        { status: 404 }
      );
    }

    const cycleRows = await db
      .select({
        id: cycles.id,
        cycleNumber: cycles.cycleNumber,
        dueDate: cycles.dueDate
      })
      .from(cycles)
      .where(eq(cycles.circleId, circleId))
      .orderBy(asc(cycles.cycleNumber));

    const contributionRows = await db
      .select({
        id: contributions.id,
        cycleId: contributions.cycleId,
        cycleNumber: cycles.cycleNumber,
        memberId: contributions.memberId,
        payoutPosition: circleMembers.payoutPosition,
        amount: contributions.amount,
        currency: contributions.currency,
        dueDate: contributions.dueDate,
        status: contributions.status
      })
      .from(contributions)
      .innerJoin(
        circleMembers,
        eq(contributions.memberId, circleMembers.id)
      )
      .leftJoin(
        cycles,
        eq(contributions.cycleId, cycles.id)
      )
      .where(eq(circleMembers.circleId, circleId))
      .orderBy(
        asc(contributions.dueDate),
        asc(contributions.id)
      );

    const pendingRecords = contributionRows.filter(
      (row) => row.status === "PENDING"
    ).length;

    const paidRecords = contributionRows.filter(
      (row) => row.status === "PAID"
    ).length;

    return NextResponse.json(
      {
        circle,
        cycles: cycleRows,
        contributions: contributionRows,
        summary: {
          contributionRecords: contributionRows.length,
          pendingRecords,
          paidRecords
        }
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error: unknown) {
    console.error("Ledger request failed:", error);

    return NextResponse.json(
      { error: "Could not load the contribution ledger." },
      { status: 500 }
    );
  }
}