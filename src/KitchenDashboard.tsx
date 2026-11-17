import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseclient";

type AnyRow = Record<string, any>;
type Props = { user: { id: string; email?: string; user_metadata?: { full_name?: string } } };

const todayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return [year, month, day].join("-");
};

export default function KitchenDashboard({ user }: Props) {
  const [orders, setOrders] = useState<AnyRow[]>([]);
  const [children, setChildren] = useState<AnyRow[]>([]);
  const [households, setHouseholds] = useState<AnyRow[]>([]);
  const [safety, setSafety] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayLocal());

  const loadData = useCallback(async () => {
    if (!supabase) {
      setMessage("Supabase कनेक्शन उपलब्ध नहीं है। Environment Variables जाँचें।");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const orderResult = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("delivery_date", selectedDate)
      .order("created_at", { ascending: true });

    if (orderResult.error) {
      setMessage("आज के किचन ऑर्डर लोड नहीं हुए: " + orderResult.error.message);
      setLoading(false);
      return;
    }

    const [childResult, householdResult, safetyResult] = await Promise.all([
      supabase.from("children").select("*"),
      supabase.from("households").select("*"),
      supabase.from("child_food_safety").select("*")
    ]);

    const failed = [childResult, householdResult, safetyResult].find((result) => result.error);
    if (failed?.error) {
      setMessage("बच्चों या Food Safety की जानकारी नहीं मिली: " + failed.error.message);
      setLoading(false);
      return;
    }

    setOrders(orderResult.data || []);
    setChildren(childResult.data || []);
    setHouseholds(householdResult.data || []);
    setSafety(safetyResult.data || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const preparedRows = useMemo(() => {
    return orders.map((order) => {
      const child = children.find((item) => item.id === order.child_id);
      const household = households.find((item) => item.id === (order.household_id || child?.household_id));
      const foodSafety = safety.find((item) => item.child_id === order.child_id);
      return { ...order, child, household, foodSafety };
    });
  }, [orders, children, households, safety]);

  const schoolGroups = useMemo(() => {
    const groups = new Map<string, AnyRow[]>();
    preparedRows.forEach((row) => {
      const school = String(row.child?.school_name || "स्कूल की जानकारी नहीं").trim();
      const list = groups.get(school) || [];
      list.push(row);
      groups.set(school, list);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "hi"));
  }, [preparedRows]);

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      assigned: "Rider को Assigned",
      picked_up: "Rider ने Pickup किया",
      delivered: "Delivered",
      failed: "Delivery Failed"
    };
    return labels[status] || status || "-";
  };

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>KANHA BITES • OPERATIONS</div>
          <h1 style={styles.title}>Kitchen Dashboard</h1>
          <p style={styles.subTitle}>नमस्ते {user.user_metadata?.full_name || user.email || "Kitchen Team"} — आज की तैयारी और पैकिंग सूची</p>
        </div>
        <button type="button" onClick={() => void loadData()} style={styles.refreshButton}>↻ Refresh</button>
      </header>

      <section style={styles.toolbar}>
        <label style={styles.dateLabel}>डिलीवरी की तारीख
          <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} style={styles.dateInput} />
        </label>
        <div style={styles.stat}><strong>{preparedRows.length}</strong><span>कुल पैकेट</span></div>
        <div style={styles.stat}><strong>{schoolGroups.length}</strong><span>स्कूल / ग्रुप</span></div>
      </section>

      {message && <div role="alert" style={styles.message}>{message}</div>}
      {loading ? <div style={styles.empty}>ऑर्डर लोड हो रहे हैं...</div> : preparedRows.length === 0 ? (
        <div style={styles.empty}>इस तारीख के लिए कोई Delivery Order नहीं मिला। पहले Admin Panel से Daily Orders Generate करें।</div>
      ) : (
        <>
          {schoolGroups.map(([school, rows]) => (
            <section key={school} style={styles.group}>
              <div style={styles.groupHeader}>
                <div><h2 style={styles.groupTitle}>{school}</h2><span style={styles.groupMeta}>{rows.length} पैकेट</span></div>
                <button type="button" onClick={() => window.print()} style={styles.printButton}>Print List</button>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead><tr><th>बच्चे का नाम</th><th>क्लास / सेक्शन</th><th>खाने की जानकारी</th><th>ऑर्डर स्थिति</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.child?.child_name || "नाम उपलब्ध नहीं"}</strong><small style={styles.small}>घर: {row.household?.household_name || "-"}</small></td>
                        <td>{row.child?.class_name || row.child?.class || "-"}{row.child?.section ? " / " + row.child.section : ""}</td>
                        <td><div>{row.child?.food_instructions || "सामान्य भोजन"}</div>{row.foodSafety?.allergy_details && <strong style={styles.allergy}>एलर्जी: {row.foodSafety.allergy_details}</strong>}{row.foodSafety?.kitchen_instructions && <small style={styles.small}>विशेष: {row.foodSafety.kitchen_instructions}</small>}</td>
                        <td>{statusLabel(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <p style={styles.note}>यह पहला Kitchen View है: यह मौजूदा delivery_orders, children, households और child_food_safety रिकॉर्ड पढ़ता है। पैकिंग स्टेटस बदलने की सुविधा Database Status और अनुमतियों की पुष्टि के बाद जोड़ी जाएगी।</p>
        </>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1180, margin: "0 auto", padding: "20px 16px 48px", color: "#18352b" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  eyebrow: { color: "#b66a2c", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 },
  title: { margin: "6px 0", fontSize: 28, color: "#173d30" },
  subTitle: { margin: 0, color: "#66766e" },
  refreshButton: { border: 0, borderRadius: 10, padding: "11px 16px", background: "#1e563f", color: "white", fontWeight: 700, cursor: "pointer" },
  toolbar: { display: "flex", alignItems: "end", flexWrap: "wrap", gap: 14, background: "#f5f2e9", border: "1px solid #e8e1d2", borderRadius: 16, padding: 16, marginBottom: 20 },
  dateLabel: { display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#52645a" },
  dateInput: { border: "1px solid #d6d2c8", borderRadius: 9, padding: 10, background: "white", color: "#18352b", fontSize: 14 },
  stat: { minWidth: 110, display: "grid", gap: 2, padding: "4px 14px", borderLeft: "1px solid #ded8ca" },
  statStrong: { fontSize: 23 },
  group: { background: "white", border: "1px solid #e6e9e4", borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: "0 4px 18px rgba(24,53,43,.05)" },
  groupHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 },
  groupTitle: { margin: 0, fontSize: 19 },
  groupMeta: { color: "#64746b", fontSize: 12 },
  printButton: { border: "1px solid #cbd8cf", background: "#f7faf7", color: "#1e563f", borderRadius: 9, padding: "8px 12px", cursor: "pointer", fontWeight: 700 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 },
  small: { display: "block", color: "#718078", fontSize: 11, marginTop: 4 },
  allergy: { display: "block", color: "#b42318", marginTop: 5 },
  message: { background: "#fff1ed", color: "#9d3324", padding: 12, borderRadius: 10, marginBottom: 16 },
  empty: { background: "#f7f6f0", border: "1px dashed #c9cfc8", borderRadius: 14, padding: 28, textAlign: "center", color: "#68766e" },
  note: { color: "#738078", fontSize: 12, lineHeight: 1.6, marginTop: 16 }
};

