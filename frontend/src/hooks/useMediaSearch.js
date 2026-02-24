import { useCallback, useMemo, useState } from "react";
import { searchMedia, formatMediaResult, getShowDetails } from "../services/tmdb";

export function useMediaSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const search = useCallback(
    async (searchTerm) => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await searchMedia(searchTerm);
        const formatted = data
          .map(formatMediaResult)
          .filter((r) => r.title)
          .filter((r) => {
            if (categoryFilter === "all") return true;
            return r.contentType === categoryFilter;
          })
          .filter((r) => {
            if (languageFilter === "all") return true;
            return r.language === languageFilter;
          });
        setResults(formatted);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [categoryFilter, languageFilter]
  );

  const debouncedSearch = useMemo(() => {
    let timeoutId;
    return (term) => {
      clearTimeout(timeoutId);
      setQuery(term);
      timeoutId = setTimeout(() => search(term), 300);
    };
  }, [search]);

  const selectMedia = useCallback(
    async (media) => {
      try {
        setLoading(true);
        let nextEpisode = null;

        // If it's a TV show, fetch next episode info
        if (media.mediaType === "tv") {
          const showDetails = await getShowDetails(media.id);
          if (showDetails?.next_episode_to_air) {
            nextEpisode = {
              name: showDetails.next_episode_to_air.name,
              airDate: showDetails.next_episode_to_air.air_date,
              seasonNumber: showDetails.next_episode_to_air.season_number,
              episodeNumber: showDetails.next_episode_to_air.episode_number,
            };
          }
        }

        return {
          ...media,
          nextEpisode,
        };
      } catch (err) {
        console.error("Selection error:", err);
        return media;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    categoryFilter,
    languageFilter,
    setCategoryFilter,
    setLanguageFilter,
    search: debouncedSearch,
    selectMedia,
    clearSearch,
  };
}
