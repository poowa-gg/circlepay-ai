import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  contributions,
  users
} from "@/db/schema";

type Context = {
  params: Promise<{ circleId: string }>;
};

export async function GET(
  _request: Request,
  { params }: Context
) {
  try {
    const { circleId } = await params;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(circleId)) {
      return NextResponse.json(
        { error: "A valid circle ID is required." },
        { status: 400 }
      );
    }

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

    const rows = await db
      .select({
        id: contributions.id,
        memberId: circleMembers.id,
        memberName: users.fullName,
        payoutPosition: circleMembers.payoutPosition,
        amount: contributions.amount,
        currency: contributions.currency,
        dueDate: contributions.dueDate,
        status: contributions.status,
        paidAt: contributions.paidAt
      })
      .from(contributions)
      .innerJoin(
        circleMembers,
        eq(contributions.memberId, circleMembers.id)
      )
      .innerJoin(
        users,
        eq(circleMembers.userId, users.id)
      )
      .where(eq(circleMembers.circleId, circleId))
      .orderBy(
        asc(contributions.dueDate),
        asc(circleMembers.payoutPosition),
        asc(contributions.id)
      );

    return NextResponse.json(
      {
        circle,
        contributions: rows
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    console.error("Ledger read failed");

    return NextResponse.json(
      { error: "Could not load the contribution ledger." },
      { status: 500 }
    );
  }
}