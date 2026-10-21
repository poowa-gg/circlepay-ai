import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contributions } from "@/db/schema";
import { createPayPalOrder } from "@/lib/paypal";
import { getSessionUserId } from "@/lib/session";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to start a payment." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON body." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Request body must be an object." },
      { status: 400 }
    );
  }

  const rawContributionId = (body as Record<string, unknown>)
    .contributionId;

  const contributionId =
    typeof rawContributionId === "string"
      ? rawContributionId
      : "";

  if (!uuidPattern.test(contributionId)) {
    return NextResponse.json(
      { error: "A valid contribution ID is required." },
      { status: 400 }
    );
  }

  try {
    const [contribution] = await db
      .select()
      .from(contributions)
      .where(eq(contributions.id, contributionId))
      .limit(1);

    if (!contribution) {
      return NextResponse.json(
        { error: "Contribution not found." },
        { status: 404 }
      );
    }

    if (contribution.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending contributions can be paid." },
        { status: 409 }
      );
    }

    const orderId = await createPayPalOrder({
      contributionId: contribution.id,
      amount: contribution.amount,
      currency: contribution.currency
    });

    return NextResponse.json({ orderId });
  } catch (error: unknown) {
    console.error("PayPal order creation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `PayPal Sandbox error: ${error.message}`
            : "PayPal Sandbox is unavailable."
      },
      { status: 502 }
    );
  }
}