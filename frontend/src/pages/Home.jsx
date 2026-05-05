import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useMovies } from "../hooks/useMovies";
import { Slideshow } from "../components/Slideshow";

const RELEASE_REMINDER_WINDOW_DAYS = 30;

function toDateOrNull(input) {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysUntil(date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function extractPartNumber(title) {
  const normalized = title.toLowerCase();
  const wordMap = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const romanMap = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };

  const partMatch = normalized.match(
    /part\s+([0-9]+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/
  );
  if (partMatch) {
    const token = partMatch[1];
    return wordMap[token] || romanMap[token] || parseInt(token, 10) || 1;
  }

  const trailingRoman = normalized.match(/\b([ivxlcdm]+)\b$/);
  if (trailingRoman) {
    return romanMap[trailingRoman[1]] || 1;
  }

  const trailingNumber = normalized.match(/\b([0-9]+)\b$/);
  if (trailingNumber) {
    return parseInt(trailingNumber[1], 10) || 1;
  }

  return 1;
}

function isUpcomingMovie(movie) {
  const nextPartDate = toDateOrNull(movie?.nextPart?.airDate);
  const nextEpisodeDate = toDateOrNull(movie?.nextEpisode?.airDate);
  const releaseDate = nextPartDate || nextEpisodeDate;
  if (!releaseDate) return false;

  const daysUntil = getDaysUntil(releaseDate);
  return daysUntil > 0 && daysUntil <= RELEASE_REMINDER_WINDOW_DAYS;
}

export default function Home() {
  const { user } = useAuth();
  const { movies, loading } = useMovies(user?.uid);

  const recentUpdates = useMemo(() => {
    const upcoming = movies
      .filter((m) => m.status !== "Completed")
      .filter(isUpcomingMovie);

    const seen = new Map();
    const filtered = upcoming.filter((movie) => {
      const nextPartTitle = movie?.nextPart?.title;
      const nextEpisodeName = movie?.nextEpisode?.name;
      const key = nextPartTitle
        ? `movie-${nextPartTitle}`
        : nextEpisodeName
        ? `episode-${nextEpisodeName}`
        : `title-${movie.tmdbId || movie.title}`;
      const partNumber = extractPartNumber(movie.title);

      const existing = seen.get(key);
      if (!existing || partNumber > existing.partNumber) {
        seen.set(key, { partNumber });
        return true;
      }
      return false;
    });

    return filtered;
  }, [movies]);

  const favorites = useMemo(() => {
    return movies.filter((m) => m.isFavorite);
  }, [movies]);

  const watching = useMemo(() => {
    return movies.filter(
      (m) => m.status === "Watching" || m.status === "Waiting for Next Part"
    );
  }, [movies]);

  const completed = useMemo(() => {
    return movies.filter((m) => m.status === "Completed");
  }, [movies]);

  const recentSlides = useMemo(() => {
    const seen = new Set();
    return recentUpdates
      .filter((item) => {
        const key = `${item.mediaType || "movie"}-${item.tmdbId || item.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => item)
      .sort((a, b) => {
        const aDate = toDateOrNull(a?.nextPart?.airDate || a?.nextEpisode?.airDate);
        const bDate = toDateOrNull(b?.nextPart?.airDate || b?.nextEpisode?.airDate);

        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;

        return aDate - bDate;
      });
  }, [recentUpdates]);

  if (loading) return <div className="app-shell"><p className="muted">Loading...</p></div>;

  return (
    <div className="app-shell">
      <header className="app-hero home-hero">
        <div>
          <p className="eyebrow">Latest updates tracker</p>
          <h1>NamiNotes</h1>
          <p className="lede">
            Stay updated with your favorite movies, shows, and anime.
          </p>
        </div>
      </header>

      <main className="layout home-layout">
        {recentSlides.length > 0 && (
          <section className="slideshow-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Recent additions</p>
                <h2>What's new</h2>
              </div>
              <p className="muted">
                {recentSlides.length} title{recentSlides.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Slideshow
              items={recentSlides.map((item) => ({
                ...item,
                category: item.category || item.mediaType || "Title",
                releaseLabel:
                  item.nextPart?.airDate || item.nextEpisode?.airDate
                    ? `Release: ${item.nextPart?.airDate || item.nextEpisode?.airDate}`
                    : "Release date not available",
                overview: (item.overview || "Story summary not available yet.").substring(0, 160),
                backdrop: item.backdrop || item.poster,
              }))}
            />
          </section>
        )}

        {favorites.length > 0 && (
          <section className="panel">
            <div className="panel-head">
              <p className="eyebrow">Your favorites</p>
              <h2>Top picks</h2>
            </div>
            <div className="favorites-grid">
              {favorites.map((fav) => (
                <div key={fav.id} className="fav-card">
                  {fav.poster && (
                    <img src={fav.poster} alt={fav.title} />
                  )}
                  <div className="fav-overlay">
                    <div>
                      <h4>{fav.title}</h4>
                      {fav.rating && fav.rating > 0 && (
                        <p className="fav-rating">★ {fav.rating.toFixed(1)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {watching.length > 0 && (
          <section className="panel">
            <div className="panel-head">
              <p className="eyebrow">Currently watching</p>
              <h2>Watching & waiting</h2>
            </div>
            <div className="watching-list">
              {watching.slice(0, 5).map((item) => (
                <div key={item.id} className="watching-item">
                  <div>
                    <h4>{item.title}</h4>
                    {item.nextEpisode && (
                      <p className="tiny muted">
                        Next: S{item.nextEpisode.seasonNumber}E
                        {item.nextEpisode.episodeNumber} • {item.nextEpisode.airDate}
                      </p>
                    )}
                    {item.nextPart && (
                      <p className="tiny muted">
                        Next part: {item.nextPart.title}
                        {item.nextPart.airDate ? ` • ${item.nextPart.airDate}` : ""}
                      </p>
                    )}
                  </div>
                  {item.rating && item.rating > 0 && (
                    <span className="rating">★ {item.rating.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section className="panel">
            <div className="panel-head">
              <p className="eyebrow">Finished titles</p>
              <h2>Completed</h2>
            </div>
            <div className="watching-list">
              {completed.slice(0, 5).map((item) => (
                <div key={item.id} className="watching-item">
                  <div>
                    <h4>{item.title}</h4>
                    <p className="tiny muted">Marked completed from TMDB status</p>
                  </div>
                  {item.rating && item.rating > 0 && (
                    <span className="rating">★ {item.rating.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {recentUpdates.length === 0 && (
          <section className="panel">
            <div className="empty">
              <p>Welcome to NamiNotes!</p>
              <p className="muted">Search and add movies, shows, and anime to get started.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
