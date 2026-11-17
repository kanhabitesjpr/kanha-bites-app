
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function AdminMenuItems() {
  const [items, setItems] = useState<any[]>([]);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Kids");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadItems() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("menu_items")
      .select("id, item_name, category, description, active")
      .order("item_name");

    if (error) {
      setMessage("डिश लोड नहीं हुई: " + error.message);
    } else {
      setItems(data || []);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  async function saveItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase || !itemName.trim()) return;

    setSaving(true);
    setMessage("");

    const itemData = {
      item_name: itemName.trim(),
      category,
      description: description.trim() || null,
    };

    const result = editingId
      ? await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", editingId)
      : await supabase
          .from("menu_items")
          .insert({ ...itemData, active: true });

    if (result.error) {
      setMessage("डिश सेव नहीं हुई: " + result.error.message);
    } else {
      setMessage("डिश सफलतापूर्वक सेव हो गई! 🎉");
      resetForm();
      await loadItems();
    }

    setSaving(false);
  }

  function editItem(item: any) {
    setEditingId(item.id);
    setItemName(item.item_name);
    setCategory(item.category || "Kids");
    setDescription(item.description || "");
  }

  function resetForm() {
    setEditingId(null);
    setItemName("");
    setCategory("Kids");
    setDescription("");
  }

  async function toggleItem(item: any) {
    if (!supabase) return;

    const { error } = await supabase
      .from("menu_items")
      .update({ active: !item.active })
      .eq("id", item.id);

    if (error) {
      setMessage("स्टेटस नहीं बदला: " + error.message);
    } else {
      setMessage("डिश का स्टेटस अपडेट हो गया।");
      await loadItems();
    }
  }

  return (
    <div style={containerStyle}>
      <h2>🍽️ Menu Items Management</h2>

      <form onSubmit={saveItem}>
        <label>डिश का नाम *</label>
        <input
          required
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="जैसे Paneer Paratha"
          style={inputStyle}
        />

        <label>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option value="Kids">Kids</option>
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
          <option value="Snacks">Snacks</option>
          <option value="All">All</option>
        </select>

        <label>डिश की जानकारी</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="डिश के बारे में जानकारी"
          style={inputStyle}
        />

        <button disabled={saving} type="submit" style={buttonStyle}>
          {saving ? "सेव हो रहा है..." : editingId ? "डिश अपडेट करें" : "नई डिश जोड़ें"}
        </button>

        {editingId && (
          <button type="button" onClick={resetForm} style={cancelStyle}>
            Cancel
          </button>
        )}
      </form>

      <h3>सभी डिश</h3>

      {items.map((item) => (
        <div key={item.id} style={cardStyle}>
          <strong>{item.item_name}</strong>
          <p>{item.category}</p>
          <p>{item.description}</p>
          <p>{item.active ? "Active" : "Inactive"}</p>

          <button onClick={() => editItem(item)} style={editStyle}>
            Edit
          </button>

          <button onClick={() => toggleItem(item)} style={toggleStyle}>
            {item.active ? "बंद करें" : "चालू करें"}
          </button>
        </div>
      ))}

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
  padding: 12,
  width: "100%",
  background: "#166534",
  color: "white",
  border: 0,
  borderRadius: 8,
};

const cancelStyle: React.CSSProperties = {
  padding: 10,
  marginTop: 8,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  padding: 14,
  marginTop: 12,
  borderRadius: 10,
  border: "1px solid #ead7c5",
};

const editStyle: React.CSSProperties = {
  padding: 8,
  marginRight: 8,
};

const toggleStyle: React.CSSProperties = {
  padding: 8,
};


