
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminMenu() {
  const [items, setItems] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [menuDate, setMenuDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [slot, setSlot] = useState("Lunch");
  const [category, setCategory] = useState("Kids");
  const [itemId, setItemId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!supabase) return;

    const [itemResult, menuResult] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id, item_name, category")
        .eq("active", true)
        .order("item_name"),
      supabase
        .from("daily_menus")
        .select("id, menu_date, menu_slot, category, menu_item_id, notes")
        .order("menu_date", { ascending: false })
        .limit(50),
    ]);

    if (itemResult.error) {
      setMessage("Menu Items लोड नहीं हुए: " + itemResult.error.message);
    } else {
      setItems(itemResult.data || []);
    }

    if (menuResult.error) {
      setMessage("Daily Menu लोड नहीं हुआ: " + menuResult.error.message);
    } else {
      setMenus(menuResult.data || []);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function addMenu(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase || !itemId) {
      setMessage("कृपया Menu Item चुनें।");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("daily_menus").insert({
      menu_date: menuDate,
      menu_slot: slot,
      category,
      menu_item_id: itemId,
      notes: notes.trim() || null,
    });

    if (error) {
      setMessage("मेन्यू सेव नहीं हुआ: " + error.message);
    } else {
      setMessage("Daily Menu सफलतापूर्वक सेव हो गया! 🎉");
      setItemId("");
      setNotes("");
      await loadData();
    }

    setSaving(false);
  }

  async function deleteMenu(id: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from("daily_menus")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("मेन्यू हटाया नहीं गया: " + error.message);
    } else {
      setMessage("मेन्यू हटा दिया गया।");
      await loadData();
    }
  }

  return (
    <div style={containerStyle}>
      <h2>🍱 Daily Menu Management</h2>

      <form onSubmit={addMenu}>
        <label>मेन्यू की तारीख</label>
        <input
          type="date"
          required
          value={menuDate}
          onChange={(e) => setMenuDate(e.target.value)}
          style={inputStyle}
        />

        <label>Meal Slot</label>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          style={inputStyle}
        >
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
        </select>

        <label>Category</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
          placeholder="जैसे Kids"
        />

        <label>Menu Item</label>
        <select
          required
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          style={inputStyle}
        >
          <option value="">डिश चुनें</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.item_name}
            </option>
          ))}
        </select>

        <label>Special Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="जैसे कम मसाले वाला खाना"
          style={inputStyle}
        />

        <button disabled={saving} type="submit" style={buttonStyle}>
          {saving ? "सेव हो रहा है..." : "Daily Menu सेव करें"}
        </button>
      </form>

      <h3>📅 पहले से सेव मेन्यू</h3>

      {menus.map((menu) => {
        const item = items.find((i) => i.id === menu.menu_item_id);

        return (
          <div key={menu.id} style={cardStyle}>
            <strong>{menu.menu_date}</strong>
            <p>{menu.menu_slot} — {item?.item_name || "Menu Item"}</p>
            <p>{menu.category}</p>
            {menu.notes && <p>{menu.notes}</p>}
            <button
              type="button"
              onClick={() => deleteMenu(menu.id)}
              style={deleteStyle}
            >
              हटाएँ
            </button>
          </div>
        );
      })}

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
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 14,
  marginTop: 12,
  borderRadius: 10,
  border: "1px solid #ead7c5",
};

const deleteStyle: React.CSSProperties = {
  padding: 8,
  background: "#b91c1c",
  color: "white",
  border: 0,
  borderRadius: 6,
};

