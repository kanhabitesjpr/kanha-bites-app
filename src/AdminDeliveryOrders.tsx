
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminDeliveryOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    if (!supabase) return;

    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("delivery_orders")
      .select("*")
      .order("delivery_date", { ascending: false })
      .limit(100);

    const { data: riderData, error: riderError } = await supabase
      .from("rider_profiles")
      .select("id, rider_code, user_id")
      .eq("active", true);

    if (orderError) setMessage("ऑर्डर लोड नहीं हुए: " + orderError.message);
    else setOrders(orderData || []);

    if (riderError) setMessage("राइडर लोड नहीं हुए: " + riderError.message);
    else setRiders(riderData || []);

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function updateOrder(id: string, changes: any) {
    if (!supabase) return;

    const { error } = await supabase
      .from("delivery_orders")
      .update(changes)
      .eq("id", id);

    if (error) {
      setMessage("अपडेट नहीं हुआ: " + error.message);
    } else {
      setMessage("डिलीवरी ऑर्डर अपडेट हो गया।");
      await loadData();
    }
  }

  return (
    <div style={containerStyle}>
      <h2>🚚 Delivery Management</h2>

      <button onClick={loadData} style={buttonStyle}>
        Refresh Orders
      </button>

      {loading && <p>लोड हो रहा है...</p>}

      {orders.length === 0 && !loading && (
        <p>अभी कोई डिलीवरी ऑर्डर उपलब्ध नहीं है।</p>
      )}

      {orders.map((order) => (
        <div key={order.id} style={cardStyle}>
          <h3>Order: {order.id.slice(0, 8)}</h3>

          <p>Delivery Date: {order.delivery_date}</p>
          <p>Meal Slot: {order.meal_slot}</p>
          <p>Order Source: {order.order_source}</p>
          <p>Status: <strong>{order.status}</strong></p>

          <label>राइडर असाइन करें</label>
          <select
            value={order.rider_id || ""}
            onChange={(e) =>
              updateOrder(order.id, {
                rider_id: e.target.value || null,
                fulfillment_by: e.target.value ? "rider" : null,
                status: e.target.value ? "assigned" : "pending",
              })
            }
            style={inputStyle}
          >
            <option value="">राइडर चुनें</option>
            {riders.map((rider) => (
              <option key={rider.id} value={rider.id}>
                {rider.rider_code || rider.user_id}
              </option>
            ))}
          </select>

          <label>डिलीवरी स्टेटस</label>
          <select
            value={order.status || "pending"}
            onChange={(e) =>
              updateOrder(order.id, { status: e.target.value })
            }
            style={inputStyle}
          >
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
           
            <option value="failed">Failed</option>
          </select>
        </div>
      ))}

      {message && <p>{message}</p>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: "20px auto",
  padding: 20,
  background: "#eff6ff",
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
  padding: 12,
  margin: "8px 0 15px",
  borderRadius: 8,
  border: "1px solid #ccc",
};

const buttonStyle: React.CSSProperties = {
  padding: 12,
  background: "#1d4ed8",
  color: "white",
  border: 0,
  borderRadius: 8,
};

