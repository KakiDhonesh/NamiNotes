# NamiNotes Frontend

Track movies and shows, add watched titles, and automatically detect whether the next part is upcoming or the title is completed.

## 1) Environment setup

Create a `.env.local` file inside `frontend/`:

```env
VITE_TMDB_API_KEY=YOUR_TMDB_API_KEY

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Then run:

```bash
npm install
npm run dev
```

## 2) TMDB behavior in this app

- For `tv` media:
  - If TMDB has `next_episode_to_air` -> status becomes `Waiting for Next Part`
  - If show status is `Ended` or `Canceled` and no next episode -> `Completed`
- For `movie` media:
  - If movie belongs to a collection and a future-dated part exists -> `Waiting for Next Part`
  - Otherwise -> `Completed`

You can refresh one item or all items from Dashboard using TMDB status refresh buttons.

## 3) Firestore collections used

### `users/{uid}`
- `name`, `email`, `photoURL`, `createdAt`

### `movies/{movieId}`
- `userId` (string)
- `title` (string)
- `category` (string)
- `mediaType` (`movie` | `tv`)
- `tmdbId` (number)
- `poster`, `overview`, `releaseDate`
- `rating` (number)
- `status` (`Watching` | `Waiting for Next Part` | `On Hold` | `Completed`)
- `nextEpisode` (object | null)
- `nextPart` (object | null)
- `hasUpcomingPart` (boolean)
- `isFavorite` (boolean)
- `createdAt`, `updatedAt`

## 4) Firestore security rules (recommended)

In Firebase Console -> Firestore Database -> Rules:

You can copy from `backend/firestore/firestore.rules`.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /movies/{movieId} {
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;

      allow read, update, delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

## 5) Optional index note

Current query is `where('userId', '==', uid)` and sorting is client-side, so no composite index is required right now.

## 6) Production recommendation

For large users/watchlists, move TMDB sync to backend cron/cloud functions to avoid many client-side TMDB calls.
