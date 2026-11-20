import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Section from "../../components/landing/HowItWorks";

export default function HowItWorks() {
  return (
    <>
      <Navbar />

      <main id="main" className="public-page">
        <Section headingLevel={1} />
      </main>

      <Footer />
    </>
  );
}
