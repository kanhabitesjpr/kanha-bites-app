import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function CustomerOrderHistory({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    if (!supabase || !user?.id) return;

    setLoading(true);
    setMessage("");

    const { data: household, error: householdError } = await supabase
      .from("households")
      .select("id")
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (householdError || !household) {
      setOrders([]);
      setLoading(false);
      setMessage("अभी आपके खाते में कोई ऑर्डर उपलब्ध नहीं है।");
      return;
    }

    const { data: orderData, error } = await supabase
      .from("delivery_orders")
      .select("id, child_id, delivery_date, meal_slot, status, created_at")
      .eq("household_id", household.id)
      .order("delivery_date", { ascending: false });

    if (error) {
      setMessage("ऑर्डर लोड नहीं हो पाए। कृपया बाद में कोशिश करें।");
      setLoading(false);
      return;
    }

    const childIds = [...new Set((orderData || []).map((o: any) => o.child_id).filter(Boolean))];

    if (childIds.length > 0) {
      const { data: childData } = await supabase
        .from("children")
        .select("id, child_name")
        .in("id", childIds);

      setChildren(childData || []);
    } else {
      setChildren([]);
    }

    setOrders(orderData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "ऑर्डर पेंडिंग",
      assigned: "डिलीवरी बॉय को दिया गया",
      picked_up: "लंच पैक लेकर निकल चुका है",
      delivered: "डिलीवरी पूरी हो गई",
      failed: "डिलीवरी नहीं हो पाई"
    };

    return labels[status] || status;
  }

  return (
    <section style={{ marginTop: 25, padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>📦 मेरे लंच ऑर्डर</h2>

      <button onClick={loadOrders} style={{ padding: 9, marginBottom: 12 }}>
        ↻ Refresh Orders
      </button>

      {loading && <p>ऑर्डर लोड हो रहे हैं...</p>}
      {message && <p>{message}</p>}

      {!loading && orders.length === 0 && !message && (
        <p>अभी कोई ऑर्डर उपलब्ध नहीं है।</p>
      )}

      {orders.map((order) => {
        const child = children.find((c) => c.id === order.child_id);

        return (
          <div key={order.id} style={{ padding: 14, marginBottom: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <h3>{child?.child_name || "बच्चे का नाम उपलब्ध नहीं"}</h3>
            <p>📅 तारीख: {order.delivery_date}</p>
            <p>🍱 मील: {order.meal_slot}</p>
            <p>
              स्टेटस: <strong>{statusLabel(order.status)}</strong>
            </p>
          </div>
        );
      })}
    </section>
  );
}