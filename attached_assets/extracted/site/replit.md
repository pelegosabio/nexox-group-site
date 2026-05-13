# NEXOX GROUP Store

A premium Brazilian gaming cheat store built with React + Vite. Sells RAGE PANEL, LITE PANEL, and offers a free cheat download (CHEAT FREE) through a chat-based channel subscription verification flow.

## Run & Operate

- `pnpm --filter @workspace/nexox-store run dev` — run the store frontend
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4
- Router: Wouter
- API: Express 5 (api-server)
- Auth: localStorage-based (nexox_user, nexox_logged_user)

## Where things live

- `artifacts/nexox-store/src/pages/home.tsx` — main store page with products and purchase modals
- `artifacts/nexox-store/src/pages/login.tsx` — login/register page
- `artifacts/nexox-store/src/pages/cheat-free.tsx` — free cheat chat verification flow
- `artifacts/nexox-store/public/` — logo and icon assets (from original ZIP)

## Architecture decisions

- Frontend-only auth: user accounts stored in localStorage (nexox_user key), sessions in nexox_logged_user
- No backend needed for the first build — all store logic is client-side
- Product purchase modals show plan options and prices for RAGE and LITE panels
- Cheat Free flow simulates admin chat verification before unlocking download

## Product

- Home: Hero section + RAGE PANEL / LITE PANEL / CHEAT FREE product cards
- Purchase modals: Pricing plans per product (PIX payment)
- Login/Register: localStorage-based account system
- Cheat Free: Chat UI where users send a subscription screenshot to unlock the free download

## User preferences

- Portuguese (Brazilian) UI language
- Dark theme: black background, zinc gradients, white accents
- Preserve original Next.js design exactly in the Vite rebuild

## Gotchas

- Images are served from `artifacts/nexox-store/public/` — use `import.meta.env.BASE_URL` prefix in code
- BASE_URL ends with `/` from Vite; strip trailing slash when concatenating paths manually
