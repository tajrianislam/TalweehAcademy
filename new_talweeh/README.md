# Talweeh Academy

React + Vite frontend with an Express/MySQL API in `server/`.

See [`/AGENTS.md`](../AGENTS.md) for AI agent and contributor guidance (architecture, conventions, common tasks).

## Run Locally

1. Open the app folder:

```bash
cd ~/TalweehAcademy/new_talweeh
```

2. Install frontend and server dependencies:

```bash
npm install
npm run install:server
```

3. Start the API server:

```bash
npm run server
```

The API runs on:

```text
http://localhost:3001/
```

4. In another terminal, start the frontend development server:

```bash
npm run dev
```

5. Open the local URL shown in the terminal, usually:

```text
http://localhost:5173/
```

Vite proxies `/api` requests to `http://localhost:3001`.

## Other Commands

Start only the API server:

```bash
npm run server
```

Run lint checks:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Notes

This project uses remote Talweeh Academy image and font assets, so an internet connection is needed for the page to fully match the design locally.

Server environment variables live in `server/.env`.
