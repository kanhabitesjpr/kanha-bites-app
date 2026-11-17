import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminDeliveryOTP() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadOrders() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("delivery_orders")
      .select("id, delivery_date, meal_slot, status")
      .in("status", ["pending", "assigned", "picked_up"])
      .order("delivery_date", { ascending: false });

    if (error) {
      setMessage("ऑर्डर लोड नहीं हुए: " + error.message);
    } else {
      setOrders(data || []);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function generateOTP() {
    if (!supabase || !selectedOrder) {
      setMessage("पहले ऑर्डर चुनें।");
      return;
    }

    setLoading(true);
    setMessage("");
    setOtp("");

    const { data, error } = await supabase.rpc(
      "admin_generate_delivery_otp",
      { p_order_id: selectedOrder }
    );

    if (error) {
      setMessage("OTP नहीं बना: " + error.message);
    } else {
      setOtp(String(data));
      setMessage("OTP सफलतापूर्वक बन गया।");
    }

    setLoading(false);
  }

  return (
    <div style={containerStyle}>
      <h2>🔐 Delivery OTP Management</h2>

      <label>डिलीवरी ऑर्डर चुनें</label>

      <select
        value={selectedOrder}
        onChange={(e) => {
          setSelectedOrder(e.target.value);
          setOtp("");
        }}
        style={inputStyle}
      >
        <option value="">ऑर्डर चुनें</option>

        {orders.map((order) => (
          <option key={order.id} value={order.id}>
            {order.id.slice(0, 8)} | {order.delivery_date} | {order.meal_slot}
          </option>
        ))}
      </select>

      <button
        onClick={generateOTP}
        disabled={loading || !selectedOrder}
        style={buttonStyle}
      >
        {loading ? "OTP बन रहा है..." : "Generate 6 Digit OTP"}
      </button>

      {otp && (
        <div style={otpStyle}>
          <h3>Delivery OTP</h3>
          <h1>{otp}</h1>
          <p>यह OTP 15 मिनट तक मान्य है।</p>
          <p>इसे संबंधित ग्राहक तक सुरक्षित रूप से पहुँचाएँ।</p>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 750,
  margin: "20px auto",
  padding: 20,
  background: "#f5f3ff",
  borderRadius: 14,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  margin: "10px 0 16px",
  borderRadius: 8,
  border: "1px solid #ccc",
};

const buttonStyle: React.CSSProperties = {
  padding: 12,
  width: "100%",
  background: "#6d28d9",
  color: "white",
  border: 0,
  borderRadius: 8,
};

const otpStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 20,
  textAlign: "center",
  background: "white",
  borderRadius: 12,
  border: "2px solid #8b5cf6",
};