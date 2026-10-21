import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { circles } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      cultureTerm,
      currency,
      contributionAmount,
      cycleFrequency
    } = body;

    if (!name || !currency || !contributionAmount || !cycleFrequency) {
      return NextResponse.json(
        {
          error:
            "Name, currency, contribution amount, and cycle frequency are required."
        },
        { status: 400 }
      );
    }

    const [circle] = await db
      .insert(circles)
      .values({
        name,
        cultureTerm: cultureTerm || "Esusu",
        currency,
        contributionAmount,
        cycleFrequency,
        organizerId: null
      })
      .returning();

    return NextResponse.json({ circle }, { status: 201 });
  } catch (error) {
    console.error("Circle creation failed:", error);

    return NextResponse.json(
      { error: "Could not create circle." },
      { status: 500 }
    );
  }
}