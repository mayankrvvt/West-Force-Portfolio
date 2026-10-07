import React, { useEffect, useRef, useState } from "react";
import SectionTitle from "./SectionTitle.jsx";

export default function AboutSection({ data }) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState(null);
  const videoCardRef = useRef(null);
  const previewVideoRef = useRef(null);

  const video =
    data?.video ||
    (data?.videoUrl
      ? {
          url: data.videoUrl,
          title: "Video Introduction",
          description:
            "Get to know me, my experience, and what I bring to the table.",
        }
      : null);

  const hasVideo =
    Boolean(
      video?.url &&
        video.url.trim() &&
        !video.url.trim().startsWith("pending:")
    );
  const videoAspectRatio = videoDimensions
    ? videoDimensions.width / videoDimensions.height
    : 16 / 9;
  const maxCardWidth = videoAspectRatio < 1 ? 300 : 460;
  const cardWidth = Math.min(
    maxCardWidth,
    videoAspectRatio * 480
  );

  const handleVideoMetadata = (event) => {
    const { videoWidth, videoHeight } = event.currentTarget;

    if (videoWidth > 0 && videoHeight > 0) {
      setVideoDimensions({
        width: videoWidth,
        height: videoHeight,
      });
    }
  };

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

  const openVideo = () => {
    if (!hasVideo) return;

    previewVideoRef.current?.pause();
    setIsVideoOpen(true);
  };

  const closeVideo = () => {
    setIsVideoOpen(false);
  };

  return (
    <>
      <section
        id="about"
        className="portfolio-section"
      >

        <SectionTitle
          eyebrow="ABOUT"
          title={data?.title || "About Me"}
          description="A quick introduction and a closer look at my professional journey."
        />

        <div className="about-grid">

          {/* ABOUT TEXT */}
          <div className="about-description">
            <p>
              {data?.description ||
                "Experienced professional with a strong background in construction project management."}
            </p>
          </div>


          {/* VIDEO INTRODUCTION */}
          <div className="about-video-wrap">

            <div
              ref={videoCardRef}
              className={`about-video-card ${
                hasVideo ? "is-clickable" : ""
              }`}
              style={{
                "--video-card-width": `${cardWidth}px`,
                "--video-aspect-ratio": videoDimensions
                  ? `${videoDimensions.width} / ${videoDimensions.height}`
                  : "16 / 9",
              }}
            >

              {/* BACKGROUND */}
              <div
                className="about-video-placeholder"
                aria-hidden="true"
              />

              {hasVideo && (
                <video
                  ref={previewVideoRef}
                  className="about-video-preview"
                  src={video.url}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={handleVideoMetadata}
                  poster={video?.poster || undefined}
                  aria-hidden="true"
                />
              )}

              {/* OVERLAY */}
              <div
                className="about-video-overlay"
                aria-hidden="true"
              />


              {/* CONTENT */}
              <div className="about-video-content">

                <span className="video-eyebrow">
                  INTRODUCTION
                </span>

                <strong>
                  {video?.title || "Video Introduction"}
                </strong>

                <span className="video-description">
                  {video?.description ||
                    "Get to know me, my experience, and what I bring to the table."}
                </span>

              </div>


              {/* PLAY BUTTON */}
              <button
                type="button"
                className="video-play-button"
                aria-label="Play video introduction with sound"
                onClick={openVideo}
                disabled={!hasVideo}
              >
                <span>▶</span>
              </button>


              {/* LABEL */}
              <span className="video-corner-label">
                {hasVideo ? "WATCH" : "VIDEO"}
              </span>

            </div>

          </div>

        </div>

      </section>


      {/* VIDEO MODAL */}
      {isVideoOpen && hasVideo && (

        <div
          className="video-modal"
          role="dialog"
          aria-modal="true"
          aria-label={
            video?.title || "Video Introduction"
          }
          onClick={closeVideo}
        >

          <div
            className="video-modal-inner"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="video-modal-close"
              onClick={closeVideo}
              aria-label="Close video"
            >
              ×
            </button>

            <video
              className="about-video-player"
              src={video.url}
              controls
              autoPlay
              playsInline
              poster={
                video?.poster ||
                undefined
              }
            />

          </div>

        </div>

      )}

    </>
  );
}