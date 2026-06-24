# user-mvc-api

Fastify + Drizzle ORM backend for a detailed `User` model, backed by Supabase Postgres.
Built to practice the MVC pattern on the backend.

## MVC structure

```
src/
  models/user.model.ts        ← M: Drizzle schema (table shape, types)
  services/user.service.ts    ← talks to the DB via the model
  controllers/user.controller.ts ← C: handles req/res, validation, status codes
  routes/user.routes.ts        ← maps URLs -> controller methods
  db/client.ts                 ← Postgres connection (Drizzle client)
  server.ts                    ← Fastify app entrypoint
```

There's no "View" here since this is a backend-only API (no frontend) — Insomnia plays
the role of the client for testing.

## Testing

We test all endpoints manually using Insomnia, covering both the happy path
(valid input) and the negative path (missing fields, invalid enum values,
nonexistent ids).

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` from:
   Supabase Dashboard → user-model-mvc project → Project Settings → Database → Connection string.
2. `npm install`
3. `npm run db:generate` — generates SQL migration from the schema
4. `npm run db:migrate` — applies it to Supabase
5. `npm run dev` — starts the API on `http://localhost:3002`

## Endpoints

| Method | URL | Body |
|---|---|---|
| GET | /users | — |
| GET | /users/:id | — |
| POST | /users | `{ name, surname, age, gender, email, nationality?, phoneNumber?, address? }` |
| PUT | /users/:id | any subset of the above |
| DELETE | /users/:id | — |

`gender` must be one of: `male`, `female`, `other`.
