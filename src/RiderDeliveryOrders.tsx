import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

type DeliveryOrder = {
  id: string;
  delivery_date: string;
  meal_slot: string | null;
  status: string;
  household_id: string | null;
  child_id: string | null;
  address_id: string | null;
  rider_id?: string;
  household?: any;
  child?: any;
  address?: any;
  profile?: any;
};

function openGoogleMaps(address: any) {
  const destination = [address?.address, address?.landmark, address?.city, address?.pincode, "India"].filter(Boolean).join(", ");
  if (!destination.trim()) { window.alert("इस डिलीवरी का पूरा पता उपलब्ध नहीं है।"); return; }
  const url = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(destination) + "&travelmode=driving";
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function RiderDeliveryOrders() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadOrders = useCallback(async () => {
    if (!supabase) { setMessage("Supabase कनेक्शन उपलब्ध नहीं है।"); setLoading(false); return; }
    setLoading(true);
    setMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) { setOrders([]); setMessage("Rider Login नहीं मिला। दोबारा Login करें।"); return; }

      const { data: rider, error: riderError } = await supabase.from("rider_profiles").select("id").eq("user_id", user.id).eq("active", true).maybeSingle();
      if (riderError) throw riderError;
      if (!rider) { setOrders([]); setMessage("आपका Active Rider Profile नहीं मिला। Admin से संपर्क करें।"); return; }

      const { data: deliveryOrders, error: ordersError } = await supabase
        .from("delivery_orders").select("*").eq("rider_id", rider.id)
        .in("status", ["assigned", "picked_up", "out_for_delivery"])
        .order("delivery_date", { ascending: true });
      if (ordersError) throw ordersError;

      const [households, children, addresses, profiles] = await Promise.all([
        supabase.from("households").select("id, parent_user_id, household_name"),
        supabase.from("children").select("id, household_id, child_name, school_name, class_name, section, roll_number"),
        supabase.from("delivery_addresses").select("id, household_id, address, landmark, city, pincode"),
        supabase.from("profiles").select("id, full_name, phone"),
      ]);
      const lookupError = households.error || children.error || addresses.error || profiles.error;
      if (lookupError) throw lookupError;

      const completeOrders = (deliveryOrders || []).map((order: any) => {
        const household = (households.data || []).find((item: any) => item.id === order.household_id);
        const child = (children.data || []).find((item: any) => item.id === order.child_id);
        const address = (addresses.data || []).find((item: any) => item.id === order.address_id);
        const profile = (profiles.data || []).find((item: any) => item.id === household?.parent_user_id);
        return { ...order, household, child, address, profile };
      });
      setOrders(completeOrders);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "डिलीवरी ऑर्डर लोड नहीं हुए।";
      setOrders([]);
      setMessage("समस्या: " + detail);
    } finally { setLoading(false); }
  }, []);

  async function markPickedUp(orderId: string) {
    if (!supabase) return;
    setBusyOrderId(orderId);
    setMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const { data: updatedRows, error: updateError } = await supabase
        .from("delivery_orders").update({ status: "picked_up" }).eq("id", orderId).eq("status", "assigned").select("id");
      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) throw new Error("ऑर्डर Assigned स्थिति में नहीं है या अपडेट की अनुमति नहीं है।");

      const { error: eventError } = await supabase.from("delivery_events").insert({
        order_id: orderId,
        status: "picked_up",
        notes: "Rider ने पैकेट Pickup किया।",
        updated_by: authData.user?.id || null,
      });
      if (eventError) setMessage("Pickup स्थिति अपडेट हुई, लेकिन Event रिकॉर्ड सेव नहीं हुआ: " + eventError.message);
      else setMessage("पैकेट Pickup हो गया।");
      await loadOrders();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Pickup अपडेट नहीं हुआ।";
      setMessage("समस्या: " + detail);
    } finally { setBusyOrderId(null); }
  }

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <div><h2 style={{ margin: 0 }}>मेरी डिलीवरी</h2><p style={{ margin: "5px 0 0", color: "#647067" }}>Assigned और Pickup किए गए पैकेट</p></div>
        <button type="button" onClick={() => void loadOrders()} style={secondaryButtonStyle}>Refresh</button>
      </div>
      {message && <div role="status" style={messageStyle}>{message}</div>}
      {loading ? <p>डिलीवरी ऑर्डर लोड हो रहे हैं...</p> : orders.length === 0 ? <p>अभी आपके नाम कोई Active Delivery Order नहीं है।</p> : orders.map((order) => (
        <article key={order.id} style={orderCardStyle}>
          <div style={sectionHeaderStyle}><h3 style={{ margin: 0 }}>Order #{order.id.slice(0, 8)}</h3><span style={statusStyle}>{order.status}</span></div>
          <p><strong>ग्राहक:</strong> {order.profile?.full_name || "नाम उपलब्ध नहीं"}</p>
          <p><strong>मोबाइल:</strong> {order.profile?.phone || "नंबर उपलब्ध नहीं"}</p>
          <p><strong>बच्चा:</strong> {order.child?.child_name || "उपलब्ध नहीं"}</p>
          {order.child?.school_name && <p><strong>स्कूल:</strong> {order.child.school_name} {order.child?.class_name ? "• Class " + order.child.class_name : ""}{order.child?.section ? "-" + order.child.section : ""}</p>}
          <p><strong>पता:</strong> {order.address?.address || "पता उपलब्ध नहीं"}</p>
          <p><strong>लैंडमार्क:</strong> {order.address?.landmark || "-"}</p>
          <p><strong>शहर / पिनकोड:</strong> {order.address?.city || "-"} / {order.address?.pincode || "-"}</p>
          <p><strong>डिलीवरी तारीख:</strong> {order.delivery_date}</p>
          <p><strong>Meal Slot:</strong> {order.meal_slot || "-"}</p>
          <div style={actionRowStyle}>
            <button type="button" onClick={() => openGoogleMaps(order.address)} style={secondaryButtonStyle}>Google Maps में रास्ता देखें</button>
            {order.status === "assigned" && <button type="button" disabled={busyOrderId === order.id} onClick={() => void markPickedUp(order.id)} style={primaryButtonStyle}>{busyOrderId === order.id ? "अपडेट हो रहा है..." : "पैकेट Pickup किया"}</button>}
          </div>
          {(order.status === "picked_up" || order.status === "out_for_delivery") && <p style={{ color: "#21633c", fontWeight: 600 }}>पैकेट आपके पास है। ग्राहक की निर्धारित पुष्टि लेकर डिलीवरी पूरी करें।</p>}
        </article>
      ))}
    </section>
  );
}

const panelStyle: React.CSSProperties = { background: "#fff", color: "#243329", padding: 18, marginTop: 18, borderRadius: 16, border: "1px solid #e5e9e5" };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 };
const orderCardStyle: React.CSSProperties = { border: "1px solid #e1e7e1", padding: 16, marginTop: 14, borderRadius: 12, background: "#fffefa" };
const statusStyle: React.CSSProperties = { display: "inline-block", padding: "5px 10px", borderRadius: 20, background: "#edf5ee", color: "#21633c", fontSize: 12, fontWeight: 700 };
const actionRowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 };
const primaryButtonStyle: React.CSSProperties = { border: 0, borderRadius: 9, padding: "10px 14px", background: "#1e563f", color: "white", fontWeight: 700, cursor: "pointer" };
const secondaryButtonStyle: React.CSSProperties = { border: "1px solid #cbd8cf", borderRadius: 9, padding: "10px 14px", background: "#f7faf7", color: "#1e563f", fontWeight: 700, cursor: "pointer" };
const messageStyle: React.CSSProperties = { padding: 12, borderRadius: 9, marginTop: 14, background: "#fff4e5", color: "#8a4b10" };

