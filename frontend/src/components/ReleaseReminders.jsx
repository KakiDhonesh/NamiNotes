export function ReleaseReminders({ items = [] }) {
  if (!items || items.length === 0) {
    return (
      <div className="reminders-empty">
        <p>No upcoming releases.</p>
      </div>
    );
  }

  const getStatusBadge = (item) => {
    const nextDate = item.nextPart?.airDate || item.nextEpisode?.airDate;
    if (!nextDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const releaseDate = new Date(nextDate);
    releaseDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((releaseDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { label: "Released", type: "released" };
    if (daysUntil === 0) return { label: "Releasing now", type: "now" };
    if (daysUntil === 1) return { label: "Releases tomorrow", type: "soon" };
    return { label: `Releases in ${daysUntil} days`, type: "upcoming" };
  };

  return (
    <div className="reminders-container">
      {items.map((item) => {
        const poster = item.poster || item.backdrop;
        const nextEpisode = item.nextEpisode;
        const nextPart = item.nextPart;
        const badge = getStatusBadge(item);

        return (
          <div key={item.id} className="reminder-card">
            <div className="reminder-image">
              {poster && <img src={poster} alt={item.title} />}
            </div>

            <div className="reminder-content">
              <p className="reminder-label">Next episode</p>
              <h4 className="reminder-title">{item.title}</h4>

              <p className="reminder-episode">
                {nextEpisode
                  ? `S${nextEpisode.seasonNumber}E${nextEpisode.episodeNumber} • ${nextEpisode.name}`
                  : nextPart
                  ? nextPart.title
                  : ""}
              </p>

              {badge && (
                <div className={`reminder-badge badge-${badge.type}`}>
                  {badge.label}
                </div>
              )}

              <p className="reminder-date">
                Date: {nextEpisode?.airDate || nextPart?.airDate || "TBA"}
              </p>

              <p className="reminder-description">{item.overview || "No description available."}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
