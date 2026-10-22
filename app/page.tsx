import Link from "next/link";

const features = [
  {
    title: "Transparent cycles",
    text: "Create contribution cycles and prevent duplicate obligations."
  },
  {
    title: "AI Treasurer",
    text: "Ask questions about the real ledger. Read-only and grounded in your data."
  },
  {
    title: "PayPal Sandbox",
    text: "Demonstrate a server-verified payment workflow without moving real money."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-4 py-16 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="inline-block rounded-full border border-blue-400/40 bg-blue-500/10 px-4 py-1 text-sm font-medium text-blue-200">
            PayPal AI Hackathon Prototype
          </p>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            CirclePay AI
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Transparent savings circles, explained by AI.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ledger"
              className="w-full rounded-xl bg-blue-600 px-6 py-3 text-center font-semibold text-white hover:bg-blue-700 sm:w-auto"
            >
              Open Demo Ledger
            </Link>

            <Link
              href="/login"
              className="w-full rounded-xl border border-white/20 px-6 py-3 text-center font-semibold text-white hover:bg-white/10 sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-xl text-sm text-slate-400">
            This prototype uses PayPal Sandbox. Production pooled-funds
            movement would require PayPal approval and compliance review.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
            >
              <h2 className="text-lg font-semibold">
                {feature.title}
              </h2>

              <p className="mt-2 text-sm text-slate-300">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}