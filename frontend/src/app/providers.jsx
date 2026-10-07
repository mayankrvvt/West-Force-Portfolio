import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    reason: "",
    planKey: null,
  });

  const openPaymentModal = useCallback((reason, planKey = null) => {
    setPaymentModal({
      open: true,
      reason,
      planKey,
    });
  }, []);

  const closePaymentModal = useCallback(() => {
    setPaymentModal({
      open: false,
      reason: "",
      planKey: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      paymentModal,
      openPaymentModal,
      closePaymentModal,
    }),
    [user, paymentModal, openPaymentModal, closePaymentModal]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider"
    );
  }

  return context;
}