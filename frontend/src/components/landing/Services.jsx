import { useRef } from "react";
import {
  ClipboardCheck,
  Handshake,
  HeartHandshake,
  MessagesSquare,
  ShieldCheck,
  Video,
} from "lucide-react";

import { services } from "../../constants/servicesData";
import useRevealOnce from "./useRevealOnce";

const serviceIcons = {
  matching: Handshake,
  coaching: MessagesSquare,
  video: Video,
  assessment: ClipboardCheck,
  verification: ShieldCheck,
  aftercare: HeartHandshake,
};

// Six cards in a 3 column grid; they rise in once, 60ms apart (public.css).
export default function Services() {
  const listRef = useRef(null);
  useRevealOnce(listRef);

  return (
    <section
      id="services"
      className="home-section"
      aria-labelledby="services-title"
    >
      <div className="container">
        <div className="home-section-head">
          <p className="home-kicker">Services</p>

          <h2 id="services-title">
            A team behind your job search
          </h2>

          <p>
            Every plan includes coaching from the WestForce team, for the
            parts of a job search that are hard to do alone.
          </p>
        </div>

        <ul ref={listRef} className="service-list">
          {services.map((service, index) => {
            const Icon = serviceIcons[service.icon];

            return (
              <li key={service.title} style={{ "--i": index }}>
                <span className="service-list-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
