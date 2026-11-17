import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseclient";

export default function SupabaseTest() {
  const [status, setStatus] = useState("Supabase चेक हो रहा है...");

  useEffect(() => {
    async function testConnection() {
      if (!supabase) {
        setStatus("Configuration Missing");
        return;
      }

      const { error } = await supabase.auth.getSession();

      setStatus(
        error ? "Connection Error: " + error.message : "Supabase Connected Successfully!"
      );
    }

    testConnection();
  }, []);

  return <div>{status}</div>;
}