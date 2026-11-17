
import { useState } from "react";
import { supabase } from "./lib/supabaseclient";

type Props = {
  user: any;
};

export default function CustomerAddress({ user }: Props) {
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("Jaipur");
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) {
      setMessage("Database connection नहीं मिला।");
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      setMessage("कृपया 6 अंकों का सही पिनकोड भरें।");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("id")
        .eq("parent_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (householdError) throw householdError;

      if (!household) {
        throw new Error("पहले बच्चे की जानकारी सेव करें।");
      }

      const { error } = await supabase
        .from("delivery_addresses")
        .insert({
          household_id: household.id,
          address: address.trim(),
          landmark: landmark.trim() || null,
          city: city.trim(),
          pincode: pincode.trim(),
          is_primary: true,
        });

      if (error) throw error;

      setMessage("आपका डिलीवरी पता सफलतापूर्वक सेव हो गया! 🎉");
      setAddress("");
      setLandmark("");
      setPincode("");
    } catch (error: any) {
      setMessage("पता सेव नहीं हुआ: " + error.message);
    }

    setSaving(false);
  }

  return (
    <div style={containerStyle}>
      <h2>🏠 डिलीवरी का पता</h2>
      <p>जहाँ बच्चे का Lunch Box पहुँचाना है, वह पता भरें।</p>

      <form onSubmit={saveAddress}>
        <label>पूरा घर का पता *</label>
        <textarea
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="मकान नंबर, कॉलोनी, गली आदि"
          style={inputStyle}
        />

        <label>लैंडमार्क</label>
        <input
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="पास की कोई पहचान"
          style={inputStyle}
        />

        <label>शहर *</label>
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={inputStyle}
        />

        <label>पिनकोड *</label>
        <input
          required
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) =>
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="6 अंकों का पिनकोड"
          style={inputStyle}
        />

        <button type="submit" disabled={saving} style={buttonStyle}>
          {saving ? "सेव हो रहा है..." : "डिलीवरी पता सेव करें"}
        </button>
      </form>

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

