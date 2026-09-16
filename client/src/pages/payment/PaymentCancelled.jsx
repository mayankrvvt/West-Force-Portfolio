import { useNavigate } from "react-router-dom";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background:
          "linear-gradient(135deg, #f7fbff, #eef6fb)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          padding: "48px 36px",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow:
            "0 20px 60px rgba(15, 59, 92, 0.12)",
          textAlign: "center",
        }}
      >
        <h1>
          Payment cancelled
        </h1>

        <p>
          No payment was taken. You can
          return to pricing whenever you're
          ready.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/pricing")
          }
          style={{
            marginTop: "20px",
            padding: "12px 24px",
            border: 0,
            borderRadius: "10px",
            background: "#087fbe",
            color: "#ffffff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Back to pricing
        </button>
      </section>
    </main>
  );
}