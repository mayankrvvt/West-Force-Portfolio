import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";

import Button from "../common/Button";

export default function Hero() {
  const heroRef = useRef(null);
  const glowRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    const glow = glowRef.current;
    const content = contentRef.current;

    if (!hero || !glow || !content) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      gsap.set(content, {
        opacity: 1,
        y: 0,
      });

      return;
    }

    /* ---------------------------------------------
       HERO ENTRANCE ANIMATION
    --------------------------------------------- */

    const intro = gsap.timeline({
      defaults: {
        ease: "power3.out",
      },
    });

    intro.fromTo(
      content.querySelector(".hero-eyebrow"),
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
      }
    );

    intro.fromTo(
      content.querySelector("h1"),
      {
        opacity: 0,
        y: 45,
      },
      {
        opacity: 1,
        y: 0,
        duration: 1,
      },
      "-=0.3"
    );

    intro.fromTo(
      content.querySelector(".hero-copy"),
      {
        opacity: 0,
        y: 25,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
      },
      "-=0.55"
    );

    intro.fromTo(
      content.querySelector(".hero-actions"),
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
      },
      "-=0.4"
    );

    /* ---------------------------------------------
       INITIAL GLOW
    --------------------------------------------- */

    gsap.set(glow, {
      x: 0,
      y: 0,
      scale: 1,
    });

    /* ---------------------------------------------
       MOUSE INTERACTION
    --------------------------------------------- */

    const handlePointerMove = (event) => {
      const rect = hero.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const moveX = (x - centerX) / 12;
      const moveY = (y - centerY) / 12;

      gsap.to(glow, {
        x: moveX,
        y: moveY,
        scale: 1.08,
        duration: 0.8,
        ease: "power3.out",
        overwrite: true,
      });

      gsap.to(content, {
        x: moveX * 0.12,
        y: moveY * 0.12,
        duration: 1,
        ease: "power3.out",
        overwrite: true,
      });
    };

    const handlePointerLeave = () => {
      gsap.to(glow, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 1,
        ease: "power3.out",
      });

      gsap.to(content, {
        x: 0,
        y: 0,
        duration: 1,
        ease: "power3.out",
      });
    };

    hero.addEventListener("pointermove", handlePointerMove);
    hero.addEventListener("pointerleave", handlePointerLeave);

    /* ---------------------------------------------
       CLEANUP
    --------------------------------------------- */

    return () => {
      hero.removeEventListener("pointermove", handlePointerMove);
      hero.removeEventListener("pointerleave", handlePointerLeave);

      intro.kill();
      gsap.killTweensOf(glow);
      gsap.killTweensOf(content);
    };
  }, []);

  /* ---------------------------------------------
     MAGNETIC BUTTON
  --------------------------------------------- */

  const handleButtonMove = (event) => {
    const button = event.currentTarget;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const rect = button.getBoundingClientRect();

    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    gsap.to(button, {
      x: x * 0.15,
      y: y * 0.15,
      duration: 0.3,
      ease: "power2.out",
    });
  };

  const handleButtonLeave = (event) => {
    gsap.to(event.currentTarget, {
      x: 0,
      y: 0,
      duration: 0.5,
      ease: "elastic.out(1, 0.5)",
    });
  };

  return (
    <section
      ref={heroRef}
      className="hero"
    >
      {/* Animated background glow */}
      <div
        ref={glowRef}
        className="hero-glow"
        aria-hidden="true"
      />

      <div className="container">
        <div
          ref={contentRef}
          className="hero-content"
        >
          <p className="hero-eyebrow">
            WESTFORCE PROFESSIONAL
          </p>

          <h1>
            Your career deserves
            <br />
            more than a resume.
          </h1>

          <p className="hero-copy">
            Build a professional portfolio that brings your
            resume, video, skills, certificates and experience
            together in one secure link — ready to share with
            Canadian employers.
          </p>

          <div className="hero-actions">
            <Link
              to="/auth/sign-up"
              onPointerMove={handleButtonMove}
              onPointerLeave={handleButtonLeave}
            >
              <Button variant="hero">
                Build your portfolio
              </Button>
            </Link>

            <Link
              to="/how-it-works"
              onPointerMove={handleButtonMove}
              onPointerLeave={handleButtonLeave}
            >
              <Button variant="hero-outline">
                See how it works
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}