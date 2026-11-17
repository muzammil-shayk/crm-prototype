# Lead CRM

Requires Node.js 20 or newer. Runs offline with mock providers and seed data.

```bash
npm install
cp .env.example .env
npm run setup        # create the SQLite database and load seed data
npm run dev          # http://localhost:3000
```

```bash
npm test             # Vitest
npm run typecheck
npm run lint
npm run format:check
npm run build
```
