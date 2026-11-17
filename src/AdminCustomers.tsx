import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadCustomers() {
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .eq("role", "customer")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("ग्राहक लोड नहीं हुए: " + error.message);
      setCustomers([]);
      setLoading(false);
      return;
    }

    const userIds = (profiles || []).map((p: any) => p.id);

    if (userIds.length === 0) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const { data: households } = await supabase
      .from("households")
      .select("id, parent_user_id, household_name")
      .in("parent_user_id", userIds);

    const householdIds = (households || []).map((h: any) => h.id);

    let children: any[] = [];
    let subscriptions: any[] = [];

    if (householdIds.length > 0) {
      const { data: childData } = await supabase
        .from("children")
        .select("id, household_id, child_name, school_name, active")
        .in("household_id", householdIds);

      children = childData || [];

      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("id, household_id, plan_id, start_date, end_date, status");

      subscriptions = subscriptionData || [];
    }

    const { data: plans } = await supabase
      .from("plans")
      .select("id, plan_name, price");

    const result = (profiles || []).map((profile: any) => {
      const household = (households || []).find(
        (h: any) => h.parent_user_id === profile.id
      );

      const customerChildren = children.filter(
        (c: any) => c.household_id === household?.id
      );

      const customerSubscriptions = subscriptions
        .filter((s: any) => s.household_id === household?.id)
        .map((s: any) => ({
          ...s,
          plan: (plans || []).find((p: any) => p.id === s.plan_id)
        }));

      return {
        ...profile,
        household,
        children: customerChildren,
        subscriptions: customerSubscriptions
      };
    });

    setCustomers(result);
    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <section style={{ marginTop: 25, padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2>👨‍👩‍👧 Customer Management</h2>

      <button onClick={loadCustomers} style={{ padding: 10, marginBottom: 15 }}>
        ↻ Refresh Customers
      </button>

      {loading && <p>ग्राहकों की जानकारी लोड हो रही है...</p>}
      {message && <p>{message}</p>}

      {!loading && customers.length === 0 && !message && (
        <p>अभी कोई ग्राहक उपलब्ध नहीं है।</p>
      )}

      {customers.map((customer) => (
        <div
          key={customer.id}
          style={{ padding: 15, marginBottom: 15, border: "1px solid #ddd", borderRadius: 10 }}
        >
          <h3>👤 {customer.full_name || "नाम उपलब्ध नहीं"}</h3>
          <p>📞 मोबाइल: {customer.phone || "उपलब्ध नहीं"}</p>
          <p>📧 User ID: {customer.id}</p>
          <p>🏠 घर: {customer.household?.household_name || "दर्ज नहीं"}</p>

          <h4>बच्चों की जानकारी</h4>
          {customer.children.length === 0 ? (
            <p>अभी बच्चे की जानकारी दर्ज नहीं है।</p>
          ) : (
            customer.children.map((child: any) => (
              <div key={child.id}>
                <p>
                  🧒 {child.child_name}
                  {child.school_name ? ' — $DIL0' : ""}
                  {child.active ? " (Active)" : " (Inactive)"}
                </p>
              </div>
            ))
          )}
          <h4>सब्सक्रिप्शन</h4>
          {customer.subscriptions.length === 0 ? (
            <p>कोई सब्सक्रिप्शन नहीं।</p>
          ) : (
            customer.subscriptions.map((sub: any) => (
              <div key={sub.id}>
                <p>📦 प्लान: {sub.plan?.plan_name || "प्लान उपलब्ध नहीं"}</p>
                <p>💰 कीमत: ₹{sub.plan?.price ?? "—"}</p>
                <p>📅 {sub.start_date} से {sub.end_date}</p>
                <p>स्टेटस: <strong>{sub.status}</strong></p>
              </div>
            ))
          )}

          <p>
            <small>
              रजिस्ट्रेशन: {new Date(customer.created_at).toLocaleDateString("en-IN")}
            </small>
          </p>
        </div>
      ))}
    </section>
  );
}