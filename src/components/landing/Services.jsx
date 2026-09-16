import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

import {
  BriefcaseBusiness,
  UsersRound,
  Video,
  ChartNoAxesColumnIncreasing,
  GraduationCap,
  Plane,
  ShieldCheck,
  HandHeart,
  LockKeyhole,
  ArrowUpRight,
} from "lucide-react";

import { services } from "../../constants/servicesData";

const serviceIcons = [
  BriefcaseBusiness,
  UsersRound,
  Video,
  ChartNoAxesColumnIncreasing,
  GraduationCap,
  Plane,
  ShieldCheck,
  HandHeart,
  LockKeyhole,
];

export default function Services() {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const cards = section.querySelectorAll(".service-card");

    const cleanups = [];

    cards.forEach((card) => {
      const rotateXTo = gsap.quickTo(card, "rotationX", {
        duration: 0.35,
        ease: "power3.out",
      });

      const rotateYTo = gsap.quickTo(card, "rotationY", {
        duration: 0.35,
        ease: "power3.out",
      });

      const yTo = gsap.quickTo(card, "y", {
        duration: 0.35,
        ease: "power3.out",
      });

      const handlePointerMove = (event) => {
        const rect = card.getBoundingClientRect();

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const percentX = x / rect.width;
        const percentY = y / rect.height;

        const rotateY = (percentX - 0.5) * 8;
        const rotateX = (0.5 - percentY) * 8;

        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);

        rotateXTo(rotateX);
        rotateYTo(rotateY);
        yTo(-8);
      };

      const handlePointerLeave = () => {
        rotateXTo(0);
        rotateYTo(0);
        yTo(0);

        card.style.removeProperty("--mouse-x");
        card.style.removeProperty("--mouse-y");
      };

      card.addEventListener(
        "pointermove",
        handlePointerMove
      );

      card.addEventListener(
        "pointerleave",
        handlePointerLeave
      );

      cleanups.push(() => {
        card.removeEventListener(
          "pointermove",
          handlePointerMove
        );

        card.removeEventListener(
          "pointerleave",
          handlePointerLeave
        );
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="services-section"
    >
      <div className="container">

        <div className="services-heading">
          <p className="eyebrow">
            OUR SERVICES
          </p>

          <h2>
            Everything you need to move your career forward.
          </h2>

          <p>
            From employer matching to credential guidance,
            WestForce brings your professional journey
            together in one place.
          </p>
        </div>

        <div className="services-grid">
          {services.map((service, index) => {
            const Icon = serviceIcons[index];

            return (
              <article
                key={service.title}
                className="service-card"
              >
                <div
                  className="service-card-glow"
                  aria-hidden="true"
                />

                <div className="service-icon">
                  <Icon
                    size={24}
                    strokeWidth={2}
                  />
                </div>

                <div className="service-card-content">
                  <span className="service-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3>{service.title}</h3>

                  <p>{service.description}</p>
                </div>

                <div className="service-arrow">
                  <ArrowUpRight
                    size={17}
                    strokeWidth={2}
                  />
                </div>
              </article>
            );
          })}
        </div>

      </div>
    </section>
  );
}