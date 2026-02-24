import { useState, useEffect } from "react";

export function Slideshow({ items }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!items || items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [items]);

  useEffect(() => {
    if (!items?.length) {
      setCurrent(0);
      return;
    }

    if (current >= items.length) {
      setCurrent(0);
    }
  }, [items, current]);

  if (!items || items.length === 0) {
    return (
      <div className="slideshow-empty">
        <p>No updates yet. Add titles to see them here!</p>
      </div>
    );
  }

  const slide = items[current];
  const slideImage = slide.backdrop || slide.poster;

  const next = () => {
    setCurrent((prev) => (prev + 1) % items.length);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div className="slideshow">
      <div className="slide">
        {slideImage && (
          <img src={slideImage} alt={slide.title} className="slide-bg" />
        )}
        <div className="slide-overlay" />
        <div className="slide-content">
          <div>
            <p className="slide-category">{slide.category}</p>
            <h2 className="slide-title">{slide.title}</h2>
            <div className="slide-meta">
              {slide.rating && slide.rating > 0 && (
                <span className="slide-rating">★ {slide.rating.toFixed(1)}/10</span>
              )}
              {slide.releaseLabel && (
                <span className="slide-next">{slide.releaseLabel}</span>
              )}
              {slide.nextEpisode && (
                <span className="slide-next">
                  Next: S{slide.nextEpisode.seasonNumber}E
                  {slide.nextEpisode.episodeNumber} • {slide.nextEpisode.airDate}
                </span>
              )}
              {slide.nextPart && (
                <span className="slide-next">
                  Next: {slide.nextPart.title}
                  {slide.nextPart.airDate ? ` • ${slide.nextPart.airDate}` : ""}
                </span>
              )}
            </div>
            <p className="slide-overview">{slide.overview}</p>
          </div>
          {slide.isFavorite && <div className="fav-badge">♥ Favorite</div>}
        </div>
      </div>

      <div className="slideshow-controls">
        <button onClick={prev} className="slide-btn prev">
          ‹
        </button>
        <div className="slide-dots">
          {items.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${idx === current ? "active" : ""}`}
              onClick={() => setCurrent(idx)}
            />
          ))}
        </div>
        <button onClick={next} className="slide-btn next">
          ›
        </button>
      </div>
    </div>
  );
}
