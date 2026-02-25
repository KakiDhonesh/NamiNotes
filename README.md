# NamiNotes

NamiNotes is a personal tracker for movies, TV shows, and anime. It lets users save titles to a watchlist, mark viewing status, and sync upcoming releases from TMDB so they show up when a new episode or part is close.

## Project structure

- `frontend/` — Vite + React application (UI, auth flow, movie tracking features)
- `backend/` — backend-facing resources and infrastructure files
	- `firestore/firestore.rules` — Firestore security rules

## What the app does

- Search TMDB for movies, TV shows, and anime
- Add any title to your tracker
- Mark status: Watching, Waiting for Next Part, On Hold, Completed
- Refresh TMDB data to pull upcoming episodes/parts
- Flag favorites and keep a personal watchlist

## How to run it locally

1) Install dependencies

```bash
cd frontend
npm install
```

2) Set environment variables

Copy the example file and fill in values:

```bash
copy .env.example .env.local
```

Required keys are listed in `frontend/.env.example` (TMDB + Firebase).

3) Start the dev server

```bash
npm run dev
```

The app runs at the URL shown in the terminal output (usually http://localhost:5173).

## Firestore rules

If you are using Firebase, copy the rules from `backend/firestore/firestore.rules` into your Firestore rules in the Firebase console.

## Notes

- Keep API keys only in local environment files (example: `frontend/.env.local`) and never commit them.
- Use `frontend/.env.example` as the template for required environment variables.
