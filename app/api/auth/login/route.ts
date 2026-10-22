import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON request." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const values = body as Record<string, unknown>;

  const email =
    typeof values.email === "string"
      ? normalizeEmail(values.email)
      : "";

  const fullName =
    typeof values.fullName === "string"
      ? normalizeText(values.fullName)
      : "";

  const country =
    typeof values.country === "string"
      ? normalizeText(values.country)
      : "";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (fullName.length < 2 || fullName.length > 100) {
    return NextResponse.json(
      { error: "Enter your full name using 2 to 100 characters." },
      { status: 400 }
    );
  }

  if (country.length < 2 || country.length > 100) {
    return NextResponse.json(
      { error: "Enter your country using 2 to 100 characters." },
      { status: 400 }
    );
  }

  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId = existingUser?.id;

    if (!userId) {
      const [createdUser] = await db
        .insert(users)
        .values({
          email,
          fullName,
          country
        })
        .returning({ id: users.id });

      userId = createdUser.id;
    }

    await createSession(userId);

    return NextResponse.json(
      {
        user: {
          id: userId,
          email,
          fullName,
          country
        }
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error: unknown) {
    console.error("Login failed:", error);

    return NextResponse.json(
      {
        error:
          "Could not sign in. Please check your details and try again."
      },
      { status: 500 }
    );
  }
}