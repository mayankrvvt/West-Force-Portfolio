import {
  useEffect,
  useState,
} from "react";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

import useAuth from "./useAuth";

export default function useEntitlement() {
  const { user, loading: authLoading } =
    useAuth();

  const [paymentStatus, setPaymentStatus] =
    useState("unpaid");

  const [plan, setPlan] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setPaymentStatus("unpaid");
      setPlan(null);
      setLoading(false);

      return;
    }

    setLoading(true);

    const userRef = doc(
      db,
      "users",
      user.uid
    );

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPaymentStatus("unpaid");
          setPlan(null);
          setLoading(false);

          return;
        }

        const data = snapshot.data();

        setPaymentStatus(
          data.paymentStatus || "unpaid"
        );

        setPlan(data.plan || null);

        setLoading(false);
      },
      (error) => {
        console.error(
          "Entitlement error:",
          error
        );

        setPaymentStatus("unpaid");
        setPlan(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    user,
    authLoading,
  ]);

  return {
    paymentStatus,

    plan,

    isPaid:
      paymentStatus === "paid",

    loading:
      authLoading || loading,
  };
}