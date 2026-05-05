import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { getTrackingSnapshot } from "../services/tmdb";

const UPCOMING_WINDOW_DAYS = 30;

// Status for tracked media
export const TRACKING_STATUSES = [
  "Watching",
  "Waiting for Next Part",
  "On Hold",
  "Completed",
];

const toDateOrNull = (input) => {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDaysUntil = (date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const getMovieDedupKey = (movie) => {
  if (!movie) return null;

  const mediaType = movie.mediaType || "movie";
  const tmdbId = movie.tmdbId || null;

  if (tmdbId) {
    return `${mediaType}:${tmdbId}`;
  }

  return `${mediaType}:${movie.title || movie.id}`;
};

// Provides realtime watched media data for the signed-in user
export function useMovies(userId) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setActionError = (err) => {
    setError(err instanceof Error ? err : new Error(String(err)));
  };

  useEffect(() => {
    if (!userId) {
      setMovies([]);
      setLoading(false);
      return undefined;
    }

    const moviesRef = collection(db, "movies");
    // Query only by userId; sort client-side to avoid index requirement
    const q = query(moviesRef, where("userId", "==", userId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const orderedDocs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const bTime =
              b.updatedAt?.toMillis?.() ||
              b.createdAt?.toMillis?.() ||
              b.updatedAtClient ||
              0;
            const aTime =
              a.updatedAt?.toMillis?.() ||
              a.createdAt?.toMillis?.() ||
              a.updatedAtClient ||
              0;
            return bTime - aTime;
          });

        const seen = new Map();
        const dedupedMovies = [];
        const duplicateIds = [];

        for (const movie of orderedDocs) {
          const dedupKey = getMovieDedupKey(movie);
          if (!dedupKey) {
            dedupedMovies.push(movie);
            continue;
          }

          const existing = seen.get(dedupKey);
          if (!existing) {
            seen.set(dedupKey, movie.id);
            dedupedMovies.push(movie);
            continue;
          }

          duplicateIds.push(movie.id);
        }

        if (duplicateIds.length > 0) {
          Promise.all(
            duplicateIds.map((id) => deleteDoc(doc(db, "movies", id)))
          ).catch(() => {});
        }

        setMovies(dedupedMovies);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  const addMovie = useMemo(
    () =>
      async (payload) => {
        try {
          if (!userId) throw new Error("No user");
          if (!payload?.tmdbId) {
            throw new Error("Missing TMDB id.");
          }

          const mediaType = payload.mediaType || "movie";
          const movieId = `${userId}_${mediaType}_${payload.tmdbId}`;
          const movieRef = doc(db, "movies", movieId);
          const existingMoviesQuery = query(
            collection(db, "movies"),
            where("userId", "==", userId),
            where("tmdbId", "==", payload.tmdbId),
            where("mediaType", "==", mediaType)
          );
          const existingMoviesSnapshot = await getDocs(existingMoviesQuery);

          if (!existingMoviesSnapshot.empty) {
            throw new Error(`"${payload.title}" is already in your tracker.`);
          }

          const tmdbSnapshot = await getTrackingSnapshot(
            mediaType,
            payload.tmdbId
          );

          const releaseDate =
            tmdbSnapshot.nextPart?.airDate || tmdbSnapshot.nextEpisode?.airDate;
          const releaseAt = toDateOrNull(releaseDate);
          const daysUntil = releaseAt ? getDaysUntil(releaseAt) : null;
          const isUpcomingWithinWindow = Boolean(
            tmdbSnapshot.hasUpcomingPart &&
              releaseAt &&
              daysUntil > 0 &&
              daysUntil <= UPCOMING_WINDOW_DAYS
          );

          await setDoc(movieRef, {
            title: payload.title,
            category: payload.category || "Movie",
            contentType: payload.contentType || "movie",
            language: payload.language || "",
            languageLabel: payload.languageLabel || "Unknown",
            tmdbId: payload.tmdbId || null,
            mediaType,
            poster: payload.poster || "",
            backdrop: payload.backdrop || "",
            overview: payload.overview || "",
            rating: payload.rating || 0,
            status: tmdbSnapshot.status || "Watching",
            releaseDate: payload.releaseDate || "",
            nextEpisode: tmdbSnapshot.nextEpisode || payload.nextEpisode || null,
            nextPart: tmdbSnapshot.nextPart || null,
            hasUpcomingPart: Boolean(tmdbSnapshot.hasUpcomingPart),
            lastTmdbSyncAt: serverTimestamp(),
            isFavorite: false,
            userId,
            updatedAtClient: Date.now(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          return isUpcomingWithinWindow;
        } catch (err) {
          setActionError(err);
          throw err;
        }
      },
    [userId]
  );

  const updateMovie = useMemo(
    () =>
      async (id, payload) => {
        try {
          const ref = doc(db, "movies", id);
          await updateDoc(ref, {
            ...payload,
            updatedAtClient: Date.now(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          setActionError(err);
          throw err;
        }
      },
    []
  );

  const removeMovie = useMemo(
    () => async (id) => {
      try {
        const ref = doc(db, "movies", id);
        await deleteDoc(ref);
      } catch (err) {
        setActionError(err);
        throw err;
      }
    },
    []
  );

  const syncMovieFromTmdb = useMemo(
    () =>
      async (movie) => {
        try {
          if (!movie?.id || !movie?.tmdbId) return;
          const ref = doc(db, "movies", movie.id);
          const snapshot = await getTrackingSnapshot(
            movie.mediaType || "movie",
            movie.tmdbId
          );

          const releaseDate =
            snapshot.nextPart?.airDate || snapshot.nextEpisode?.airDate;
          const releaseAt = toDateOrNull(releaseDate);
          const daysUntil = releaseAt ? getDaysUntil(releaseAt) : null;
          await updateDoc(ref, {
            status: snapshot.status || movie.status || "Watching",
            nextEpisode: snapshot.nextEpisode || null,
            nextPart: snapshot.nextPart || null,
            hasUpcomingPart: Boolean(snapshot.hasUpcomingPart),
            updatedAtClient: Date.now(),
            lastTmdbSyncAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          setActionError(err);
          throw err;
        }
      },
    []
  );

  const syncAllMoviesFromTmdb = useMemo(
    () => async () => {
      const eligible = movies.filter((movie) => movie.tmdbId);
      await Promise.all(eligible.map((movie) => syncMovieFromTmdb(movie)));
    },
    [movies, syncMovieFromTmdb]
  );

  return {
    movies,
    loading,
    error,
    addMovie,
    updateMovie,
    removeMovie,
    syncMovieFromTmdb,
    syncAllMoviesFromTmdb,
  };
}
