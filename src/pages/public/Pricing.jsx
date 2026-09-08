import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import PricingSection from "../../components/landing/Pricing";

export default function Pricing() {
  return (
    <>
      <Navbar />

      <main className="page-top">
        <PricingSection />
      </main>

      <Footer />
    </>
  );
}