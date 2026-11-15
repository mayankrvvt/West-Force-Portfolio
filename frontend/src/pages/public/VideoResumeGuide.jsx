import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import VideoResumeGuideContent from "../../components/landing/VideoResumeGuide";

export default function VideoResumeGuide() {
  return (
    <>
      <Navbar />

      <main className="page-top">
        <VideoResumeGuideContent />
      </main>

      <Footer />
    </>
  );
}
