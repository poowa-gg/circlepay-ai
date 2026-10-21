import { getPayPalAccessToken } from "./paypal";

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE!;

export async function createContributionInvoice({
  memberEmail,
  memberName,
  circleName,
  amount,
  currency,
  dueDate
}: {
  memberEmail: string;
  memberName: string;
  circleName: string;
  amount: string;
  currency: string;
  dueDate: string;
}) {
  const accessToken = await getPayPalAccessToken();

  const payload = {
    detail: {
      invoice_number: `CIRCLE-${Date.now()}`,
      currency_code: currency,
      note: `Contribution for ${circleName}`
    },
    primary_recipients: [
      {
        billing_info: {
          email_address: memberEmail
        }
      }
    ],
    items: [
      {
        name: `Savings contribution - ${circleName}`,
        quantity: "1",
        unit_amount: {
          currency_code: currency,
          value: amount
        }
      }
    ],
    due_date: dueDate
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/invoicing/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal invoice creation failed: ${error}`);
  }

  return response.json();
}