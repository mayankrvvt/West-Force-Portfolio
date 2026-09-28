import { useEffect, useRef, useState } from "react";
import { X, PlayCircle } from "lucide-react";

const TUTORIAL_VIDEO_URL =
  import.meta.env.VITE_TUTORIAL_VIDEO_URL || "/how-to-use.mp4";

// Tutorial opens after the user has scrolled 28% of the page.
const SCROLL_TRIGGER = 0.28;

function isYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/.test(url);
}

function getYouTubeEmbedUrl(url) {
  try {
    const parsed = new URL(url);

    let videoId = parsed.searchParams.get("v");

    if (!videoId && parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.replace("/", "");
    }

    if (!videoId && parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1];
    }

    return videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`
      : url;
  } catch {
    return url;
  }
}

export default function ScrollTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  const videoRef = useRef(null);

  /*
   * Detect homepage scrolling.
   */
  useEffect(() => {
    const handleScroll = () => {
      if (hasTriggered) return;

      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (scrollableHeight <= 0) return;

      const progress = window.scrollY / scrollableHeight;

      if (progress >= SCROLL_TRIGGER) {
        setHasTriggered(true);
        setIsOpen(true);
      }
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    // Check immediately in case the user has already scrolled.
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasTriggered]);

  /*
   * Prevent the homepage from scrolling while
   * the tutorial popup is open.
   */
  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove("tutorial-modal-open");

      return undefined;
    }

    document.body.classList.add("tutorial-modal-open");

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("tutorial-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  /*
   * Automatically start the video.
   */
  useEffect(() => {
    if (
      !isOpen ||
      !videoRef.current ||
      isYouTubeUrl(TUTORIAL_VIDEO_URL)
    ) {
      return;
    }

    const video = videoRef.current;

    video.currentTime = 0;

    video.play().catch(() => {
      /*
       * Some browsers can block autoplay.
       * Video controls are still available.
       */
    });
  }, [isOpen]);

  const closeTutorial = () => {
    if (
      videoRef.current &&
      !isYouTubeUrl(TUTORIAL_VIDEO_URL)
    ) {
      videoRef.current.pause();
    }

    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  const youtube = isYouTubeUrl(TUTORIAL_VIDEO_URL);

  return (
    <div
      className="scroll-tutorial-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scroll-tutorial-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeTutorial();
        }
      }}
    >
      <div className="scroll-tutorial-card">

        {/* Close button */}
        <button
          type="button"
          className="scroll-tutorial-close"
          onClick={closeTutorial}
          aria-label="Close tutorial"
        >
          <X size={22} strokeWidth={2.2} />
        </button>

        {/* Heading */}
        <div className="scroll-tutorial-heading">

          <div
            className="scroll-tutorial-icon"
            aria-hidden="true"
          >
            <PlayCircle size={22} />
          </div>

          <div>
            <span>WESTFORCE QUICK GUIDE</span>

            <h2 id="scroll-tutorial-title">
              Learn how to use WestForce
            </h2>

            <p>
              Watch this short walkthrough to see how to
              create your portfolio, upload your documents,
              and use the platform.
            </p>
          </div>

        </div>

        {/* Video */}
        <div className="scroll-tutorial-video-wrap">

          {youtube ? (
            <iframe
              className="scroll-tutorial-video"
              src={getYouTubeEmbedUrl(TUTORIAL_VIDEO_URL)}
              title="How to use WestForce"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              className="scroll-tutorial-video"
              src={TUTORIAL_VIDEO_URL}
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
            />
          )}

        </div>

        {/* Footer */}
        <div className="scroll-tutorial-footer">

          <span>
            Press Esc or click × to close
          </span>

          <button
            type="button"
            onClick={closeTutorial}
          >
            Continue exploring
          </button>

        </div>

      </div>
    </div>
  );
}