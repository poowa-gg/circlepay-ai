const PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com";

type PayPalTokenResponse = {
  access_token?: string;
};

type PayPalOrderResponse = {
  id?: string;
  status?: string;
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal Sandbox is not configured.");
  }

  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getCredentials();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  const body: unknown = await response.json();

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error("PayPal returned an unreadable token response.");
  }

  const result = body as PayPalTokenResponse;

  if (!response.ok || typeof result.access_token !== "string") {
    throw new Error("PayPal did not return an access token.");
  }

  cachedToken = result.access_token;
  tokenExpiresAt = now + 25 * 60 * 1000;

  return cachedToken;
}

export async function createPayPalOrder(input: {
  contributionId: string;
  amount: string;
  currency: string;
}): Promise<string> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `circlepay-${input.contributionId}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.contributionId,
            amount: {
              currency_code: input.currency,
              value: input.amount
            }
          }
        ]
      })
    }
  );

  const body: unknown = await response.json();

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error("PayPal returned an unreadable order response.");
  }

  const result = body as PayPalOrderResponse;

  if (!response.ok || typeof result.id !== "string") {
    throw new Error("PayPal did not create the order.");
  }

  return result.id;
}

export async function capturePayPalOrder(input: {
  orderId: string;
}): Promise<string> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(
      input.orderId
    )}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  const body: unknown = await response.json();

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new Error("PayPal returned an unreadable capture response.");
  }

  const result = body as PayPalOrderResponse;

  if (!response.ok || result.status !== "COMPLETED") {
    throw new Error(
      `PayPal did not complete the payment. Status: ${
        result.status ?? "unknown"
      }.`
    );
  }

  return result.status;
}