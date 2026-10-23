# AI Usage Notes

## AI Tools Used

I used **ChatGPT (OpenAI)** as a development assistant while implementing this assignment.

My primary experience is with JavaScript, Node.js, React, and SQL. I am not experienced with TypeScript, so AI helped me understand TypeScript syntax, interfaces, type annotations, and compiler errors while developing this application.

I also used AI for:

- Planning the database models and relationships for products, orders, order items, and payment webhook events.
- Discussing PostgreSQL transactions, row-level locking, stock reservation, webhook idempotency, and concurrent pickup claims.
- Creating and improving the React frontend design using Tailwind CSS.
- Setting up Dockerfiles and Docker Compose for PostgreSQL, Redis, the backend, frontend, migrations, and the expiry worker.
- Understanding error messages and troubleshooting build and configuration issues.

## A Prompt That Worked Well

One useful prompt was:

> Show me how to implement a PostgreSQL-backed order creation flow using Sequelize transactions and row-level locking, where multiple concurrent requests cannot purchase the same remaining stock. Explain the implementation step by step.

This helped me understand why checking stock and updating it must happen within the same transaction, rather than performing a separate stock check followed by an update.

## Something AI Got Wrong

During Dockerization, the suggested Compose configuration initially used `postgres:16-alpine`, while my existing local PostgreSQL data volume had been initialized using PostgreSQL 17.

This caused a database version incompatibility when starting the container.

I identified the issue by reading the PostgreSQL container logs and checking the database version reported there. I corrected the Docker Compose image to `postgres:17-alpine` to match the existing data volume.

I also encountered a frontend TypeScript build error caused by an unused `PackageCheck` import. I checked the compiler output and removed the unused import before rebuilding.

## How I Used and Verified AI Output

I treated AI-generated code as a starting point rather than assuming it was correct.

I reviewed the generated implementation, worked through the TypeScript and Docker errors, and used integration tests against PostgreSQL to check the important concurrency scenarios.

The main areas I focused on verifying were preventing overselling, handling duplicate payment webhooks safely, and ensuring only one pickup claim succeeds.

AI accelerated development, particularly in areas where I had less prior experience, but I used the application behavior, build output, database transactions, and test results to evaluate its suggestions.