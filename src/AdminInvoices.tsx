import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadInvoices() {
    if (!supabase) {
      setMessage("Database connection नहीं मिला।");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Invoice लोड नहीं हुए: " + error.message);
    } else {
      setInvoices(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadInvoices();
  }, []);

  async function viewInvoice(id: string) {
    if (!supabase) return;

    setDetailLoading(true);
    setMessage("");
    setSelected(null);

    const { data, error } = await supabase.rpc(
      "admin_get_invoice_details",
      { p_invoice_id: id }
    );

    if (error) {
      setMessage("Invoice विवरण नहीं मिले: " + error.message);
    } else {
      setSelected(data);
    }

    setDetailLoading(false);
  }

  return (
    <div style={{ padding: 20, margin: "20px auto", maxWidth: 750 }}>
    <style>{`
    @media print {
    body * {
      visibility: hidden !important;
    }

    .kb-invoice-print,
    .kb-invoice-print * {
      visibility: visible !important;
    }

    .kb-invoice-print {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
      background: white !important;
      color: black !important;
    }

    .kb-no-print {
      display: none !important;
    }
  }
  `}</style>

      <div className="kb-no-print">
        <h2>🧾 KANHA BITES - Invoices</h2>

        <button onClick={loadInvoices}>
          Refresh Invoices
        </button>

        {loading ? (
          <p>Invoices लोड हो रहे हैं...</p>
        ) : invoices.length === 0 ? (
          <p>अभी कोई Invoice उपलब्ध नहीं है।</p>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              style={{
                padding: 15,
                marginTop: 12,
                border: "1px solid #ddd",
                borderRadius: 10
              }}
            >
              <h3>{invoice.invoice_number}</h3>
              <p>राशि: ₹{invoice.amount}</p>
              <p>Invoice Date: {invoice.invoice_date}</p>

              <button
                onClick={() => viewInvoice(invoice.id)}
                disabled={detailLoading}
              >
                Invoice देखें
              </button>
            </div>
          ))
        )}

        {detailLoading && <p>Invoice विवरण लोड हो रहे हैं...</p>}
        {message && <p>{message}</p>}
      </div>

      {selected && (
        <>
          <div className="kb-no-print" style={{ margin: "15px 0" }}>
            <button onClick={() => window.print()}>
              📄 PDF डाउनलोड / Print करें
            </button>
            <button
              onClick={() => setSelected(null)}
              style={{ marginLeft: 10 }}
            >
              वापस जाएँ
            </button>
          </div>

          <div
            className="kb-invoice-print"
            style={{
              background: "white",
              color: "#222",
              padding: 24,
              border: "1px solid #ddd",
              borderRadius: 8
            }}
          >
            <h1 style={{ textAlign: "center", color: "#166534" }}>
              KANHA BITES
            </h1>
            <p style={{ textAlign: "center" }}>
              कमलांचल, मुरलीपुरा, जयपुर
            </p>
            <p style={{ textAlign: "center" }}>
              बच्चों का लंच, आपके घर
            </p>

            <hr />

            <h2>PAYMENT INVOICE</h2>
            <p><strong>Invoice No:</strong> {selected.invoice_number}</p>
            <p><strong>Invoice Date:</strong> {selected.invoice_date}</p>

            <hr />

            <h3>Customer Details</h3>
            <p><strong>Name:</strong> {selected.customer_name || "-"}</p>
            <p><strong>Phone:</strong> {selected.customer_phone || "-"}</p>
            <p><strong>Child:</strong> {selected.child_name || "-"}</p>
            <p><strong>School:</strong> {selected.school_name || "-"}</p>

            <p><strong>Address:</strong> {[
              selected.address,
              selected.landmark,
              selected.city,
              selected.pincode
            ].filter(Boolean).join(", ") || "-"}</p>

            <hr />

            <h3>Subscription Details</h3>
            <p><strong>Plan:</strong> {selected.plan_name || "-"}</p>
            <p><strong>Duration:</strong> {selected.plan_duration || "-"}</p>

            <hr />

            <h3>Payment Details</h3>
            <p><strong>UTR Number:</strong> {selected.utr_number || "-"}</p>
            <p><strong>Payment Date:</strong> {selected.payment_date || "-"}</p>

            <h2 style={{ textAlign: "right" }}>
              Total Paid: ₹{selected.amount}
            </h2>

            <hr />

            <p style={{ textAlign: "center" }}>
              धन्यवाद! KANHA BITES चुनने के लिए।
            </p>
            <p style={{ textAlign: "center" }}>
              Contact: 9116080032
            </p>
            <p style={{ textAlign: "center", fontSize: 12 }}>
              Computer generated invoice.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
