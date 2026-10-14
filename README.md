# LEVO KG Backend

Production-oriented NestJS backend for the LEVO KG home-appliance storefront and admin panel.

## Technology stack

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL / Supabase
- JWT with Passport
- Argon2 password hashing
- Cloudflare R2 image storage
- Swagger/OpenAPI
- Jest

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL database or Supabase project
- Cloudflare R2 bucket and public URL

## Installation

```bash
npm install
cp .env.example .env
```

## Environment setup

Create `.env` from `.env.example` and fill your own values.

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/levo?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/levo?schema=public
JWT_SECRET=replace_with_secure_secret
JWT_ACCESS_TTL=15m
CORS_ORIGINS=http://localhost:3000,https://levo.kg
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
INITIAL_ADMIN_EMAIL=
INITIAL_ADMIN_PASSWORD=
INITIAL_ADMIN_NAME=
```

## Prisma workflow

```bash
npx prisma validate
npx prisma generate
```

For migration creation on a safe local or staging database:

```bash
npx prisma migrate dev --name init_levo_backend
```

Do not run destructive reset commands against existing Supabase data.

## Admin bootstrap

Create the first admin account:

```bash
npm run admin:create admin@example.com StrongPassword123 LEVO Administrator
```

You can also use environment variables:

```bash
INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=StrongPassword123 INITIAL_ADMIN_NAME='LEVO Administrator' npm run admin:create
```

## Local launch

```bash
npm run start:dev
```

The API will run under `/api/v1` and Swagger documentation is available at:

```text
http://localhost:3001/api/docs
```

## Authentication

Available endpoints:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## Catalog and product APIs

Examples:

```bash
curl http://localhost:3001/api/v1/catalogs
curl http://localhost:3001/api/v1/products
curl "http://localhost:3001/api/v1/products/search?q=oven"
```

## Image uploads

The backend supports multipart image uploads via Cloudflare R2.

## Build and tests

```bash
npm run build
npm test
```

## Notes

This repository currently contains a working NestJS foundation for the LEVO KG backend with Prisma, JWT auth, admin user bootstrap, catalog/product modules, and Cloudflare R2 integration scaffolding.
