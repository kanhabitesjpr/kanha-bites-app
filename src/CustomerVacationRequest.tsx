import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function CustomerVacationRequest({ user }: { user: any }) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionId, setSubscriptionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSubscriptions() {
      if (!supabase || !user?.id) return;

      const { data: household } = await supabase
        .from("households")
        .select("id")
        .eq("parent_user_id", user.id)
        .maybeSingle();

      if (!household) return;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, start_date, end_date, status")
        .eq("household_id", household.id)
        .in("status", ["active", "pending"]);

      if (!error) setSubscriptions(data || []);
    }

    loadSubscriptions();
  }, [user?.id]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!supabase || !subscriptionId || !fromDate || !toDate) {
      setMessage("कृपया सभी जरूरी जानकारी भरें।");
      return;
    }

    if (toDate < fromDate) {
      setMessage("छुट्टी की अंतिम तारीख, शुरू होने की तारीख से पहले नहीं हो सकती।");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("vacation_requests")
      .insert({
        subscription_id: subscriptionId,
        from_date: fromDate,
        to_date: toDate,
        reason: reason.trim() || null,
        status: "pending"
      });

    if (error) {
      setMessage("रिक्वेस्ट भेजने में समस्या हुई: " + error.message);
    } else {
      setMessage("आपकी छुट्टी की रिक्वेस्ट सफलतापूर्वक भेज दी गई है।");
      setSubscriptionId("");
      setFromDate("");
      setToDate("");
      setReason("");
    }

    setLoading(false);
  }

  return (
    <section style={{ marginTop: 25, padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>🏖️ Lunch Pause / छुट्टी की रिक्वेस्ट</h2>
      <p>बच्चे की छुट्टी के दौरान कुछ दिनों के लिए लंच रोकने की रिक्वेस्ट भेजें।</p>

      {subscriptions.length === 0 ? (
        <p>कोई एक्टिव या पेंडिंग सब्सक्रिप्शन उपलब्ध नहीं है।</p>
      ) : (
        <form onSubmit={submitRequest}>
          <label>सब्सक्रिप्शन चुनें</label>
          <select
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 15px" }}
          >
            <option value="">सब्सक्रिप्शन चुनें</option>
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.start_date} से {sub.end_date}
              </option>
            ))}
          </select>

          <label>छुट्टी शुरू होने की तारीख</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 15px" }}
          />

          <label>छुट्टी समाप्त होने की तारीख</label>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 15px" }}
          />

          <label>कारण (वैकल्पिक)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="जैसे: स्कूल की छुट्टी, बाहर जाना आदि"
            style={{ display: "block", width: "100%", padding: 10, margin: "8px 0 15px" }}
          />
          <button type="submit" disabled={loading} style={{ padding: 12, width: "100%" }}>
            {loading ? "भेज रहे हैं..." : "छुट्टी की रिक्वेस्ट भेजें"}
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </section>
  );
}