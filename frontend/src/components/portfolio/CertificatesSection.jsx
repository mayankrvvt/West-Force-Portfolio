import React from "react";
import { BadgeCheck } from "lucide-react";
import SectionTitle from "./SectionTitle";

/*
 * Certificate names right after About, so an employer sees them without
 * the PIN. The files themselves stay in Documents.
 */
export default function CertificatesSection({
  data = [],
  protectionEnabled = false,
}) {
  return (
    <section id="certificates" className="portfolio-section">
      <SectionTitle title="Certificates" />

      <div className="portfolio-section-body">
        <ul className="certificates-list">
          {data.map((certificate, index) => (
            <li
              className="certificate-item"
              key={certificate._id || `${certificate.name}-${index}`}
            >
              <BadgeCheck
                className="certificate-item-icon"
                size={20}
                aria-hidden="true"
              />
              <span>{certificate.name}</span>
            </li>
          ))}
        </ul>

        <p className="certificates-note">
          Copies are in <a href="#documents">Documents</a>
          {protectionEnabled ? " and open with the PIN." : "."}
        </p>
      </div>
    </section>
  );
}
