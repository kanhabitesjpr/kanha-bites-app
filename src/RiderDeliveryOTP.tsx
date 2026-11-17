import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function RiderDeliveryOTP() {
  const [orders, setOrders] = useState<any[]>([]);
  const [otpValues, setOtpValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOrders() {
    if (!supabase) return;

    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setMessage("राइडर लॉगिन नहीं मिला।");
      setLoading(false);
      return;
    }

    const { data: rider, error: riderError } = await supabase
      .from("rider_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (riderError || !rider) {
      setMessage("Active Rider Profile नहीं मिला।");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("delivery_orders")
      .select("id, delivery_date, meal_slot, status")
      .eq("rider_id", rider.id)
      .in("status", ["assigned", "picked_up"])
      .order("delivery_date", { ascending: true });

    if (error) {
      setMessage("ऑर्डर लोड नहीं हुए: " + error.message);
    } else {
      setOrders(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function verifyOTP(orderId: string) {
    if (!supabase) return;

    const otp = otpValues[orderId] || "";

    if (!/^\d{6}$/.test(otp)) {
      setMessage("कृपया 6 अंकों का सही OTP डालें।");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc(
        "rider_verify_delivery_otp",
        {
          p_order_id: orderId,
          p_otp: otp,
        }
      );

      if (error) {
        setMessage("OTP Verify नहीं हुआ: " + error.message);
      } else if (data === true) {
        setOtpValues((old) => ({ ...old, [orderId]: "" }));
        await loadOrders();
        setMessage("डिलीवरी सफलतापूर्वक पूरी हो गई! 🎉");
      } else {
        setMessage("गलत OTP है। कृपया सही 6 अंकों का OTP डालें।");
      }
    } catch {
      setMessage("कुछ समस्या हुई। कृपया दोबारा कोशिश करें।");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={containerStyle}>
      <h2>🔐 Delivery OTP Verification</h2>

      <button onClick={loadOrders} style={buttonStyle}>
        Refresh Orders
      </button>

      {loading && <p>लोड हो रहा है...</p>}

      {!loading && orders.length === 0 && (
        <p>अभी आपके नाम कोई Pending Delivery नहीं है।</p>
      )}

      {orders.map((order) => (
        <div key={order.id} style={cardStyle}>
          <h3>Order: {order.id.slice(0, 8)}</h3>
          <p>Delivery Date: {order.delivery_date}</p>
          <p>Meal Slot: {order.meal_slot}</p>
          <p>Status: {order.status}</p>

          <label>ग्राहक से 6 अंकों का OTP लें</label>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpValues[order.id] || ""}
            onChange={(e) =>
              setOtpValues((old) => ({
                ...old,
                [order.id]: e.target.value.replace(/\D/g, "").slice(0, 6),
              }))
            }
            placeholder="6 Digit OTP"
            style={inputStyle}
          />

          <button
            disabled={loading}
            onClick={() => verifyOTP(order.id)}
            style={verifyButtonStyle}
          >
            Verify OTP & Complete Delivery
          </button>
        </div>
      ))}

      {message && <p>{message}</p>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 750,
  margin: "20px auto",
  padding: 20,
  background: "#ecfdf5",
  borderRadius: 14,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 15,
  marginTop: 15,
  borderRadius: 10,
  border: "1px solid #ddd",
};
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  margin: "10px 0",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 18,
};

const buttonStyle: React.CSSProperties = {
  padding: 10,
  background: "#2563eb",
  color: "white",
  border: 0,
  borderRadius: 8,
};

const verifyButtonStyle: React.CSSProperties = {
  padding: 12,
  width: "100%",
  background: "#166534",
  color: "white",
  border: 0,
  borderRadius: 8,
};