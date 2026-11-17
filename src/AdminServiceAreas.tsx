import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminServiceAreas() {
  const [areas, setAreas] = useState<any[]>([]);
  const [areaName, setAreaName] = useState("");
  const [pincode, setPincode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadAreas() {
    if (!supabase) {
      setMessage("Supabase कनेक्ट नहीं है");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("service_areas")
      .select("*")
      .order("area_name");

    if (error) {
      setMessage(error.message);
    } else {
      setAreas(data || []);
      setMessage("");
    }

    setLoading(false);
  }

  async function addArea() {
    if (!supabase || !areaName.trim() || !/^\d{6}$/.test(pincode)) {
      setMessage("इलाके का नाम और सही 6 अंकों का पिनकोड भरें।");
      return;
    }

    const { error } = await supabase
      .from("service_areas")
      .insert({
        area_name: areaName.trim(),
        pincode: pincode.trim(),
        active: true
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAreaName("");
    setPincode("");
    setMessage("नया डिलीवरी इलाका जोड़ दिया गया।");
    loadAreas();
  }

  async function toggleArea(id: string, active: boolean) {
    if (!supabase) return;

    const { error } = await supabase
      .from("service_areas")
      .update({ active: !active })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("इलाके का स्टेटस अपडेट हो गया।");
    loadAreas();
  }

  useEffect(() => {
    loadAreas();
  }, []);

  return (
    <section style={{
      background: "white",
      color: "#222",
      padding: 16,
      marginTop: 20,
      borderRadius: 12
    }}>
      <h2>📍 Service Area Management</h2>
      <p>KANHA BITES के डिलीवरी इलाके मैनेज करें।</p>

      <input
        value={areaName}
        onChange={(e) => setAreaName(e.target.value)}
        placeholder="इलाके का नाम"
      />

      <br /><br />

      <input
        value={pincode}
        onChange={(e) => setPincode(e.target.value)}
        placeholder="6 अंकों का पिनकोड"
        maxLength={6}
        inputMode="numeric"
      />

      <br /><br />

      <button onClick={addArea}>+ नया इलाका जोड़ें</button>
      <button onClick={loadAreas} style={{ marginLeft: 8 }}>
        Refresh
      </button>

      {message && <p>{message}</p>}

      {loading ? (
        <p>इलाके लोड हो रहे हैं...</p>
      ) : areas.length === 0 ? (
        <p>अभी कोई डिलीवरी इलाका नहीं जोड़ा गया है।</p>
      ) : (
        areas.map((area) => (
          <div key={area.id} style={{
            border: "1px solid #ddd",
            padding: 12,
            marginTop: 12,
            borderRadius: 8
          }}>
            <h3>{area.area_name}</h3>
            <p>पिनकोड: {area.pincode}</p>
            <p>स्टेटस: {area.active ? "चालू" : "बंद"}</p>

            <button onClick={() => toggleArea(area.id, area.active)}>
              {area.active ? "डिलीवरी बंद करें" : "डिलीवरी चालू करें"}
            </button>
          </div>
        ))
      )}
    </section>
  );
}