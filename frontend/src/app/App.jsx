import { lazy, Suspense, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";

import Routes from "./routes";
import ErrorBoundary from "./ErrorBoundary";

import { AppProvider, useApp } from "./providers";
import { DEMO_MODE } from "../demo/demoMode";
import DemoBadge from "../demo/DemoBadge";
import SiteStatusProvider from "../components/site/SiteStatusProvider";
import SiteBanner from "../components/site/SiteBanner";
import MaintenanceGate from "../components/site/MaintenanceGate";

// The modal and its Firebase and Stripe code load only when it first opens.
// "Try again" swaps in a fresh lazy import, so a failed chunk is fetched again.
const loadPaymentModal = () =>
  lazy(() => import("../components/common/PaymentModal"));

let PaymentModal = loadPaymentModal();

function PaymentModalLoadError({ onRetry, onClose }) {
  return (
    <div className="payment-load-error" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <p>Could not open the plans. Check your connection and try again.</p>
      <div className="payment-load-error-actions">
        <button type="button" className="payment-load-error-retry" onClick={onRetry}>
          Try again
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function LazyPaymentModal() {
  const { paymentModal, closePaymentModal } = useApp();
  const [attempt, setAttempt] = useState(0);

  if (!paymentModal.open) {
    return null;
  }

  const retry = () => {
    PaymentModal = loadPaymentModal();
    setAttempt((value) => value + 1);
  };

  return (
    <ErrorBoundary
      key={attempt}
      fallback={
        <PaymentModalLoadError onRetry={retry} onClose={closePaymentModal} />
      }
    >
      <Suspense fallback={null}>
        <PaymentModal />
      </Suspense>
    </ErrorBoundary>
  );
}

const WestForceChatbot = lazy(
  () => import("../components/chatbot/WestForceChatbot")
);
const ScrollProgress = lazy(
  () => import("../components/common/ScrollProgress")
);

// Public portfolios belong to the candidate, so our chat helper stays off them
function SiteChatbot() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/portfolio/")) return null;

  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <WestForceChatbot />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <SiteStatusProvider>

          <SiteBanner />

          <MaintenanceGate>

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

            <SiteChatbot />

            <LazyPaymentModal />

          </MaintenanceGate>

          {DEMO_MODE && <DemoBadge />}

        </SiteStatusProvider>
      </AppProvider>
    </BrowserRouter>
  );
}