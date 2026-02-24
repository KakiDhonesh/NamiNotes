# NamiNotes

NamiNotes is organized as a monorepo with a clear split between frontend app code and backend-related configuration.

## Project structure

- `frontend/` — Vite + React application (UI, auth flow, movie tracking features)
- `backend/` — backend-facing resources and infrastructure files
	- `firestore/firestore.rules` — Firestore security rules

## Notes

- Keep API keys only in local environment files (example: `frontend/.env.local`) and never commit them.
- Use `frontend/.env.example` as the template for required environment variables.
