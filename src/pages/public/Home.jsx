import { useRef } from "react";

import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import Hero from "../../components/landing/Hero";
import EmployerShowcase from "../../components/landing/EmployerShowcase";
import Services from "../../components/landing/Services";
import PortfolioFeatures from "../../components/landing/PortfolioFeatures";
import HowItWorks from "../../components/landing/HowItWorks";
import Pricing from "../../components/landing/Pricing";
import CTA from "../../components/landing/CTA";

import useGsapReveal from "../../hooks/useGsapReveal";

export default function Home() {
  const pageRef = useRef(null);

  useGsapReveal(pageRef);

  return (
    <>
      <Navbar />

      <main ref={pageRef} className="home-page">
        {/* Hero */}
        <Hero />

        {/* Employer Showcase */}
        <section data-reveal="up">
          <EmployerShowcase />
        </section>

        {/* Services */}
        <section data-reveal="up">
          <Services />
        </section>

        {/* Portfolio Features */}
        <section data-reveal="up">
          <PortfolioFeatures />
        </section>

        {/* How It Works */}
        <section data-reveal="up">
          <HowItWorks />
        </section>

        {/* Pricing */}
        <section data-reveal="up">
          <Pricing />
        </section>

        {/* Call To Action */}
        <section data-reveal="up">
          <CTA />
        </section>
      </main>

      <Footer />
    </>
  );
}