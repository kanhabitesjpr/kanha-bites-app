import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "./lib/supabaseclient";
import AdminPayments from "./AdminPayments";
import AdminMenu from "./AdminMenu";
import AdminMenuItems from "./AdminMenuItems";
import AdminDeliveryOrders from "./AdminDeliveryOrders";
import AdminDeliveryOTP from "./AdminDeliveryOTP";
import AdminVacationRequests from "./AdminVacationRequests";
import AdminCustomers from "./AdminCustomers";
import AdminSubscriptions from "./AdminSubscriptions";
import AdminServiceAreas from "./AdminServiceAreas";
import AdminGenerateOrders from "./AdminGenerateOrders";
import AdminInvoices from "./AdminInvoices";

type Plan = {
  id: string;
  plan_name: string;
  category: string;
  price: number;
  duration_days: number;
  delivery_days_per_week: number;
  active: boolean;
  description: string | null;
};

type PlanForm = {
  plan_name: string;
  category: string;
  price: string;
  duration_days: string;
  delivery_days_per_week: string;
  description: string;
};

const emptyForm: PlanForm = {
  plan_name: "",
  category: "Lunch",
  price: "",
  duration_days: "",
  delivery_days_per_week: "6",
  description: "",
};

const inputStyle: React.CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", padding: 12, margin: "7px 0 15px", border: "1px solid #d4d9d3", borderRadius: 9, fontSize: 15 };
const buttonStyle: React.CSSProperties = { padding: "11px 18px", margin: 5, background: "#1e563f", color: "white", border: 0, borderRadius: 9, cursor: "pointer", fontWeight: 700 };
const secondaryButtonStyle: React.CSSProperties = { ...buttonStyle, background: "#e8eee9", color: "#1e563f" };

export default function AdminDashboard() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPlans() {
    if (!supabase) { setMessage("Supabase कनेक्शन नहीं मिला।"); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("plans").select("*").order("created_at", { ascending: false });
    if (error) setMessage("Plans लोड नहीं हुए: " + error.message);
    else setPlans((data || []) as Plan[]);
    setLoading(false);
  }

  useEffect(() => { void loadPlans(); }, []);

  function updateField(field: keyof PlanForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage("Supabase कनेक्शन नहीं मिला।"); return; }
    const price = Number(form.price);
    const durationDays = Number(form.duration_days);
    const deliveryDays = Number(form.delivery_days_per_week);
    if (!form.plan_name.trim() || price <= 0 || durationDays <= 0 || deliveryDays <= 0 || deliveryDays > 7) {
      setMessage("Plan का नाम, सही कीमत, अवधि और 1 से 7 के बीच डिलीवरी दिन भरें।");
      return;
    }

    setSaving(true);
    setMessage("");
    const planData = {
      plan_name: form.plan_name.trim(),
      category: form.category,
      price,
      duration_days: durationDays,
      delivery_days_per_week: deliveryDays,
      description: form.description.trim() || null,
    };

    const result = editingId
      ? await supabase.from("plans").update(planData).eq("id", editingId)
      : await supabase.from("plans").insert(planData);

    if (result.error) setMessage("सेव नहीं हुआ: " + result.error.message);
    else {
      setMessage(editingId ? "Plan अपडेट हो गया।" : "नया Plan जुड़ गया।");
      setForm(emptyForm);
      setEditingId(null);
      await loadPlans();
    }
    setSaving(false);
  }

  function editPlan(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      plan_name: plan.plan_name,
      category: plan.category || "Lunch",
      price: String(plan.price),
      duration_days: String(plan.duration_days),
      delivery_days_per_week: String(plan.delivery_days_per_week),
      description: plan.description || "",
    });
    setMessage("");
  }

  async function togglePlan(plan: Plan) {
    if (!supabase) return;
    const { error } = await supabase.from("plans").update({ active: !plan.active }).eq("id", plan.id);
    if (error) setMessage("स्थिति नहीं बदली: " + error.message);
    else { setMessage("Plan की स्थिति अपडेट हो गई।"); await loadPlans(); }
  }

  function cancelEdit() { setEditingId(null); setForm(emptyForm); setMessage(""); }

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 20, color: "#20372c" }}>
      <header style={{ marginBottom: 20 }}>
        <p style={{ color: "#b66a2c", fontWeight: 800, letterSpacing: 1.2, marginBottom: 4 }}>KANHA BITES • CONTROL CENTER</p>
        <h1 style={{ margin: 0, color: "#173d30" }}>Admin Dashboard</h1>
        <p style={{ color: "#66766e" }}>ग्राहक, पेमेंट, मेन्यू, सब्सक्रिप्शन और डिलीवरी का प्रबंधन</p>
      </header>

      <section style={{ display: "grid", gap: 14 }}>
        <AdminGenerateOrders />
        <AdminPayments />
        <AdminInvoices />
        <AdminMenuItems />
        <AdminDeliveryOTP />
        <AdminVacationRequests />
        <AdminCustomers />
        <AdminSubscriptions />
        <AdminServiceAreas />
        <AdminDeliveryOrders />
        <AdminMenu />
      </section>

      <section style={{ marginTop: 26, padding: 20, border: "1px solid #e6e9e4", borderRadius: 16, background: "#fffdf8" }}>
        <h2 style={{ marginTop: 0 }}>{editingId ? "Plan अपडेट करें" : "नया Plan जोड़ें"}</h2>
        <form onSubmit={savePlan}>
          <label>Plan का नाम</label>
          <input required value={form.plan_name} onChange={(e) => updateField("plan_name", e.target.value)} placeholder="जैसे Weekly Lunch Plan" style={inputStyle} />
          <label>Category</label>
          <select value={form.category} onChange={(e) => updateField("category", e.target.value)} style={inputStyle}>
            <option value="Lunch">Lunch</option><option value="Breakfast">Breakfast</option><option value="Breakfast + Lunch">Breakfast + Lunch</option><option value="All Meals">All Meals</option>
          </select>
          <label>कीमत (₹)</label>
          <input required type="number" min="1" step="1" value={form.price} onChange={(e) => updateField("price", e.target.value)} placeholder="जैसे 599" style={inputStyle} />
          <label>अवधि (दिन)</label>
          <input required type="number" min="1" value={form.duration_days} onChange={(e) => updateField("duration_days", e.target.value)} placeholder="जैसे 7 या 30" style={inputStyle} />
          <label>डिलीवरी के दिन प्रति सप्ताह</label>
          <input required type="number" min="1" max="7" value={form.delivery_days_per_week} onChange={(e) => updateField("delivery_days_per_week", e.target.value)} style={inputStyle} />
          <label>Plan की जानकारी</label>
          <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="इस Plan में क्या मिलेगा?" style={{ ...inputStyle, minHeight: 80 }} />
          <button type="submit" disabled={saving} style={buttonStyle}>{saving ? "सेव हो रहा है..." : editingId ? "Plan अपडेट करें" : "Plan जोड़ें"}</button>
          {editingId && <button type="button" onClick={cancelEdit} style={secondaryButtonStyle}>रद्द करें</button>}
        </form>
        {message && <p role="status">{message}</p>}
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h2>सभी Plans ({plans.length})</h2>
          <button type="button" onClick={() => void loadPlans()} style={secondaryButtonStyle}>Refresh Plans</button>
        </div>
        {loading ? <p>Plans लोड हो रहे हैं...</p> : plans.length === 0 ? <p>अभी कोई Plan उपलब्ध नहीं है।</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {plans.map((plan) => (
              <article key={plan.id} style={{ background: "white", border: "1px solid #e4e9e3", borderRadius: 14, padding: 16 }}>
                <h3 style={{ marginTop: 0 }}>{plan.plan_name}</h3>
                <strong style={{ fontSize: 23, color: "#1e563f" }}>₹{plan.price}</strong>
                <p>Category: {plan.category}</p>
                <p>अवधि: {plan.duration_days} दिन</p>
                <p>डिलीवरी: {plan.delivery_days_per_week} दिन / सप्ताह</p>
                <p>{plan.description || "कोई विवरण नहीं"}</p>
                <p>स्थिति: {plan.active ? "चालू" : "बंद"}</p>
                <button type="button" onClick={() => editPlan(plan)} style={buttonStyle}>एडिट करें</button>
                <button type="button" onClick={() => void togglePlan(plan)} style={secondaryButtonStyle}>{plan.active ? "Plan बंद करें" : "Plan चालू करें"}</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

