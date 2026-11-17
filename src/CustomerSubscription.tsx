import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

type Props = {
  user: any;
};

export default function CustomerSubscription({ user }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [planId, setPlanId] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setMessage("Database connection नहीं मिला।");
        setLoading(false);
        return;
      }

      try {
        const { data: household, error: hError } = await supabase
          .from("households")
          .select("id")
          .eq("parent_user_id", user.id)
          .maybeSingle();

        if (hError) throw hError;

        if (!household) {
          setMessage("पहले बच्चे की जानकारी और डिलीवरी पता सेव करें।");
          setLoading(false);
          return;
        }

        setHouseholdId(household.id);

        const [planResult, childResult, addressResult] = await Promise.all([
          supabase
            .from("plans")
            .select("id, plan_name, category, price, duration_days, delivery_days_per_week, description")
            .eq("active", true)
            .order("price", { ascending: true }),

          supabase
            .from("children")
            .select("id, child_name")
            .eq("household_id", household.id)
            .eq("active", true),

          supabase
            .from("delivery_addresses")
            .select("id, address, city, pincode")
            .eq("household_id", household.id),
        ]);

        if (planResult.error) throw planResult.error;
        if (childResult.error) throw childResult.error;
        if (addressResult.error) throw addressResult.error;

        setPlans(planResult.data ?? []);
        setChildren(childResult.data ?? []);
        setAddresses(addressResult.data ?? []);
      } catch (error: any) {
        setMessage("जानकारी लोड नहीं हुई: " + error.message);
      }

      setLoading(false);
    }

    loadData();
  }, [user.id]);

  async function submitSubscription(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase || !householdId) return;

    if (!planId || !childId || !addressId) {
      setMessage("बच्चा, पता और प्लान चुनना जरूरी है।");
      return;
    }

    const selectedPlan = plans.find((p) => p.id === planId);

    if (!selectedPlan) {
      setMessage("कृपया सही प्लान चुनें।");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + Number(selectedPlan.duration_days || 0));

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
      
        return [year, month, day].join("-");
      };

      const { error } = await supabase.from("subscriptions").insert({
        household_id: householdId,
        child_id: childId,
        plan_id: planId,
        amount: Number(selectedPlan.price),
        address_id: addressId,
        start_date: formatDate(start),
        end_date: formatDate(end),
        status: "pending",
      });

      if (error) throw error;

      setMessage("आपकी Subscription Request भेज दी गई है! 🎉");
      setPlanId("");
      setChildId("");
      setAddressId("");
    } catch (error: any) {
      setMessage("Request सेव नहीं हुई: " + error.message);
    }

    setSaving(false);
  }

  return (
    <div style={containerStyle}>
      <h2>🍱 अपना Lunch Plan चुनें</h2>
      <p>अपने बच्चे के लिए सुविधाजनक प्लान चुनें।</p>
      {loading ? (
        <p>जानकारी लोड हो रही है...</p>
      ) : (
        <>
          {plans.map((plan) => (
            <div key={plan.id} style={planStyle}>
              <strong>{plan.plan_name}</strong>
              <h3>₹{plan.price}</h3>
              <p>{plan.duration_days} दिन | {plan.delivery_days_per_week} डिलीवरी दिन प्रति सप्ताह</p>
              <p>{plan.description}</p>
            </div>
          ))}

          <form onSubmit={submitSubscription}>
            <label>बच्चे का नाम *</label>
            <select
              required
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              style={inputStyle}
            >
              <option value="">बच्चा चुनें</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.child_name}
                </option>
              ))}
            </select>

            <label>डिलीवरी का पता *</label>
            <select
              required
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              style={inputStyle}
            >
              <option value="">पता चुनें</option>
              {addresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.address}, {item.city} - {item.pincode}
                </option>
              ))}
            </select>

            <label>प्लान चुनें *</label>
            <select
              required
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              style={inputStyle}
            >
              <option value="">अपना प्लान चुनें</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_name} - ₹{plan.price}
                </option>
              ))}
            </select>

            <button type="submit" disabled={saving} style={buttonStyle}>
              {saving ? "भेज रहे हैं..." : "Subscription Request भेजें"}
            </button>
          </form>
        </>
      )}

      {message && <p style={{ marginTop: 15 }}>{message}</p>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 650,
  margin: "20px auto",
  padding: 20,
  background: "#fff7ed",
  borderRadius: 14,
};

const planStyle: React.CSSProperties = {
  padding: 15,
  marginBottom: 12,
  background: "white",
  border: "1px solid #ead7c5",
  borderRadius: 10,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  margin: "7px 0 16px",
  border: "1px solid #ccc",
  borderRadius: 8,
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: 13,
  width: "100%",
  background: "#166534",
  color: "white",
  border: 0,
  borderRadius: 8,
  fontSize: 16,
  cursor: "pointer",
};
