import { useEffect, useMemo, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import { TRACKING_STATUSES, useMovies } from "../hooks/useMovies";
import { MediaSearchForm } from "../components/MediaSearchForm";

export default function Dashboard() {
  const hasAutoSynced = useRef(false);
  const { user } = useAuth();
  const {
    movies,
    loading,
    error,
    addMovie,
    updateMovie,
    removeMovie,
    syncMovieFromTmdb,
    syncAllMoviesFromTmdb,
  } = useMovies(user?.uid);

  const displayName = useMemo(
    () => user?.displayName || user?.email || "Friend",
    [user]
  );

  const handleAddMedia = async (media) => {
    try {
      await addMovie({
        title: media.title,
        category: media.type,
        contentType: media.contentType,
        language: media.language,
        languageLabel: media.languageLabel,
        tmdbId: media.id,
        mediaType: media.mediaType,
        poster: media.poster,
        backdrop: media.backdrop,
        overview: media.overview,
        releaseDate: media.releaseDate,
        nextEpisode: media.nextEpisode,
        rating: media.rating,
      });
    } catch (err) {
      console.error("Add error:", err);
      window.alert(err?.message || "Failed to add title.");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateMovie(id, { status });
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeMovie(id);
    } catch (err) {
      console.error("Remove error:", err);
    }
  };

  const handleToggleFavorite = async (id, isFavorite) => {
    try {
      await updateMovie(id, { isFavorite: !isFavorite });
    } catch (err) {
      console.error("Favorite update error:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleSyncOne = async (movie) => {
    try {
      await syncMovieFromTmdb(movie);
    } catch (err) {
      console.error("Item sync error:", err);
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncAllMoviesFromTmdb();
    } catch (err) {
      console.error("Bulk sync error:", err);
    }
  };

  useEffect(() => {
    if (loading || hasAutoSynced.current || movies.length === 0) return;
    hasAutoSynced.current = true;

    syncAllMoviesFromTmdb().catch((err) => {
      console.error("Auto sync failed:", err);
    });
  }, [loading, movies.length, syncAllMoviesFromTmdb]);

  return (
    <div className="app-shell">
      <header className="app-hero">
        <div>
          <p className="eyebrow">Latest updates tracker</p>
          <h1>NamiNotes</h1>
          <p className="lede">
            Track your watched movies, shows, and anime. Get alerts on new
            episodes, releases, and what to watch next.
          </p>
          <div className="user-chip">
            <span>{displayName}</span>
            <button className="ghost" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Currently tracking</p>
          <p className="stat-value">{movies.length}</p>
          <p className="stat-sub">Watching or planning</p>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Add to tracker</p>
              <h2>Search & add</h2>
            </div>
          </div>
          <MediaSearchForm onSelect={handleAddMedia} loading={false} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Your watchlist</p>
              <h2>Tracked titles</h2>
            </div>
            <div className="end-actions">
              <button type="button" className="ghost" onClick={handleSyncAll}>
                Refresh TMDB status
              </button>
              {error && <span className="pill danger">{error.message}</span>}
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading...</p>
          ) : movies.length === 0 ? (
            <div className="empty">
              <p>No titles tracked yet.</p>
              <p className="muted">
                Search above to add movies, shows, or anime.
              </p>
            </div>
          ) : (
            <div className="movie-list">
              {movies.map((movie) => (
                <article key={movie.id} className="movie-card">
                  <div className="card-header">
                    {movie.poster && (
                      <img src={movie.poster} alt={movie.title} className="poster" />
                    )}
                    <div className="card-info">
                      <div>
                        <p className="eyebrow">
                          {movie.category || "Title"}
                        </p>
                        <h3>{movie.title}</h3>
                        {movie.languageLabel && (
                          <p className="tiny muted">{movie.languageLabel}</p>
                        )}
                      </div>
                      <div className="tag-row">
                        <span
                          className={`pill status ${movie.status
                            ?.toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {movie.status || "Watching"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {movie.nextEpisode && (
                    <div className="next-episode">
                      <p className="tiny">
                        <strong>Next ep:</strong> {movie.nextEpisode.name}
                      </p>
                      <p className="tiny muted">
                        S{movie.nextEpisode.seasonNumber}E
                        {movie.nextEpisode.episodeNumber} •{" "}
                        {movie.nextEpisode.airDate}
                      </p>
                    </div>
                  )}

                  {movie.nextPart && (
                    <div className="next-episode">
                      <p className="tiny">
                        <strong>Next part:</strong> {movie.nextPart.title}
                      </p>
                      {movie.nextPart.airDate && (
                        <p className="tiny muted">Release: {movie.nextPart.airDate}</p>
                      )}
                    </div>
                  )}

                  {movie.overview && (
                    <p className="muted">{movie.overview.substring(0, 120)}...</p>
                  )}

                  <div className="card-footer">
                    {movie.rating > 0 && (
                      <span className="rating">★ {movie.rating.toFixed(1)}</span>
                    )}
                    <button
                      type="button"
                      className={`heart ${movie.isFavorite ? "active" : ""}`}
                      onClick={() =>
                        handleToggleFavorite(movie.id, movie.isFavorite)
                      }
                    >
                      {movie.isFavorite ? "♥" : "♡"}
                    </button>
                  </div>

                  <div className="card-actions">
                    <div className="status-row">
                      {TRACKING_STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          className={
                            st === movie.status ? "chip active" : "chip"
                          }
                          onClick={() => handleStatusChange(movie.id, st)}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <div className="end-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleSyncOne(movie)}
                      >
                        Refresh
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => handleDelete(movie.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
