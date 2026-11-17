import { useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminGenerateOrders() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function generateOrders() {
    if (!supabase) { setMessage("Supabase कनेक्शन नहीं मिला।"); return; }
    const confirmed = window.confirm("क्या आप उपलब्ध Active Subscriptions के लिए आज के Delivery Orders बनाना चाहते हैं?");
    if (!confirmed) return;

    setLoading(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("admin_generate_daily_orders");
      if (error) throw error;
      setMessage("Daily Orders बनाने की प्रक्रिया सफलतापूर्वक पूरी हुई। Delivery Management में ऑर्डर Refresh करके देखें।");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "अज्ञात समस्या";
      setMessage("ऑर्डर नहीं बने: " + detail + " अगर Function उपलब्ध नहीं है, तो Database में admin_generate_daily_orders RPC बनानी होगी।");
    } finally { setLoading(false); }
  }

  return (
    <section style={{ padding: 16, border: "1px solid #e3e9e3", borderRadius: 12, background: "#fffdf8", margin: "12px 0" }}>
      <h3 style={{ marginTop: 0 }}>Daily Delivery Orders</h3>
      <p style={{ color: "#66766e" }}>Active Subscriptions के आधार पर आज के Delivery Orders बनाने के लिए उपयोग करें।</p>
      <button type="button" onClick={() => void generateOrders()} disabled={loading} style={{ padding: "11px 16px", border: 0, borderRadius: 9, background: "#1e563f", color: "white", fontWeight: 700, cursor: "pointer" }}>
        {loading ? "ऑर्डर बन रहे हैं..." : "आज के ऑर्डर बनाएँ"}
      </button>
      {message && <p role="status" style={{ marginBottom: 0 }}>{message}</p>}
    </section>
  );
}

