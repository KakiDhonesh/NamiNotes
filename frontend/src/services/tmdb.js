// TMDB API service for searching and fetching media details
// Sign up for free at https://www.themoviedb.org/settings/api

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const LANGUAGE_LABELS = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  ml: "Malayalam",
  es: "Spanish",
  fr: "French",
  de: "German",
};

export function getLanguageLabel(languageCode) {
  if (!languageCode) return "Unknown";
  return LANGUAGE_LABELS[languageCode] || languageCode.toUpperCase();
}

const LANGUAGE_LOCALES = {
  en: "en-US",
  ja: "ja-JP",
  ko: "ko-KR",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  ml: "ml-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

const LANGUAGE_REGIONS = {
  hi: "IN",
  ta: "IN",
  te: "IN",
  ml: "IN",
};

export function getSearchOptions(languageCode) {
  if (!languageCode || languageCode === "all") return {};
  return {
    language: LANGUAGE_LOCALES[languageCode] || languageCode,
    region: LANGUAGE_REGIONS[languageCode],
  };
}

// TMDB sometimes returns placeholder/rumored titles without language or dates.
// We drop entries that are missing a valid release/air date or are still in the future.
export function filterValidResults(results = []) {
  const now = new Date();

  return results.filter((result) => {
    const releaseDate = result.release_date || result.first_air_date;
    const parsedDate = toDateValue(releaseDate);
    if (!parsedDate) return false;
    if (parsedDate > now) return false;

    const hasTitle = Boolean(result.title || result.name);
    return hasTitle;
  });
}

function isAnimeResult(result) {
  const genreIds = result.genre_ids || [];
  const isAnimation = genreIds.includes(16);
  const isJapanese = result.original_language === "ja";
  return isAnimation && isJapanese;
}

export async function searchMedia(query, mediaType = "multi", options = {}) {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: query,
      page: "1",
    });
    if (options.language) params.set("language", options.language);
    if (options.region) params.set("region", options.region);

    const response = await fetch(`${TMDB_BASE_URL}/search/${mediaType}?${params.toString()}`);

    if (!response.ok) throw new Error("Search failed");

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function getShowDetails(showId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}&append_to_response=next_episode_to_air`
    );

    if (!response.ok) throw new Error("Failed to fetch show details");

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

export async function getMovieDetails(movieId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=release_dates`
    );

    if (!response.ok) throw new Error("Failed to fetch movie details");

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

export async function getCollectionDetails(collectionId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/collection/${collectionId}?api_key=${TMDB_API_KEY}`
    );

    if (!response.ok) throw new Error("Failed to fetch collection details");

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

function toDateValue(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getMovieTrackingState(movie, collection) {
  const now = new Date();
  const movieReleaseAt = toDateValue(movie?.release_date);

  if (movieReleaseAt && movieReleaseAt > now) {
    return {
      status: "Waiting for Next Part",
      nextPart: {
        id: movie.id,
        title: movie.title,
        airDate: movie.release_date || "",
      },
      hasUpcomingPart: true,
    };
  }

  const parts = (collection?.parts || [])
    .filter((part) => part.id !== movie.id)
    .map((part) => ({
      id: part.id,
      title: part.title,
      releaseDate: part.release_date || "",
      releaseAt: toDateValue(part.release_date),
    }))
    .filter((part) => part.releaseAt)
    .sort((a, b) => a.releaseAt - b.releaseAt);

  const upcomingPart = parts.find((part) => part.releaseAt > now) || null;

  if (upcomingPart) {
    return {
      status: "Waiting for Next Part",
      nextPart: {
        id: upcomingPart.id,
        title: upcomingPart.title,
        airDate: upcomingPart.releaseDate,
      },
      hasUpcomingPart: true,
    };
  }

  return {
    status: "Completed",
    nextPart: null,
    hasUpcomingPart: false,
  };
}

function getShowTrackingState(showDetails) {
  if (!showDetails) {
    return {
      status: "Watching",
      nextEpisode: null,
      hasUpcomingPart: false,
    };
  }

  if (showDetails?.next_episode_to_air) {
    return {
      status: "Waiting for Next Part",
      nextEpisode: {
        name: showDetails.next_episode_to_air.name,
        airDate: showDetails.next_episode_to_air.air_date,
        seasonNumber: showDetails.next_episode_to_air.season_number,
        episodeNumber: showDetails.next_episode_to_air.episode_number,
      },
      hasUpcomingPart: true,
    };
  }

  const endedOrCanceled = ["Ended", "Canceled"].includes(showDetails.status);

  if (endedOrCanceled) {
    return {
      status: "Completed",
      nextEpisode: null,
      hasUpcomingPart: false,
    };
  }

  return {
    status: showDetails?.in_production ? "Waiting for Next Part" : "Watching",
    nextEpisode: null,
    hasUpcomingPart: Boolean(showDetails?.in_production),
  };
}

export async function getTrackingSnapshot(mediaType, tmdbId) {
  if (!tmdbId) {
    return {
      status: "Watching",
      nextEpisode: null,
      nextPart: null,
      hasUpcomingPart: false,
    };
  }

  if (mediaType === "tv") {
    const showDetails = await getShowDetails(tmdbId);
    const state = getShowTrackingState(showDetails);
    return {
      ...state,
      nextPart: null,
      inProduction: Boolean(showDetails?.in_production),
      showStatus: showDetails?.status || "",
    };
  }

  const movieDetails = await getMovieDetails(tmdbId);
  if (!movieDetails) {
    return {
      status: "Watching",
      nextEpisode: null,
      nextPart: null,
      hasUpcomingPart: false,
    };
  }

  const collectionId = movieDetails?.belongs_to_collection?.id;
  const collection = collectionId ? await getCollectionDetails(collectionId) : null;
  const movieState = getMovieTrackingState(movieDetails, collection);

  return {
    ...movieState,
    nextEpisode: null,
    collectionName: movieDetails?.belongs_to_collection?.name || "",
  };
}

export function formatMediaResult(result) {
  const isShow = result.media_type === "tv" || result.first_air_date;
  const isAnime = isAnimeResult(result);
  const releaseDate = result.release_date || result.first_air_date || "";
  const parsedRelease = toDateValue(releaseDate);
  const title = result.name || result.title || "";
  const originalTitle = result.original_name || result.original_title || "";
  const languageCode = result.original_language || "";
  const releaseLabel = releaseDate || "TBA";
  const yearLabel = parsedRelease ? String(parsedRelease.getFullYear()) : "TBA";

  return {
    id: result.id,
    title,
    originalTitle,
    type: isAnime ? "Anime" : isShow ? "TV / Show" : "Movie",
    contentType: isAnime ? "anime" : isShow ? "tv" : "movie",
    year: yearLabel,
    poster: result.poster_path
      ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
      : null,
    backdrop: result.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${result.backdrop_path}`
      : null,
    overview: result.overview || "",
    releaseDate: releaseLabel,
    mediaType: isShow ? "tv" : "movie",
    language: languageCode,
    languageLabel: getLanguageLabel(languageCode),
    rating: result.vote_average || 0,
  };
}
