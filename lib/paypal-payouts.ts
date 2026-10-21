import { getPayPalAccessToken } from "./paypal";

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE!;

export async function createCirclePayout({
  recipientEmail,
  amount,
  currency,
  note
}: {
  recipientEmail: string;
  amount: string;
  currency: string;
  note: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const payload = {
    sender_batch_header: {
      sender_batch_id: `circlepay-${Date.now()}`,
      email_subject: "Your CirclePay savings payout",
      email_message: note
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: amount,
          currency
        },
        receiver: recipientEmail,
        note,
        sender_item_id: `payout-${Date.now()}`
      }
    ]
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal payout failed: ${error}`);
  }

  return response.json();
}