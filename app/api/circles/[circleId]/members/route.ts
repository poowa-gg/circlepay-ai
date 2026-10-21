import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { circles, circleMembers, users } from "@/db/schema";



const ROUTE_VERSION = "members-v2";

type Context = {
  params: Promise<{ circleId: string }>;
};

class RouteError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "RouteError";
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return email;
}

function databaseErrorDetails(error: unknown): {
  code?: string;
  constraint?: string;
} {
  let current: unknown = error;

  for (let depth = 0; depth < 6; depth += 1) {
    if (!isRecord(current)) break;

    if (typeof current.code === "string") {
      return {
        code: current.code,
        constraint:
          typeof current.constraint === "string"
            ? current.constraint
            : undefined
      };
    }

    current = current.cause;
  }

  return {};
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "X-CirclePay-Route": ROUTE_VERSION
    }
  });
}

export async function POST(
  request: Request,
  { params }: Context
) {
  const startedAt = Date.now();

  try {
    const { circleId } = await params;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(circleId)) {
      throw new RouteError(400, "Circle ID must be a valid UUID.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      throw new RouteError(400, "Send a valid JSON body.");
    }

    if (!isRecord(body)) {
      throw new RouteError(400, "JSON body must be an object.");
    }

    const email = normalizeEmail(body.email);

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const country =
      typeof body.country === "string"
        ? body.country.trim()
        : "Nigeria";

    const payoutPosition = body.payoutPosition;

    if (!email) {
      throw new RouteError(400, "A valid email address is required.");
    }

    if (!fullName || fullName.length > 200) {
      throw new RouteError(
        400,
        "Full name must contain 1 to 200 characters."
      );
    }

    if (!country || country.length > 100) {
      throw new RouteError(
        400,
        "Country must contain 1 to 100 characters."
      );
    }

    if (
      typeof payoutPosition !== "number" ||
      !Number.isInteger(payoutPosition) ||
      payoutPosition < 1 ||
      payoutPosition > 2147483647
    ) {
      throw new RouteError(
        400,
        "Payout position must be a positive whole number."
      );
    }

    let paypalEmail: string | null = null;

    if (
      body.paypalEmail !== undefined &&
      body.paypalEmail !== null &&
      body.paypalEmail !== ""
    ) {
      paypalEmail = normalizeEmail(body.paypalEmail);

      if (!paypalEmail) {
        throw new RouteError(
          400,
          "PayPal email must be a valid email address."
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      const [circle] = await tx
        .select({ id: circles.id })
        .from(circles)
        .where(eq(circles.id, circleId))
        .limit(1);

      if (!circle) {
        throw new RouteError(404, "Circle not found.");
      }

      // Reuse an existing account.
      let [user] = await tx
        .select({
          id: users.id,
          email: users.email
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        // If another request creates the email first,
        // do not insert a duplicate or overwrite its profile.
        const [createdUser] = await tx
          .insert(users)
          .values({
            email,
            fullName,
            country,
            paypalEmail
          })
          .onConflictDoNothing({
            target: users.email
          })
          .returning({
            id: users.id,
            email: users.email
          });

        if (createdUser) {
          user = createdUser;
        } else {
          [user] = await tx
            .select({
              id: users.id,
              email: users.email
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
        }
      }

      if (!user) {
        throw new RouteError(
          409,
          "The user changed during this request. Please retry."
        );
      }

      const [existingMember] = await tx
        .select({ id: circleMembers.id })
        .from(circleMembers)
        .where(
          and(
            eq(circleMembers.circleId, circleId),
            eq(circleMembers.userId, user.id)
          )
        )
        .limit(1);

      if (existingMember) {
        throw new RouteError(
          409,
          "This user is already a member of this circle."
        );
      }

      const [member] = await tx
        .insert(circleMembers)
        .values({
          circleId,
          userId: user.id,
          payoutPosition
        })
        .onConflictDoNothing({
          target: [
            circleMembers.circleId,
            circleMembers.userId
          ]
        })
        .returning();

      if (!member) {
        throw new RouteError(
          409,
          "This user is already a member of this circle."
        );
      }

      return { member, user };
    });

    return jsonResponse(result, 201);
  } catch (error: unknown) {
    if (error instanceof RouteError) {
      return jsonResponse(
        { error: error.message },
        error.status
      );
    }

    const details = databaseErrorDetails(error);

    console.error("Member API failed", {
      routeVersion: ROUTE_VERSION,
      code: details.code,
      constraint: details.constraint
    });

    if (details.code === "23505") {
      return jsonResponse(
        {
          error:
            "A record with these unique details already exists. Refresh and retry.",
          code: "UNIQUE_CONFLICT"
        },
        409
      );
    }

    if (details.code === "23503") {
      return jsonResponse(
        {
          error:
            "The circle or user no longer exists. Refresh and retry."
        },
        409
      );
    }

    return jsonResponse(
      {
        error:
          "Could not add member. Check the server log for the database error code."
      },
      500
    );
  } finally {
    console.info(
      `[${ROUTE_VERSION}] completed in ${Date.now() - startedAt}ms`
    );
  }
}