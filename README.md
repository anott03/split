# Split

Split is a self-hosted expense-sharing app — keep track of shared expenses within a group, see who owes whom, and settle up. Think a lightweight Splitwise you run yourself.

Features:

- **Groups** — create a group, invite members, and switch between multiple groups
- **Expenses** — log expenses paid by one member and split among others
- **Settlements** — record payments between members (stored alongside expenses)
- **Balances** — simplified debts computed from expenses and settlements, so you always know who owes whom

## Architecture

A single Next.js app deployed entirely on Cloudflare:

- **Next.js 16 (App Router) + React 19** — the main page is a server component that validates the session, loads the active group's expenses and balances, and renders the dashboard. Client components handle dialogs, forms, and tables.
- **Cloudflare Workers** — deployed via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), with a service binding for caching and image optimization.
- **Cloudflare D1 (SQLite)** — accessed through **Drizzle ORM**. The schema lives in `src/lib/schema.ts`; users, groups, members, expenses, and splits all live in D1. The Drizzle client (`src/lib/db.ts`) lazily proxies the D1 binding, since bindings are only available in request scope on Workers.
- **Better Auth** — session-based authentication with the Drizzle adapter. Middleware does a fast cookie check at the edge; server components and route handlers re-validate the session for real authorization.
- **Effect** — server-side data access (`src/lib/expenses.ts`, `src/lib/groups.ts`) and mutations (`src/lib/*-actions.ts`) use `Effect` for typed, composable error handling. All mutations validate the session and group membership before touching the database.
- **Tailwind v4 + shadcn/ui (base-nova)** — component styling, with `lucide-react` icons and `sonner` toasts.

### Data model

`user → groupMember → group`, with `expense → expenseSplit` rows per participant. Settlements are rows in the same `expense` table with `kind === "settlement"` and a single split.

## Development

```sh
pnpm install
pnpm dev        # dev server (getCloudflareContext works via initOpenNextCloudflareForDev)
```

Type checking and building:

```sh
pnpm exec tsc --noEmit
pnpm build
```

Push the schema to D1 (requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN`):

```sh
pnpm db:push
```

Deploy to Cloudflare:

```sh
pnpm preview    # build + local preview via wrangler
pnpm deploy     # build + deploy
```
