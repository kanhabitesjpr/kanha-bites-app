import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSubscriptions() {
    if (!supabase) {
      setMessage("Supabase कनेक्ट नहीं है");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const [households, children, plans] = await Promise.all([
      supabase.from("households").select("*"),
      supabase.from("children").select("*"),
      supabase.from("plans").select("*")
    ]);

    if (households.error || children.error || plans.error) {
      setMessage("ग्राहक या प्लान की जानकारी लोड नहीं हुई");
      setLoading(false);
      return;
    }

    const result = (subs || []).map((sub: any) => ({
      ...sub,
      household: (households.data || []).find(
        (h: any) => h.id === sub.household_id
      ),
      child: (children.data || []).find(
        (c: any) => c.id === sub.child_id
      ),
      plan: (plans.data || []).find(
        (p: any) => p.id === sub.plan_id
      )
    }));

    setSubscriptions(result);
    setMessage("");
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: status })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Subscription Status अपडेट हो गया");
    loadSubscriptions();
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  return (
    <section style={{
      background: "white",
      color: "#222",
      padding: 16,
      marginTop: 20,
      borderRadius: 12
    }}>
      <h2>📋 Subscription Management</h2>

      <button onClick={loadSubscriptions}>
        Refresh List
      </button>

      {message && <p>{message}</p>}

      {loading ? (
        <p>Loading subscriptions...</p>
      ) : subscriptions.length === 0 ? (
        <p>अभी कोई Subscription नहीं है।</p>
      ) : (
        subscriptions.map((sub: any) => (
          <div key={sub.id} style={{
            border: "1px solid #ddd",
            padding: 12,
            marginTop: 12,
            borderRadius: 8
          }}>
            <h3>{sub.child?.child_name || "बच्चे का नाम उपलब्ध नहीं"}</h3>

            <p>
              ग्राहक: {sub.household?.household_name || "उपलब्ध नहीं"}
            </p>

            <p>
              प्लान: {sub.plan?.plan_name || "उपलब्ध नहीं"}
            </p>

            <p>फीस: ₹{sub.plan?.price ?? "-"}</p>
            <p>शुरुआत: {sub.start_date || "-"}</p>
            <p>समाप्ति: {sub.end_date || "-"}</p>
            <p>अभी का स्टेटस: <b>{sub.status}</b></p>

            <label>स्टेटस बदलें: </label>

            <select
              value={sub.status || "pending"}
              onChange={(e) =>
                updateStatus(sub.id, e.target.value)
              }
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        ))
      )}
    </section>
  );
}