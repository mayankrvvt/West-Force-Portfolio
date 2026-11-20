import { useNavigate } from "react-router-dom";

import AuthLayout from "../../components/layout/AuthLayout";
import Button from "../../components/common/Button";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Payment cancelled"
      lede="No payment was taken. You can go back to pricing whenever you are ready."
    >
      <Button
        size="lg"
        className="full-width"
        onClick={() => navigate("/pricing")}
      >
        Back to pricing
      </Button>
    </AuthLayout>
  );
}
