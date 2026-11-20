import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";

import Routes from "./routes";
import ErrorBoundary from "./ErrorBoundary";

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

        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ScrollProgress />
          </Suspense>
        </ErrorBoundary>

        <Suspense fallback={<div role="status">Loading page...</div>}>
          <ErrorBoundary>
            <Routes />
          </ErrorBoundary>
        </Suspense>

        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <WestForceChatbot />
          </Suspense>
        </ErrorBoundary>

        <PaymentModal />

      </AppProvider>
    </BrowserRouter>
  );
}