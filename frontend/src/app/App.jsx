import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";

import Routes from "./routes";

import { AppProvider } from "./providers";
import PaymentModal from "../components/common/PaymentModal";

const WestForceChatbot = lazy(
  () => import("../components/chatbot/WestForceChatbot")
);
const ScrollProgress = lazy(
  () => import("../components/common/ScrollProgress")
);

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>

        <Suspense fallback={null}>
          <ScrollProgress />
        </Suspense>

        <Suspense fallback={<div role="status">Loading page...</div>}>
          <Routes />
        </Suspense>

        <Suspense fallback={null}>
          <WestForceChatbot />
        </Suspense>

        <PaymentModal />

      </AppProvider>
    </BrowserRouter>
  );
}