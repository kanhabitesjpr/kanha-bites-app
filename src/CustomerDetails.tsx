import { useState, type FormEvent } from "react";
import { supabase } from "./lib/supabaseclient";

type Props = {
  user: {
    id: string;
    email?: string;
    user_metadata?: { full_name?: string; phone?: string };
  };
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  margin: "7px 0 15px",
  border: "1px solid #d7ddd6",
  borderRadius: 9,
  fontSize: 15,
  background: "#fff",
};

const buttonStyle: React.CSSProperties = {
  padding: 13,
  width: "100%",
  background: "#1e563f",
  color: "white",
  border: 0,
  borderRadius: 9,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

export default function CustomerDetails({ user }: Props) {
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState("");
  const [school, setSchool] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [foodInstructions, setFoodInstructions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [kitchenInstructions, setKitchenInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Database connection नहीं मिला। Supabase Configuration जाँचें।");
      return;
    }
    if (!childName.trim()) {
      setMessage("बच्चे का नाम भरना जरूरी है।");
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

      let householdId = household?.id as string | undefined;
      if (!householdId) {
        const { data: createdHousehold, error: createHouseholdError } = await supabase
          .from("households")
          .insert({
            parent_user_id: user.id,
            household_name: user.user_metadata?.full_name || user.email || "Customer Family",
          })
          .select("id")
          .single();
        if (createHouseholdError) throw createHouseholdError;
        householdId = createdHousehold.id;
      }

      const { data: child, error: childError } = await supabase
        .from("children")
        .insert({
          household_id: householdId,
          child_name: childName.trim(),
          date_of_birth: dob || null,
          school_name: school.trim() || null,
          class_name: className.trim() || null,
          section: section.trim() || null,
          roll_number: rollNumber.trim() || null,
          food_instructions: foodInstructions.trim() || null,
          active: true,
        })
        .select("id")
        .single();
      if (childError) throw childError;

      if (allergies.trim() || kitchenInstructions.trim()) {
        const { error: safetyError } = await supabase.from("child_food_safety").insert({
          child_id: child.id,
          allergy_details: allergies.trim() || null,
          kitchen_instructions: kitchenInstructions.trim() || null,
        });
        if (safetyError) {
          setMessage("बच्चे की जानकारी सेव हुई, लेकिन Food Safety जानकारी सेव नहीं हुई: " + safetyError.message);
          return;
        }
      }

      setMessage("बच्चे की जानकारी सफलतापूर्वक सेव हो गई।");
      setChildName("");
      setDob("");
      setSchool("");
      setClassName("");
      setSection("");
      setRollNumber("");
      setFoodInstructions("");
      setAllergies("");
      setKitchenInstructions("");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "अज्ञात समस्या";
      setMessage("जानकारी सेव नहीं हुई: " + detail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ maxWidth: 720, margin: "20px auto", padding: 20, background: "#fffdf7", border: "1px solid #e8e4d8", borderRadius: 16 }}>
      <h2 style={{ color: "#173d30", marginTop: 0 }}>बच्चे की जानकारी</h2>
      <p style={{ color: "#64746b" }}>सही जानकारी से पैकिंग और स्कूल डिलीवरी में मदद मिलेगी।</p>
      <form onSubmit={saveDetails}>
        <label>बच्चे का पूरा नाम *</label>
        <input required value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="बच्चे का नाम" style={inputStyle} />
        <label>जन्मतिथि</label>
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle} />
        <label>स्कूल का नाम</label>
        <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="जैसे Dream Land Academy" style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div><label>क्लास</label><input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="जैसे 2" style={inputStyle} /></div>
          <div><label>सेक्शन</label><input value={section} onChange={(e) => setSection(e.target.value)} placeholder="जैसे A" style={inputStyle} /></div>
          <div><label>रोल नंबर (वैकल्पिक)</label><input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="रोल नंबर" style={inputStyle} /></div>
        </div>
        <label>खाने से जुड़ी पसंद और निर्देश</label>
        <textarea value={foodInstructions} onChange={(e) => setFoodInstructions(e.target.value)} placeholder="जैसे कम मसाले वाला खाना" style={{ ...inputStyle, minHeight: 76 }} />
        <label>Food Allergies</label>
        <textarea value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="जैसे मूंगफली, दूध आदि से एलर्जी" style={{ ...inputStyle, minHeight: 76 }} />
        <label>Kitchen / Special Instructions</label>
        <textarea value={kitchenInstructions} onChange={(e) => setKitchenInstructions(e.target.value)} placeholder="खाना तैयार करते समय विशेष सावधानी" style={{ ...inputStyle, minHeight: 76 }} />
        <button type="submit" disabled={saving} style={{ ...buttonStyle, opacity: saving ? 0.7 : 1 }}>{saving ? "सेव हो रहा है..." : "बच्चे की जानकारी सेव करें"}</button>
      </form>
      {message && <p role="status" style={{ marginTop: 14, color: message.includes("नहीं") ? "#b42318" : "#21633c" }}>{message}</p>}
    </section>
  );
}

