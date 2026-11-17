import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";
import CustomerDetails from "./CustomerDetails";
import CustomerAddress from "./CustomerAddress";
import CustomerSubscription from "./CustomerSubscription";
import CustomerPayment from "./CustomerPayment";
import CustomerOrderHistory from "./CustomerOrderHistory";
import CustomerVacationRequest from "./CustomerVacationRequest";

type CustomerDashboardProps = {
  user: any;
  onLogout: () => void;
};

type Plan = {
  id: string;
  plan_name: string;
  category: string;
  price: number;
  duration_days: number;
delivery_days_per_week: number;
  description: string | null;
};

export default function CustomerDashboard({
  user,
  onLogout,
}: CustomerDashboardProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPlans() {
    if (!supabase) {
      setError("Database connection नहीं मिला।");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("plans")
      .select(
        "id, plan_name, category, price, duration_days, delivery_days_per_week, description"
      )
      .eq("active", true)
      .order("price", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setPlans(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "auto", padding: 20 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2>🍱 KANHA BITES</h2>
          <p>Customer Dashboard</p>
        </div>

        <button onClick={onLogout}>Logout</button>
      </header>

      <section
        style={{
          background: "#fff3df",
          padding: 22,
          borderRadius: 14,
          marginTop: 20,
        }}
      >
        <h2>नमस्ते, {user.user_metadata?.full_name || "Customer"}! 👋</h2>
        <CustomerSubscription user={user} />
        <CustomerPayment user={user} />
        <CustomerOrderHistory user={user} />
        <CustomerVacationRequest user={user} />
        <CustomerAddress user={user} />
        <CustomerDetails user={user} />
        <p>बच्चों का लंच, स्कूल से पहले अब आपके घर!</p>
        <p>{user.email}</p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>हमारे Lunch Plans</h2>
        <p>अपनी सुविधा के अनुसार प्लान चुनें।</p>

        {loading && <p>Plans लोड हो रहे हैं...</p>}

        {error && (
          <div style={{ color: "red", padding: 12 }}>
            {error}
            <button onClick={loadPlans}>दोबारा कोशिश करें</button>
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <p>अभी कोई Active Plan उपलब्ध नहीं है।</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 14,
                padding: 18,
                background: "white",
              }}
            >
              <h3>{plan.plan_name}</h3>
              <h2>₹{plan.price}</h2>
              <p>अवधि: {plan.duration_days} दिन</p>
              <p>डिलीवरी: {plan.delivery_days_per_week} दिन प्रति सप्ताह</p>
              <p>{plan.description}</p>
              <p>{plan.category}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>मेरी सुविधाएँ</h2>
        <p>अगले चरणों में यहाँ ये सुविधाएँ जुड़ेंगी:</p>
        <ul>
          <li>बच्चों की जानकारी</li>
          <li>Food Allergies और Instructions</li>
          <li>Delivery Address</li>
          <li>My Subscription</li>
          <li>Payment और Invoice</li>
          <li>Order History</li>
          <li>Vacation Requests</li>
        </ul>
      </section>
    </div>
  );
}