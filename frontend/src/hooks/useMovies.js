import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
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
        const docs = snap.docs
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
        setMovies(docs);
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

          // Check for duplicate
          const duplicate = movies.find(
            (m) => m.tmdbId === payload.tmdbId && m.mediaType === payload.mediaType
          );
          if (duplicate) {
            throw new Error(
              `"${payload.title}" is already in your tracker.`
            );
          }

          const tmdbSnapshot = await getTrackingSnapshot(
            payload.mediaType || "movie",
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

          const moviesRef = collection(db, "movies");
          await addDoc(moviesRef, {
            title: payload.title,
            category: payload.category || "Movie",
            contentType: payload.contentType || "movie",
            language: payload.language || "",
            languageLabel: payload.languageLabel || "Unknown",
            tmdbId: payload.tmdbId || null,
            mediaType: payload.mediaType || "movie",
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
    [userId, movies]
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

          if (
            !snapshot.hasUpcomingPart ||
            !releaseAt ||
            daysUntil <= 0 ||
            daysUntil > UPCOMING_WINDOW_DAYS
          ) {
            await deleteDoc(ref);
            return;
          }
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
