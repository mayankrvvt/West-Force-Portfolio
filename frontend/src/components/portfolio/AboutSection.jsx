import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, X } from "lucide-react";
import SectionTitle from "./SectionTitle.jsx";

const DEFAULT_VIDEO_TITLE = "Video introduction";
const DEFAULT_VIDEO_TEXT = "A short introduction in my own words.";

/*
 * The player can be opened from outside (the hero "Watch intro" button) by
 * passing isVideoOpen and onVideoOpenChange; without them it keeps its own state.
 */
export default function AboutSection({
  data,
  isVideoOpen: openFromParent,
  onVideoOpenChange,
}) {
  const [openHere, setOpenHere] = useState(false);
  const isControlled = typeof onVideoOpenChange === "function";
  const isVideoOpen = isControlled ? Boolean(openFromParent) : openHere;
  const setIsVideoOpen = isControlled ? onVideoOpenChange : setOpenHere;
  const [videoDimensions, setVideoDimensions] = useState(null);
  const videoCardRef = useRef(null);
  const previewVideoRef = useRef(null);
  const closeButtonRef = useRef(null);
  const playButtonRef = useRef(null);

  const video =
    data?.video ||
    (data?.videoUrl
      ? {
          url: data.videoUrl,
          title: DEFAULT_VIDEO_TITLE,
          description: DEFAULT_VIDEO_TEXT,
        }
      : null);

  const hasVideo = Boolean(
    video?.url &&
      video.url.trim() &&
      !video.url.trim().startsWith("pending:")
  );

  const isPortrait = videoDimensions
    ? videoDimensions.width < videoDimensions.height
    : false;

  const handleVideoMetadata = (event) => {
    const { videoWidth, videoHeight } = event.currentTarget;

    if (videoWidth > 0 && videoHeight > 0) {
      setVideoDimensions({
        width: videoWidth,
        height: videoHeight,
      });
    }
  };

  // Play the muted preview only while it is on screen
  useEffect(() => {
    setVideoDimensions(null);

    const card = videoCardRef.current;
    const previewVideo = previewVideoRef.current;

    if (!hasVideo || !card || !previewVideo) {
      return undefined;
    }

    if (!("IntersectionObserver" in window)) {
      return undefined;
    }

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          previewVideo.play().catch((error) => {
            console.warn("Video preview autoplay was blocked:", error);
          });
        } else {
          previewVideo.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(card);

    return () => {
      observer.disconnect();
      previewVideo.pause();
    };
  }, [hasVideo, video?.url]);

  // Escape closes the player; focus moves into it and back again
  useEffect(() => {
    if (!isVideoOpen) return undefined;

    // Focus goes back to whichever button opened the player
    const opener = document.activeElement;
    const playButton = playButtonRef.current;
    closeButtonRef.current?.focus();
    previewVideoRef.current?.pause();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsVideoOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const target =
        opener instanceof HTMLElement && opener !== document.body
          ? opener
          : playButton;
      target?.focus();
    };
  }, [isVideoOpen, setIsVideoOpen]);

  const openVideo = () => {
    if (!hasVideo) return;

    setIsVideoOpen(true);
  };

  const closeVideo = () => {
    setIsVideoOpen(false);
  };

  const videoTitle = video?.title || DEFAULT_VIDEO_TITLE;

  return (
    <>
      <section
        id="about"
        className={`portfolio-section about-section ${
          hasVideo ? "has-video" : ""
        }`}
      >
        <SectionTitle title={data?.title || "About me"} />

        <div className="portfolio-section-body about-layout">
          {hasVideo && (
            <figure
              className={`about-video ${isPortrait ? "is-portrait" : ""}`}
            >
              <div
                ref={videoCardRef}
                className="about-video-card"
                onClick={openVideo}
                style={{
                  "--video-aspect-ratio": videoDimensions
                    ? `${videoDimensions.width} / ${videoDimensions.height}`
                    : "16 / 9",
                }}
              >
                <video
                  ref={previewVideoRef}
                  className="about-video-preview"
                  src={video.url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={handleVideoMetadata}
                  poster={video?.poster || undefined}
                  aria-hidden="true"
                />

                <button
                  ref={playButtonRef}
                  type="button"
                  className="video-play-button"
                  aria-label={`Play ${videoTitle.toLowerCase()} with sound`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openVideo();
                  }}
                >
                  <span className="video-play-icon" aria-hidden="true">
                    <Play size={20} />
                  </span>
                  Watch with sound
                </button>
              </div>

              <figcaption>
                <strong>{videoTitle}</strong>
                <span>{video?.description || DEFAULT_VIDEO_TEXT}</span>
              </figcaption>
            </figure>
          )}

          {data?.description && (
            <p className="about-description wf-read">
              {data.description}
            </p>
          )}
        </div>
      </section>

      {/* VIDEO PLAYER: rendered on body so it always covers the screen */}
      {isVideoOpen &&
        hasVideo &&
        createPortal(
          <div
            className="video-modal"
            role="dialog"
            aria-modal="true"
            aria-label={videoTitle}
            onClick={closeVideo}
          >
            <div
              className="video-modal-inner"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                ref={closeButtonRef}
                type="button"
                className="video-modal-close"
                onClick={closeVideo}
                aria-label="Close video"
              >
                <X size={20} aria-hidden="true" />
              </button>

              <video
                className="about-video-player"
                src={video.url}
                controls
                autoPlay
                playsInline
                poster={video?.poster || undefined}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
