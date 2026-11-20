import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

import Hero from "../../components/landing/Hero";
import EmployerShowcase from "../../components/landing/EmployerShowcase";
import Services from "../../components/landing/Services";
import PortfolioFeatures from "../../components/landing/PortfolioFeatures";
import HowItWorks from "../../components/landing/HowItWorks";
import Pricing from "../../components/landing/Pricing";
import CTA from "../../components/landing/CTA";

import ScrollTutorial from "../../components/landing/ScrollTutorial";

export default function Home() {
  const { hash, key } = useLocation();

  // Router navigation does not scroll to a #hash on its own.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [hash, key]);

  return (
    <>
      <Navbar />

      <main id="main" className="home-page">
        <Hero />
        <PortfolioFeatures />
        <HowItWorks />
        <EmployerShowcase />
        <Services />
        <Pricing />
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
