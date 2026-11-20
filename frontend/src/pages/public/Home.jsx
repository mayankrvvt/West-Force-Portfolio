import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import Hero from "../../components/landing/Hero";
import FieldsStrip from "../../components/landing/FieldsStrip";
import PortfolioFeatures from "../../components/landing/PortfolioFeatures";
import Outcome from "../../components/landing/Outcome";
import HowItWorks from "../../components/landing/HowItWorks";
import TaglineReveal from "../../components/landing/TaglineReveal";
import EmployerShowcase from "../../components/landing/EmployerShowcase";
import Services from "../../components/landing/Services";
import Pricing from "../../components/landing/Pricing";
import FAQ from "../../components/landing/FAQ";
import CTA from "../../components/landing/CTA";

import ScrollTutorial from "../../components/landing/ScrollTutorial";

export default function Home() {
  const { hash, key } = useLocation();

  // Router navigation does not scroll to a #hash on its own.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash, key]);

  // Bands alternate white and frost, and the page closes on navy:
  // hero, portfolio (frost), outcome, how it works (frost), tagline,
  // employer view (frost), services, pricing (frost), FAQ, closing CTA.
  return (
    <>
      <Navbar />

      <main id="main" className="home-page">
        <Hero />
        <FieldsStrip />
        <PortfolioFeatures />
        <Outcome />
        <HowItWorks tone="frost" />
        <TaglineReveal />
        <EmployerShowcase />
        <Services />
        <Pricing tone="frost" />
        <FAQ />
        <CTA />
      </main>

      <Footer />

      {/*
        Tutorial automatically opens when
        the visitor scrolls down the homepage.
      */}
      <ScrollTutorial />
    </>
  );
}
