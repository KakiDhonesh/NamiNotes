import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useMovies } from "../hooks/useMovies";
import { Slideshow } from "../components/Slideshow";

const RELEASE_REMINDER_WINDOW_DAYS = 21;

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

function getReminderLabel(daysUntil) {
  if (daysUntil <= 0) return "Releasing now";
  if (daysUntil === 1) return "Releases tomorrow";
  return `Releases in ${daysUntil} days`;
}

function toHighQualityTmdbImage(url) {
  if (!url) return url;
  return url.replace("/w200", "/w780");
}

export default function Home() {
  const { user } = useAuth();
  const { movies, loading } = useMovies(user?.uid);

  const recentUpdates = useMemo(() => {
    return movies.slice(0, 10);
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

  const upcomingReminders = useMemo(() => {
    const reminders = movies
      .map((movie) => {
        const nextPartDate = toDateOrNull(movie?.nextPart?.airDate);
        const nextEpisodeDate = toDateOrNull(movie?.nextEpisode?.airDate);
        const releaseDate = nextPartDate || nextEpisodeDate;
        if (!releaseDate) return null;

        const daysUntil = getDaysUntil(releaseDate);
        if (daysUntil < 0 || daysUntil > RELEASE_REMINDER_WINDOW_DAYS) {
          return null;
        }

        const releaseType = nextPartDate ? "Next movie part" : "Next episode";
        const releaseTitle = nextPartDate
          ? movie?.nextPart?.title
          : movie?.nextEpisode?.name;

        return {
          id: movie.id,
          title: movie.title,
          poster: movie.poster,
          releaseDate: releaseDate.toISOString().slice(0, 10),
          releaseType,
          releaseTitle,
          label: getReminderLabel(daysUntil),
          daysUntil,
          summary: movie.overview || "Story summary not available yet.",
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return reminders;
  }, [movies]);

  const recentSlides = useMemo(() => {
    return recentUpdates.map((item) => ({
      ...item,
      poster: toHighQualityTmdbImage(item.poster),
      backdrop: item.backdrop || toHighQualityTmdbImage(item.poster),
    }));
  }, [recentUpdates]);

  const upcomingSlides = useMemo(() => {
    return upcomingReminders.map((item) => ({
      id: `upcoming-${item.id}`,
      title: item.title,
      category: item.releaseType,
      poster: toHighQualityTmdbImage(item.poster),
      backdrop: item.backdrop || toHighQualityTmdbImage(item.poster),
      overview: `${item.label}. ${item.summary}`,
      releaseLabel: item.label,
      releaseDate: item.releaseDate,
      nextPart: item.releaseTitle ? { title: item.releaseTitle, airDate: item.releaseDate } : null,
      rating: 0,
      isFavorite: false,
    }));
  }, [upcomingReminders]);

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
                {recentUpdates.length} title{recentUpdates.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Slideshow items={recentSlides} />
          </section>
        )}

        {upcomingSlides.length > 0 && (
          <section className="slideshow-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Upcoming releases</p>
                <h2>Next up</h2>
              </div>
              <p className="muted">
                {upcomingSlides.length} reminder{upcomingSlides.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Slideshow items={upcomingSlides} />
          </section>
        )}

        {upcomingReminders.length > 0 && (
          <section className="panel">
            <div className="panel-head">
              <p className="eyebrow">Release reminders</p>
              <h2>Coming soon</h2>
            </div>
            <div className="reminder-list">
              {upcomingReminders.slice(0, 6).map((item) => (
                <article key={item.id} className="reminder-card">
                  {item.poster && (
                    <img src={item.poster} alt={item.title} className="reminder-poster" />
                  )}
                  <div className="reminder-content">
                    <p className="tiny muted">{item.releaseType}</p>
                    <h4>{item.title}</h4>
                    <p className="tiny">{item.releaseTitle}</p>
                    <p className="pill status watching">{item.label}</p>
                    <p className="tiny muted">Date: {item.releaseDate}</p>
                    <p className="muted">{item.summary.substring(0, 130)}...</p>
                  </div>
                </article>
              ))}
            </div>
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
