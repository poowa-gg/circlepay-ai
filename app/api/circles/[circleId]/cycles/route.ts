import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  circles,
  circleMembers,
  cycles,
  contributions
} from "@/db/schema";

type Context = {
  params: Promise<{ circleId: string }>;
};

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export async function POST(
  request: Request,
  { params }: Context
) {
  try {
    const { circleId } = await params;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(circleId)) {
      throw new ApiError(400, "A valid circle ID is required.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Send a valid JSON body.");
    }

    if (!isObject(body)) {
      throw new ApiError(400, "JSON body must be an object.");
    }

    const { cycleNumber, dueDate } = body;

    if (
      typeof cycleNumber !== "number" ||
      !Number.isInteger(cycleNumber) ||
      cycleNumber < 1 ||
      cycleNumber > 2147483647
    ) {
      throw new ApiError(
        400,
        "Cycle number must be a positive whole number."
      );
    }

    if (!isValidDate(dueDate)) {
      throw new ApiError(
        400,
        "Due date must be a real date in YYYY-MM-DD format."
      );
    }

    const result = await db.transaction(async (tx) => {
      // Serialize cycle generation for this circle.
      const [circle] = await tx
        .select({
          id: circles.id,
          amount: circles.contributionAmount,
          currency: circles.currency
        })
        .from(circles)
        .where(eq(circles.id, circleId))
        .for("update");

      if (!circle) {
        throw new ApiError(404, "Circle not found.");
      }

      const [existingCycle] = await tx
        .select()
        .from(cycles)
        .where(
          and(
            eq(cycles.circleId, circleId),
            eq(cycles.cycleNumber, cycleNumber)
          )
        )
        .limit(1);

      if (existingCycle) {
        if (existingCycle.dueDate !== dueDate) {
          throw new ApiError(
            409,
            "This cycle already exists with a different due date."
          );
        }

        const existingContributions = await tx
          .select()
          .from(contributions)
          .where(eq(contributions.cycleId, existingCycle.id));

        return {
          created: false,
          cycle: existingCycle,
          contributions: existingContributions
        };
      }

      if (
        !/^\d+(\.\d{1,2})?$/.test(circle.amount) ||
        Number(circle.amount) <= 0
      ) {
        throw new ApiError(
          409,
          "The circle must have a positive contribution amount."
        );
      }

      const members = await tx
        .select({ id: circleMembers.id })
        .from(circleMembers)
        .where(
          and(
            eq(circleMembers.circleId, circleId),
            eq(circleMembers.status, "active")
          )
        );

      if (members.length === 0) {
        throw new ApiError(
          409,
          "Add an active member before creating a cycle."
        );
      }

      const [cycle] = await tx
        .insert(cycles)
        .values({
          circleId,
          cycleNumber,
          dueDate
        })
        .returning();

      const generatedContributions = await tx
        .insert(contributions)
        .values(
          members.map((member) => ({
            circleId,
            cycleId: cycle.id,
            memberId: member.id,
            amount: circle.amount,
            currency: circle.currency,
            dueDate,
            status: "PENDING"
          }))
        )
        .returning();

      return {
        created: true,
        cycle,
        contributions: generatedContributions
      };
    });

    return NextResponse.json(result, {
      status: result.created ? 201 : 200
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(
      "Cycle generation failed; inspect the database schema and connection."
    );

    return NextResponse.json(
      { error: "Could not generate cycle contributions." },
      { status: 500 }
    );
  }
}