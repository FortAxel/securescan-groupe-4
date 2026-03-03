# SecureScan-backend — Getting Started

## Prerequisites

- Node.js >= 18
- npm >= 9
- A running MySQL instance (local or remote)

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Environment setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and update at minimum:

```env
DATABASE_URL="mysql://YOUR_USER:YOUR_PASSWORD@localhost:3306/securescan"
JWT_SECRET=pick_a_long_random_string
```

> The `securescan` database must exist on your MySQL instance before running migrations.  
> Create it manually if needed: `CREATE DATABASE securescan;`

---

## 3. Run Prisma migrations

This will create all the tables in your database:

```bash
npx prisma migrate dev
```

To visualize your database in a browser UI (optional):

```bash
npx prisma studio
```

---

## 4. Start the server

Development (auto-reload with nodemon):

```bash
npm run dev
```

Production:

```bash
npm start
```

The API will be available at `http://localhost:3000`.  
Check `GET /health` to confirm it's running.

---

## Project structure

```
securescan-backend/
├── prisma/
│   └── schema.prisma       # Database models
├── src/
│   ├── server.js           # Express config (middlewares, routes)
│   ├── routes/             # Route handlers
│   ├── services/           # Business logic & tool runners
│   ├── middlewares/        # Auth middleware
│   └── types/              # Shared constants
├── tmp/
│   ├── uploads/            # Uploaded ZIP files (auto-created)
│   └── repos/              # Cloned git repos (auto-created)
├── server.js               # Entry point
└── .env                    # Your local env (never commit this)
```