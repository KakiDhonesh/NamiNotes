import { useState } from "react";
import { useMediaSearch } from "../hooks/useMediaSearch";

export function MediaSearchForm({ onSelect, loading: saving }) {
  const {
    query,
    results,
    loading,
    error,
    categoryFilter,
    languageFilter,
    setCategoryFilter,
    setLanguageFilter,
    search,
    selectMedia,
    clearSearch,
  } = useMediaSearch();
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleSearch = (e) => {
    search(e.target.value);
  };

  const handleSelectResult = async (result) => {
    const full = await selectMedia(result);
    setSelectedMedia(full);
  };

  const handleConfirm = async () => {
    if (!selectedMedia) return;
    await onSelect(selectedMedia);
    setSelectedMedia(null);
    clearSearch();
  };

  const handleCancel = () => {
    setSelectedMedia(null);
    clearSearch();
  };

  if (selectedMedia) {
    return (
      <div className="search-confirm">
        <div className="confirm-card">
          {selectedMedia.poster && (
            <img src={selectedMedia.poster} alt={selectedMedia.title} />
          )}
          <div className="confirm-content">
            <h3>{selectedMedia.title}</h3>
            <p className="meta">
              {selectedMedia.type} • {selectedMedia.languageLabel} • {selectedMedia.year}
            </p>
            {selectedMedia.overview && (
              <p className="muted">{selectedMedia.overview.substring(0, 100)}...</p>
            )}
            {selectedMedia.nextEpisode && (
              <div className="next-ep">
                <p className="tiny">
                  Next: {selectedMedia.nextEpisode.name}
                </p>
                <p className="tiny muted">
                  S{selectedMedia.nextEpisode.seasonNumber}E
                  {selectedMedia.nextEpisode.episodeNumber} •{" "}
                  {selectedMedia.nextEpisode.airDate}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="confirm-actions">
          <button className="ghost" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Adding..." : "Add to tracker"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-wrapper">
      <div className="search-filters">
        <select
          className="search-input"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            search(query);
          }}
        >
          <option value="all">All categories</option>
          <option value="movie">Movies</option>
          <option value="tv">TV / Shows</option>
          <option value="anime">Anime</option>
        </select>

        <select
          className="search-input"
          value={languageFilter}
          onChange={(e) => {
            setLanguageFilter(e.target.value);
            search(query);
          }}
        >
          <option value="all">All languages</option>
          <option value="en">English</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="hi">Hindi</option>
          <option value="ta">Tamil</option>
          <option value="te">Telugu</option>
          <option value="ml">Malayalam</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
        </select>
      </div>

      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search movies, shows, anime..."
        className="search-input"
      />

      {error && <p className="error-text">{error}</p>}

      {loading && <p className="muted">Searching...</p>}

      {results.length > 0 && (
        <div className="search-results">
          {results.slice(0, 6).map((result) => (
            <button
              key={result.id}
              type="button"
              className="result-item"
              onClick={() => handleSelectResult(result)}
            >
              {result.poster && (
                <img src={result.poster} alt={result.title} />
              )}
              <div className="result-text">
                <p className="result-title">{result.title}</p>
                <p className="result-meta">
                  {result.type} • {result.languageLabel} • {result.year}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && !error && (
        <p className="muted">No results found</p>
      )}
    </div>
  );
}
