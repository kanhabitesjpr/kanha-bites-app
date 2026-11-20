
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  async function loadPayments() {
    if (!supabase) {
      setMessage("Database connection नहीं मिला।");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("payment_submissions")
      .select("id, subscription_id, amount, utr_number, screenshot_path, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Payments लोड नहीं हुए: " + error.message);
    } else {
      setPayments(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadPayments();
  }, []);

  async function updateStatus(id: string, status: string) {
    if (!supabase) return;

    setUpdating(id);
    setMessage("");

    try {
      if (status === "verified") {
        const { error } = await supabase.rpc(
          "admin_approve_payment",
          { p_payment_id: id }
        );

        if (error) throw error;

        setMessage("पेमेंट Approve हो गया और Subscription Active हो गया! 🎉");
      } else {
        const { data: authData } = await supabase.auth.getUser();

        const { error } = await supabase
          .from("payment_submissions")
          .update({
            status: "rejected",
            verified_by: authData.user?.id ?? null,
            verified_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("status", "pending");

        if (error) throw error;

        setMessage("पेमेंट Reject कर दिया गया।");
      }

      await loadPayments();
    } catch (error: any) {
      setMessage("अपडेट नहीं हुआ: " + error.message);
    } finally {
      setUpdating(null);
    }
  }
  async function viewScreenshot(paymentId: string, filePath: string) {
    if (!supabase) {
      setMessage("Supabase कनेक्शन उपलब्ध नहीं है।");
      return;
    }
    const { data, error } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(filePath, 300);
  
    if (error) {
      setMessage("स्क्रीनशॉट नहीं खुला: " + error.message);
      return;
    }
  
    setSignedUrls((prev) => ({
      ...prev,
      [paymentId]: data.signedUrl,
    }));
  }
  return (
    <div style={containerStyle}>
      <h2>💳 Payment Verification</h2>

      <button onClick={loadPayments} style={refreshStyle}>
        Refresh Payments
      </button>

      {loading ? (
        <p>पेमेंट लोड हो रहे हैं...</p>
      ) : payments.length === 0 ? (
        <p>अभी कोई पेमेंट जमा नहीं हुआ है।</p>
      ) : (
        payments.map((payment) => (
          <div key={payment.id} style={cardStyle}>
            <h3>₹{payment.amount}</h3>
            <p><strong>UTR:</strong> {payment.utr_number}</p>
            <p><strong>Subscription ID:</strong> {payment.subscription_id}</p>
            <p><strong>Status:</strong> {payment.status}</p>
            <p>
              <strong>Date:</strong>{" "}
              {new Date(payment.created_at).toLocaleString("en-IN")}
            </p>

            {payment.screenshot_path && (
  <p>
    {signedUrls[payment.id] ? (
      <a
        href={signedUrls[payment.id]}
        target="_blank"
        rel="noreferrer"
      >
        पेमेंट स्क्रीनशॉट खोलें
      </a>
    ) : (
      <button
        onClick={() =>
          viewScreenshot(payment.id, payment.screenshot_path)
        }
      >
        पेमेंट स्क्रीनशॉट देखें
      </button>
    )}
  </p>
)}

            {payment.status === "pending" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={updating === payment.id}
                  onClick={() => updateStatus(payment.id, "verified")}
                  style={approveStyle}
                >
                  Approve
                </button>

                <button
                  disabled={updating === payment.id}
                  onClick={() => updateStatus(payment.id, "rejected")}
                  style={rejectStyle}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {message && <p>{message}</p>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 750,
  margin: "20px auto",
  padding: 20,
  background: "#fff7ed",
  borderRadius: 14,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 15,
  marginBottom: 15,
  border: "1px solid #ead7c5",
  borderRadius: 10,
};

const refreshStyle: React.CSSProperties = {
  padding: 10,
  marginBottom: 15,
  cursor: "pointer",
};

const approveStyle: React.CSSProperties = {
  padding: 10,
  background: "#166534",
  color: "white",
  border: 0,
  borderRadius: 7,
};

const rejectStyle: React.CSSProperties = {
  padding: 10,
  background: "#b91c1c",
  color: "white",
  border: 0,
  borderRadius: 7,
};


