import React, { useState } from "react";
import SectionTitle from "./SectionTitle.jsx";

export default function AboutSection({ data }) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const video = data?.video;

  const hasVideo =
    Boolean(video?.url && video.url.trim());

  const openVideo = () => {
    if (!hasVideo) return;

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

            <button
              type="button"
              className={`about-video-card ${
                hasVideo ? "is-clickable" : ""
              }`}
              onClick={openVideo}
              disabled={!hasVideo}
              aria-label={
                hasVideo
                  ? "Play video introduction"
                  : "Video introduction not available"
              }
            >

              {/* BACKGROUND */}
              <div
                className="about-video-placeholder"
                aria-hidden="true"
              />

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
              <span
                className="video-play-button"
                aria-hidden="true"
              >
                <span>▶</span>
              </span>


              {/* LABEL */}
              <span className="video-corner-label">
                {hasVideo ? "WATCH" : "VIDEO"}
              </span>

            </button>

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