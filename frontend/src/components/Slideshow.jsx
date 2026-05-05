import { useState, useEffect } from "react";

export function Slideshow({ items = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!items.length) return;

    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(id);
  }, [items.length]);

  if (!items.length) {
    return (
      <div className="slideshow-empty">
        <p>No updates yet. Add titles to see them here!</p>
      </div>
    );
  }

  const slideImage = (item) => item.backdrop || item.poster;

  const next = () => {
    setCurrent((prev) => (prev + 1) % items.length);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div className="slideshow carousel-container">
      <div className="carousel-viewport">
        <div
          className="carousel-track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((item) => (
            <div key={item.id} className="carousel-slide">
              <div className="movie-card">
                <div className="movie-card-image">
                  {slideImage(item) && (
                    <img
                      src={slideImage(item)}
                      alt={item.title}
                      className="movie-img"
                    />
                  )}
                </div>

                <div className="movie-card-content">
                  <p className="slide-category">{item.category}</p>
                  <h3 className="slide-title">{item.title}</h3>

                  <div className="slide-meta">
                    {item.rating && item.rating > 0 && (
                      <span className="slide-rating">★ {item.rating.toFixed(1)}/10</span>
                    )}
                    {item.releaseLabel && (
                      <span className="slide-next">{item.releaseLabel}</span>
                    )}
                  </div>

                  <p className="slide-overview">{item.overview}</p>
                </div>

                {item.isFavorite && <div className="fav-badge">♥ Favorite</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="slideshow-controls carousel-footer">
        <button onClick={prev} className="slide-btn prev">‹</button>

        <div className="slide-dots">
          {items.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === current ? "active" : ""}`}
              onClick={() => setCurrent(index)}
            />
          ))}
        </div>

        <button onClick={next} className="slide-btn next">›</button>
      </div>
    </div>
  );
}
