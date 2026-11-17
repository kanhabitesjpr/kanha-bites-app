import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminVacationRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadRequests() {
    if (!supabase) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("vacation_requests")
      .select("id, subscription_id, from_date, to_date, reason, status, created_at, reviewed_by")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("रिक्वेस्ट लोड नहीं हुई: " + error.message);
      setRequests([]);
    } else {
      setRequests(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function updateStatus(id: string, status: "approved" | "rejected") {
    if (!supabase) return;

    const { data: authData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("vacation_requests")
      .update({
        status,
        reviewed_by: authData.user?.id || null
      })
      .eq("id", id);

    if (error) {
      setMessage("स्टेटस अपडेट नहीं हुआ: " + error.message);
    } else {
      setMessage(
        status === "approved"
          ? "छुट्टी की रिक्वेस्ट Approve हो गई।"
          : "छुट्टी की रिक्वेस्ट Reject हो गई।"
      );
      await loadRequests();
    }
  }

  return (
    <section style={{ marginTop: 25, padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>🏖️ Vacation Requests Management</h2>

      <button onClick={loadRequests} style={{ padding: 9, marginBottom: 12 }}>
        ↻ Refresh Requests
      </button>

      {loading && <p>रिक्वेस्ट लोड हो रही हैं...</p>}
      {message && <p>{message}</p>}

      {!loading && requests.length === 0 && (
        <p>अभी कोई Vacation Request नहीं है।</p>
      )}

      {requests.map((request) => (
        <div key={request.id} style={{ padding: 14, marginBottom: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          <p><strong>Subscription ID:</strong> {request.subscription_id}</p>
          <p>📅 छुट्टी शुरू: {request.from_date}</p>
          <p>📅 छुट्टी समाप्त: {request.to_date}</p>
          <p>📝 कारण: {request.reason || "नहीं बताया गया"}</p>
          <p>
            स्टेटस: <strong>{request.status}</strong>
          </p>

          {request.status === "pending" && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => updateStatus(request.id, "approved")}
                style={{ padding: 10, background: "#168447", color: "white", border: 0, borderRadius: 6 }}
              >
                ✓ Approve
              </button>

              <button
                onClick={() => updateStatus(request.id, "rejected")}
                style={{ padding: 10, background: "#c62828", color: "white", border: 0, borderRadius: 6 }}
              >
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}