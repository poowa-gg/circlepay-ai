# CirclePay AI

A transparent operating system for community savings circles.

CirclePay AI is a hackathon prototype for managing rotating savings
groups: creating circles, managing memberships, generating contribution
obligations, and displaying a clear contribution ledger.

The planned AI Treasurer and PayPal Sandbox integrations will build on
this deterministic data foundation.

## Project status

This is an early-stage local prototype, not a production financial
service.

### Implemented

- Circle creation API.
- Member creation with reuse of existing user accounts.
- Email normalization.
- Duplicate-membership protection.
- Transactional cycle and contribution generation.
- Repeat-safe cycle-generation requests.
- Read-only contribution ledger API.
- AG Grid Community ledger interface.

### Verification

- Production build and TypeScript checks: passed.
- Circle creation: verified.
- Membership creation: verified.
- Contribution generation and ledger retrieval: verified.

Record the results of duplicate, normalization, concurrent-request,
and cross-circle tests here after running them.

### Planned

- Organizer authentication and circle-level authorization.
- Cycle-creation form and cycle-specific ledger filtering.
- PayPal Sandbox payment integration.
- Verified payment-event processing.
- AI Treasurer using authorized, server-supplied ledger data.
- Payout controls and rotation scheduling.

The presence of an API file does not mean that its integration is
complete or production-ready.

## What the prototype does

1. Creates a savings circle.
2. Adds members without duplicating existing user identities.
3. Creates a numbered contribution cycle.
4. Generates one obligation per active member at cycle creation.
5. Returns existing records when the same cycle request is repeated.
6. Displays contribution status in a read-only ledger.

A PENDING contribution represents an amount owed.
It does not prove that money has been collected.

## Technology

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- PostgreSQL
- Drizzle ORM
- AG Grid Community

Only list additional integrations as implemented after testing them.

## Local setup

### Prerequisites

- A compatible Node.js installation
- npm
- An empty development PostgreSQL database

Use the Node.js version requirements declared by the installed
Next.js package.

### Installation

```bash
npm ci
```

Copy `.env.example` to `.env.local` and enter your development
database connection string.

Never commit `.env.local`.

Review the database definitions and target database before running:

```bash
npx drizzle-kit push --config=drizzle.config.ts
```

Start the development server:

```bash
npm run dev
```

## Useful routes

- `/api/health` — application health response
- `POST /api/circles` — create a circle
- `POST /api/circles/[circleId]/members` — add a member
- `POST /api/circles/[circleId]/cycles` — create a contribution cycle
- `GET /api/circles/[circleId]/ledger` — read contribution records
- `/ledger` — prototype ledger screen

The current ledger page uses a development circle ID.
Replace it with a circle ID from your own database before testing.

A health response alone does not establish database or payment-provider
health unless those dependencies are explicitly checked.

## Build verification

```bash
npm run build
```

## Data-integrity decisions

- User email uniqueness is preserved.
- A user identity can participate in multiple circles.
- A composite constraint prevents duplicate membership in one circle.
- Cycle generation uses a transaction.
- A cycle-member constraint prevents duplicate generated obligations.
- Repeating an existing cycle request does not recreate its obligations.

## Engineering challenge

An early membership implementation attempted to create a user on every
join request. Existing emails therefore triggered PostgreSQL uniqueness
errors.

We separated identity creation from circle membership, reused existing
users, added conflict-aware inserts, and introduced explicit conflict
responses for duplicate membership requests.

This preserved database safeguards instead of removing them to hide
the error.

## Known limitations

- Authentication and organizer authorization are not complete.
- Keep the application local until access controls are implemented.
- No real-money processing is supported.
- Stored contribution status is not proof of provider settlement.
- The ledger currently combines contribution records across cycles.
- Members added after a cycle is created are not automatically added
  to that existing cycle.
- Payout-position uniqueness and complete rotation governance remain
  to be implemented.
- Prototype trust-score fields are not validated credit-risk models.

## Security

Never submit credentials, database passwords, or personal financial
information in public issues.

If a credential is exposed, revoke or rotate it rather than only
removing it from the latest file.

## Roadmap

1. Secure organizer access.
2. Complete cycle-management UI.
3. Add PayPal Sandbox collection and verified event processing.
4. Add the AI Treasurer with explicit action approval.
5. Add rotation visualization and payout safeguards.
6. Document test results and produce the demo.