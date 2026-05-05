import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { TRACKING_STATUSES, useMovies } from "../hooks/useMovies";
import { MediaSearchForm } from "../components/MediaSearchForm";

const UPCOMING_WINDOW_DAYS = 30;

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

const MEDIA_SECTION_ORDER = ["anime", "movie", "tv"];

const MEDIA_SECTION_LABELS = {
  anime: "Anime",
  movie: "Movies",
  tv: "Series",
};

const normalizeMediaSection = (movie) => {
  const value = (movie?.contentType || movie?.mediaType || "movie").toLowerCase();

  if (value === "anime") return "anime";
  if (value === "tv" || value === "show" || value === "series") return "tv";
  return "movie";
};

const isUpcomingMovie = (movie) => {
  const nextPartDate = toDateOrNull(movie?.nextPart?.airDate);
  const nextEpisodeDate = toDateOrNull(movie?.nextEpisode?.airDate);
  const releaseDate = nextPartDate || nextEpisodeDate;
  if (!releaseDate) return false;

  const daysUntil = getDaysUntil(releaseDate);
  return daysUntil > 0 && daysUntil <= UPCOMING_WINDOW_DAYS;
};

export default function Dashboard() {
  const hasAutoSynced = useRef(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
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

  const detailMovie = useMemo(() => {
    if (!selectedMovie) return null;

    const releaseDate =
      selectedMovie.nextPart?.airDate ||
      selectedMovie.nextEpisode?.airDate ||
      selectedMovie.releaseDate ||
      "TBA";

    return {
      ...selectedMovie,
      releaseDate,
      detailSummary: selectedMovie.overview || "Story summary not available yet.",
    };
  }, [selectedMovie]);

  const sectionedMovies = useMemo(() => {
    return MEDIA_SECTION_ORDER.reduce((accumulator, section) => {
      accumulator[section] = movies.filter((movie) => normalizeMediaSection(movie) === section);
      return accumulator;
    }, {});
  }, [movies]);

  const hasSectionedMovies = MEDIA_SECTION_ORDER.some((section) => sectionedMovies[section].length > 0);

  const closeDetails = () => setSelectedMovie(null);

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
              <p>No tracked titles yet.</p>
              <p className="muted">
                Add any title. Upcoming releases within 30 days are highlighted.
              </p>
            </div>
          ) : hasSectionedMovies ? (
            <div className="watchlist-sections">
              {MEDIA_SECTION_ORDER.map((section) => {
                const sectionMovies = sectionedMovies[section];

                if (!sectionMovies.length) return null;

                return (
                  <section key={section} className="watchlist-section">
                    <div className="section-header watchlist-section-header">
                      <div>
                        <p className="eyebrow">{MEDIA_SECTION_LABELS[section]}</p>
                        <h3>{sectionMovies.length} title{sectionMovies.length !== 1 ? "s" : ""}</h3>
                      </div>
                      <p className="muted">
                        {section === "anime"
                          ? "Japanese animation and anime releases"
                          : section === "movie"
                            ? "Films and movie collections"
                            : "TV shows and ongoing series"}
                      </p>
                    </div>

                    <div className="movie-grid">
                      {sectionMovies.map((movie) => (
                        <article
                          key={movie.id}
                          className="movie-card clickable-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedMovie(movie)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedMovie(movie);
                            }
                          }}
                        >
                          <div className="card-poster-shell">
                            {movie.poster ? (
                              <img src={movie.poster} alt={movie.title} className="card-poster" />
                            ) : (
                              <div className="card-poster placeholder-poster">
                                <span>No poster</span>
                              </div>
                            )}
                            <div className="card-poster-gradient" />
                            <div className="card-badges">
                              <span
                                className={`pill status ${movie.status
                                  ?.toLowerCase()
                                  .replace(/\s+/g, "-")}`}
                              >
                                {movie.status || "Watching"}
                              </span>
                              {isUpcomingMovie(movie) && <span className="pill">Upcoming</span>}
                            </div>
                            <div className="card-poster-copy">
                              <p className="eyebrow">{movie.category || MEDIA_SECTION_LABELS[section]}</p>
                              <h3>{movie.title}</h3>
                              <p className="tiny muted">Click for details</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="movie-grid">
              {movies.map((movie) => (
                <article
                  key={movie.id}
                  className="movie-card clickable-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedMovie(movie)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedMovie(movie);
                    }
                  }}
                >
                  <div className="card-poster-shell">
                    {movie.poster ? (
                      <img src={movie.poster} alt={movie.title} className="card-poster" />
                    ) : (
                      <div className="card-poster placeholder-poster">
                        <span>No poster</span>
                      </div>
                    )}
                    <div className="card-poster-gradient" />
                    <div className="card-badges">
                      <span
                        className={`pill status ${movie.status
                          ?.toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {movie.status || "Watching"}
                      </span>
                      {isUpcomingMovie(movie) && <span className="pill">Upcoming</span>}
                    </div>
                    <div className="card-poster-copy">
                      <p className="eyebrow">{movie.category || "Title"}</p>
                      <h3>{movie.title}</h3>
                      <p className="tiny muted">Click for details</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {detailMovie && (
        <div className="movie-modal-backdrop" onClick={closeDetails} role="presentation">
          <div
            className="movie-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${detailMovie.title} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={closeDetails} aria-label="Close details">
              ×
            </button>
            <div className="movie-modal-body">
              {detailMovie.poster && (
                <img src={detailMovie.poster} alt={detailMovie.title} className="movie-modal-poster" />
              )}
              <div className="movie-modal-copy">
                <p className="eyebrow">{detailMovie.category || "Title"}</p>
                <h2>{detailMovie.title}</h2>
                <div className="movie-modal-meta">
                  <span className="pill">Release: {detailMovie.releaseDate}</span>
                  {detailMovie.rating > 0 && (
                    <span className="pill rating-pill">★ {detailMovie.rating.toFixed(1)}</span>
                  )}
                  {detailMovie.languageLabel && <span className="pill">{detailMovie.languageLabel}</span>}
                </div>
                <p className="movie-modal-story">{detailMovie.detailSummary}</p>

                {detailMovie.nextEpisode && (
                  <div className="next-episode">
                    <p className="tiny">
                      <strong>Next ep:</strong> {detailMovie.nextEpisode.name}
                    </p>
                    <p className="tiny muted">
                      S{detailMovie.nextEpisode.seasonNumber}E{detailMovie.nextEpisode.episodeNumber} • {detailMovie.nextEpisode.airDate}
                    </p>
                  </div>
                )}

                {detailMovie.nextPart && (
                  <div className="next-episode">
                    <p className="tiny">
                      <strong>Next part:</strong> {detailMovie.nextPart.title}
                    </p>
                    {detailMovie.nextPart.airDate && (
                      <p className="tiny muted">Release: {detailMovie.nextPart.airDate}</p>
                    )}
                  </div>
                )}

                <div className="movie-modal-actions">
                  <button
                    type="button"
                    className={`heart ${detailMovie.isFavorite ? "active" : ""}`}
                    onClick={() => handleToggleFavorite(detailMovie.id, detailMovie.isFavorite)}
                  >
                    {detailMovie.isFavorite ? "♥ Favorite" : "♡ Favorite"}
                  </button>
                  <button type="button" className="ghost" onClick={() => handleSyncOne(detailMovie)}>
                    Refresh TMDB
                  </button>
                  <button type="button" className="ghost danger" onClick={() => handleDelete(detailMovie.id)}>
                    Remove
                  </button>
                </div>

                <div className="status-row movie-modal-status-row">
                  {TRACKING_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={st === detailMovie.status ? "chip active" : "chip"}
                      onClick={() => handleStatusChange(detailMovie.id, st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
