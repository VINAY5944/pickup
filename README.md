# Pickup Counter

A small full-stack ordering application that demonstrates safe stock reservation, payment webhook processing, automatic order expiry, and atomic pickup claims.

The main focus of this implementation is backend correctness under concurrent requests.

## Tech Stack

**Backend**
- Node.js, Express.js and TypeScript
- PostgreSQL with Sequelize ORM
- Redis and BullMQ
- Vitest and Supertest

**Frontend**
- React with Vite
- TypeScript
- Tailwind CSS
- Axios

**Infrastructure**
- Docker and Docker Compose
- Nginx for serving the frontend and proxying API requests

## Running the Application

### Prerequisites

- Docker Desktop
- Docker Compose

From the project root, run:

```bash
docker compose up --build
```

The application starts the PostgreSQL database, Redis, database migration/seeding service, backend API, expiry worker, and frontend.

Once the services are ready:

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend health check | http://localhost:3000/health |
| Products API | http://localhost:3000/api/products |

The migration service is expected to exit successfully after completing its work.

To stop the application:

```bash
docker compose down
```

This preserves the database volume.

## Running the Tests

The backend includes integration tests using PostgreSQL, Vitest, and Supertest.

Start PostgreSQL and Redis:

```bash
docker compose up -d db redis
```

Then navigate to the backend directory:

```bash
cd backend
```

Configure the test database environment and run:

```bash
npm install
npm test
```

The integration tests require a running PostgreSQL database with the test schema migrated.

### Important Test Scenarios

1. **Concurrent stock reservation:** Ten simultaneous requests compete for the final two units of a product. Exactly two orders succeed, and the remaining requests receive a conflict response.
2. **Duplicate payment webhook:** Sending the same signed payment event twice does not process the payment twice.
3. **Concurrent pickup claims:** Two simultaneous pickup requests for the same paid order result in exactly one successful claim and one conflict response.

These tests exercise real database transactions rather than relying only on mocked services.

## Implementation Decisions

### 1. Stock Reservation

Product prices are stored as integer paise to avoid floating-point rounding issues.

Creating an order happens inside a PostgreSQL transaction. Product rows are locked before checking and decrementing stock.

This prevents two concurrent requests from purchasing the same remaining inventory.

Products are locked in a consistent order to reduce the risk of deadlocks.

### 2. Order Expiry

An unpaid order reserves its stock for 120 seconds.

BullMQ schedules an expiry job, and a separate worker processes it.

Before releasing stock, the worker checks the order's current status and expiry time inside a database transaction. This prevents an expiry job from releasing inventory belonging to an already-paid order.

The database is treated as the source of truth; the queue is used for scheduling.

### 3. Payment Webhook

The application includes a webhook sender script that simulates a payment provider.

Webhook requests are authenticated using HMAC-SHA256 over the raw request body and a shared secret.

Each event contains an event ID. Processed events are recorded in PostgreSQL to make repeated webhook deliveries idempotent.

The order is locked while processing payment state changes.

The payment amount is compared with the amount calculated by the backend rather than trusting the incoming payment payload.

### 4. Late Payment Policy

**Decision: A payment received after the reservation has expired is marked `NEEDS_REVIEW`.**

An expired order must not automatically become a valid paid order because its previously reserved stock may already have been released and purchased by another customer.

The system therefore does not automatically issue a pickup code for a late payment.

A real application would send this case for manual review or initiate a refund through the payment provider.

The same review policy applies to payment amount mismatches.

### 5. Atomic Pickup Claim

Pickup claims use a PostgreSQL transaction and row-level locking.

Only an eligible paid order can transition to `PICKED_UP`.

If two requests attempt to claim the same order simultaneously, only the first successful transaction can complete the transition. The other request receives HTTP 409.

### 6. Frontend Countdown

The frontend uses the expiry information returned by the backend instead of assuming the customer's device clock is accurate.

It also polls the backend for order status updates. The displayed countdown is informational; the backend remains responsible for enforcing the actual expiry deadline.

## Assumptions

- This is a single-store pickup application.
- No customer authentication is required for this assignment.
- The payment provider is simulated using a signed webhook sender script.
- Stock is reserved immediately when an order is created.
- An unpaid reservation expires after 120 seconds.
- Late payments are not automatically fulfilled.
- Pickup claims are final once successfully completed.
- Environment credentials supplied through Docker Compose are intended for local development only.

## What I Would Improve With More Time

- Integrate an actual payment gateway and its official webhook verification process.
- Add authentication and authorization for customers and store staff.
- Implement an automated refund/reconciliation flow for late payments.
- Add more tests for payment-versus-expiry races and malformed webhook payloads.
- Add structured logging, monitoring, and better operational error handling.
- Improve the frontend's accessibility, validation, and mobile experience.
- Move development secrets to a proper production secret-management solution.

## AI Usage

AI assistance was used during development. The tools, areas of assistance, and a specific correction are documented separately in `AI_NOTES.md`.