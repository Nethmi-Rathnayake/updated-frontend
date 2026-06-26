import React, { useState, useEffect } from "react";
import logo from "../../assets/usjp-logo__1_-removebg-preview.png";
import poolImg from "../../assets/swiming pool image.jpg";
import universityImg from "../../assets/university image3.jpg";
import image2 from "../../assets/image2.png";
import sportsIntro from "../../assets/sports-intro-image.jpg";

// Hero images for the left-panel carousel — all bundled local assets, so the
// slideshow works fully offline. Images rotate automatically every 5 seconds.
const HERO_IMAGES = [universityImg, image2, sportsIntro, poolImg];

// How long each hero image stays before fading to the next (ms).
const HERO_INTERVAL_MS = 5000;

// Shared split-screen auth layout: a branded rotating image carousel on the
// left (desktop only) and a centered content slot on the right. Used by the
// login page, the registration chooser, and the registration OTP gates so they
// all share one consistent design.
export default function AuthShell({ children }) {
  // Index of the hero image currently shown on the left panel.
  const [heroIndex, setHeroIndex] = useState(0);

  // Advance the hero carousel every HERO_INTERVAL_MS (5s), wrapping around.
  useEffect(() => {
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_IMAGES.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex m-0">
      {/* LEFT — branded rotating image carousel (desktop only) */}
      <div className="relative hidden lg:flex flex-col w-1/2 overflow-hidden">
        {/* Cross-fading background images */}
        {HERO_IMAGES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              i === heroIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Readability overlay — kept subtle so the image stays crisp and
            vibrant. A flat ~25% dark layer, plus a slightly stronger fade at the
            top (logo) and bottom (headline) only where white text sits. */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />

        {/* Foreground content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-white">
          <div className="flex items-center gap-4">
            <img src={logo} alt="USJ Logo" className="w-20 h-20 object-contain" />
            <div>
              <p className="font-semibold text-xl leading-tight whitespace-nowrap">
                University of Sri Jayewardenepura
              </p>
              <p className="text-base text-blue-100">Sports Facility Portal</p>
            </div>
          </div>

          <div className="mb-2">
            <h2 className="text-3xl lg:text-5xl font-bold leading-snug mb-4">
              Empowering Sports,
              <br />
              Building Champions
            </h2>
            <p className="text-xl text-blue-100 max-w-md">
              Manage bookings, facilities and sports activities all in one place.
            </p>

            {/* Carousel dots */}
            <div className="flex gap-2 mt-6">
              {HERO_IMAGES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === heroIndex ? "w-7 bg-white" : "w-2.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — page content */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col items-center justify-center px-8 sm:px-12 lg:px-16 py-6 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
