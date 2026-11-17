import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { supabase } from "./lib/supabaseclient";
import CustomerDashboard from "./CustomerDashboard";
import AdminDashboard from "./AdminDashboard";
import RiderDashboard from "./RiderDashboard";
import InstallApp from "./InstallApp";
import KitchenDashboard from "./KitchenDashboard";

type Page = "home" | "login" | "register";
type AppUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
  };
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const roleRequestRef = useRef(0);

  const loadUserRole = useCallback(async (userId: string) => {
    if (!supabase) {
      setRoleError("Supabase कनेक्शन उपलब्ध नहीं है।");
      setRoleLoading(false);
      return;
    }

    const requestId = roleRequestRef.current + 1;
    roleRequestRef.current = requestId;
    setRoleLoading(true);
    setRoleError("");
    setUserRole(null);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (roleRequestRef.current !== requestId) return;

      if (error) {
        setRoleError(
          "आपकी प्रोफाइल का Role लोड नहीं हो पाया। " + error.message
        );
        return;
      }

      const role = typeof data?.role === "string" ? data.role.toLowerCase() : "";
      if (!role) {
        setRoleError(
          "आपका Profile Role अभी सेट नहीं है। Admin से profiles टेबल में आपका सही Role सेट करवाएँ।"
        );
        return;
      }

      if (!["admin", "rider", "customer", "kitchen"].includes(role)) {
        setRoleError(
          "आपके अकाउंट का Role मान्य नहीं है। कृपया Admin से संपर्क करें।"
        );
        return;
      }

      setUserRole(role);
    } catch (error) {
      if (roleRequestRef.current !== requestId) return;
      const detail = error instanceof Error ? error.message : "अज्ञात समस्या";
      setRoleError("Profile लोड करने में समस्या: " + detail);
    } finally {
      if (roleRequestRef.current === requestId) {
        setRoleLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setRoleError("Supabase कनेक्शन नहीं मिला। Environment Variables जाँचें।");
      return;
    }

    let mounted = true;
    const client = supabase;

    const initializeSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (!mounted) return;

      if (error) {
        setRoleError("Login Session लोड नहीं हुआ: " + error.message);
        setAuthLoading(false);
        return;
      }

      const currentUser = data.session?.user ?? null;
      setUser(currentUser as AppUser | null);
      setAuthLoading(false);

      if (currentUser) {
        void loadUserRole(currentUser.id);
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }
    };

    void initializeSession();

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser as AppUser | null);
        setUserRole(null);
        setRoleError("");

        if (currentUser) {
          setRoleLoading(true);
          Promise.resolve().then(() => {
            if (mounted) void loadUserRole(currentUser.id);
          });
        } else {
          roleRequestRef.current += 1;
          setRoleLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      roleRequestRef.current += 1;
      authListener.subscription.unsubscribe();
    };
  }, [loadUserRole]);

  function choosePlan() {
    setPage("register");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase कनेक्शन नहीं मिला। कृपया Configuration जाँचें।");
      return;
    }

    setSubmitting(true);
    try {
      if (page === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: name.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage("आपका अकाउंट बन गया है। आपका Dashboard लोड हो रहा है।");
        } else {
          setMessage(
            "Registration सफल हुआ! अपना Email खोलें और Confirmation Link पर क्लिक करें। उसके बाद Login करें।"
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;
        setMessage("Login सफल हुआ! आपका Dashboard लोड हो रहा है।");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : "कुछ गलती हुई है।";
      setMessage("Error: " + detail);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!supabase) {
      setMessage("Supabase कनेक्शन नहीं मिला।");
      return;
    }

    if (!email.trim()) {
      setMessage("कृपया अपना Email भरें।");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSubmitting(false);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("नया Confirmation Email भेज दिया गया है। अपना Gmail चेक करें।");
    }
  }

  async function handleLogout() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      setRoleError("Logout Error: " + error.message);
      return;
    }

    roleRequestRef.current += 1;
    setUser(null);
    setUserRole(null);
    setRoleError("");
    setRoleLoading(false);
    setPage("home");
  }

  async function retryRoleLoad() {
    if (!user) return;
    await loadUserRole(user.id);
  }

  if (authLoading) {
    return <div className="app">KANHA BITES लोड हो रहा है...</div>;
  }

  if (user && (roleLoading || (!userRole && !roleError))) {
    return <div className="app">आपका Dashboard लोड हो रहा है...</div>;
  }

  if (user && roleError && !userRole) {
    return (
      <div className="app">
        <section className="form-section">
          <div className="form-card">
            <div className="form-icon">🍱</div>
            <h2>KANHA BITES Account</h2>
            <p>{roleError}</p>
            <button className="submit-btn" type="button" onClick={() => void retryRoleLoad()}>
              दोबारा कोशिश करें
            </button>
            <button
              className="header-btn"
              type="button"
              onClick={() => void handleLogout()}
              style={{ marginTop: 12 }}
            >
              Logout
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (user && userRole) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand">
            <span className="brand-icon">🍱</span>
            <div>
              <div className="logo">KANHA BITES</div>
              <small>Welcome to your dashboard</small>
            </div>
          </div>
          <button className="header-btn" type="button" onClick={() => void handleLogout()}>
            Logout
          </button>
        </header>

        <main className="hero-content">
          {userRole === "admin" ? (
            <>
              <h1>Admin Panel</h1>
              <p>स्वागत है, {user.user_metadata?.full_name || user.email}</p>
              <AdminDashboard />
            </>
          ) : userRole === "rider" ? (
            <RiderDashboard user={user} onLogout={handleLogout} />
          ) : userRole === "kitchen" ? (
            <KitchenDashboard user={user} />
          ) : (
            <CustomerDashboard user={user} onLogout={handleLogout} />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand" onClick={() => setPage("home")}>
          <span className="brand-icon">🍱</span>
          <div>
            <div className="logo">KANHA BITES</div>
            <small>Fresh Food • Happy Kids</small>
          </div>
        </div>
        <button className="header-btn" type="button" onClick={() => setPage("login")}>
          Login
        </button>
      </header>

      {page === "home" && (
        <>
          <InstallApp />
          <section className="hero">
            <div className="hero-content">
              <span className="tag">HEALTHY FOOD • HAPPY CHILDHOOD</span>
              <h1>बच्चों का लंच,<br />स्कूल से पहले अब आपके घर!</h1>
              <p>
                बच्चों के लिए स्वादिष्ट, ताजा और रोजाना नया Morning Tiffin.
                <br />आपकी सुबह की टेंशन अब हमारी जिम्मेदारी।
              </p>
              <div className="hero-info">
                <span>📅 सोमवार से शनिवार</span>
                <span>🕕 सुबह 6 से 8 बजे डिलीवरी</span>
              </div>
              <button className="main-btn" type="button" onClick={() => setPage("register")}>
                अभी रजिस्टर करें →
              </button>
            </div>
            <div className="food-illustration">
              <div className="food-emoji">🥪</div>
              <div className="food-caption">Tasty • Fresh • Homemade</div>
            </div>
          </section>

          <section className="features">
            <div className="feature"><span>🥗</span><h3>ताजा खाना</h3><p>रोजाना ताजा तैयार किया हुआ भोजन</p></div>
            <div className="feature"><span>🍱</span><h3>रोज नई वैरायटी</h3><p>बच्चों के लिए स्वादिष्ट मेन्यू</p></div>
            <div className="feature"><span>🏠</span><h3>घर तक डिलीवरी</h3><p>स्कूल जाने से पहले आपके घर</p></div>
          </section>

          <section className="menu-section">
            <span className="tag">OUR FOOD</span>
            <h2>बच्चों की पसंद का स्वाद 😋</h2>
            <p>हर दिन कुछ नया और स्वादिष्ट।</p>
            <div className="menu-grid">
              <div className="menu-item">🫓<b>Paneer Paratha</b></div>
              <div className="menu-item">🥣<b>Idli</b></div>
              <div className="menu-item">🍝<b>Pasta</b></div>
              <div className="menu-item">🍕<b>Pizza</b></div>
            </div>
          </section>

          <section className="plans-section">
            <span className="tag">OUR SUBSCRIPTION</span>
            <h2>अपना लंच प्लान चुनें</h2>
            <p>बच्चों के लिए सुविधाजनक टिफिन सब्सक्रिप्शन।</p>
            <div className="plans">
              <div className="plan-card">
                <span className="plan-label">WEEKLY PLAN</span>
                <h3>साप्ताहिक प्लान</h3>
                <div className="price">₹599</div>
                <p>7 दिन की अवधि</p>
                <p>सोमवार से शनिवार डिलीवरी</p>
                <button type="button" onClick={choosePlan}>यह प्लान चुनें</button>
              </div>
              <div className="plan-card popular">
                <span className="plan-label">MONTHLY PLAN</span>
                <h3>मासिक प्लान</h3>
                <div className="price">₹1,999</div>
                <p>30 दिन की अवधि</p>
                <p>सोमवार से शनिवार डिलीवरी</p>
                <button type="button" onClick={choosePlan}>यह प्लान चुनें</button>
              </div>
            </div>
          </section>

          <section className="cta">
            <h2>बच्चों के लंच की चिंता अब खत्म!</h2>
            <p>आज ही KANHA BITES के साथ जुड़ें।</p>
            <button className="main-btn" type="button" onClick={() => setPage("register")}>Register Now</button>
          </section>
        </>
      )}

      {(page === "login" || page === "register") && (
        <section className="form-section">
          <div className="form-card">
            <button
              className="back-btn"
              type="button"
              onClick={() => { setPage("home"); setMessage(""); }}
            >
              ← वापस जाएँ
            </button>
            <div className="form-icon">🍱</div>
            <h2>{page === "register" ? "Customer Registration" : "Welcome Back!"}</h2>
            <p>{page === "register" ? "KANHA BITES के साथ जुड़ने के लिए जानकारी भरें।" : "अपने अकाउंट में लॉगिन करें।"}</p>

            <form onSubmit={(event) => void handleSubmit(event)}>
              {page === "register" && (
                <>
                  <label>आपका नाम</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="अपना पूरा नाम लिखें" required />
                  <label>मोबाइल नंबर</label>
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10 अंकों का मोबाइल नंबर" pattern="[0-9]{10}" required />
                </>
              )}
              <label>Email Address</label>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="अपना ईमेल लिखें" autoComplete="email" required />
              <label>Password</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="पासवर्ड लिखें" minLength={6} autoComplete={page === "register" ? "new-password" : "current-password"} required />
              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? "कृपया प्रतीक्षा करें..." : page === "register" ? "Registration करें" : "Login करें"}
              </button>
            </form>

            {page === "register" && (
              <button type="button" disabled={submitting} onClick={() => void handleResendConfirmation()} style={{ marginTop: 12 }}>
                Resend Confirmation Email
              </button>
            )}
            {message && <div className="success-message">{message}</div>}
            <p className="switch-page">
              {page === "register" ? "पहले से अकाउंट है?" : "नया अकाउंट बनाना है?"}
              <button className="text-btn" type="button" onClick={() => { setPage(page === "register" ? "login" : "register"); setMessage(""); }}>
                {page === "register" ? "Login करें" : "Register करें"}
              </button>
            </p>
          </div>
        </section>
      )}

      <footer className="footer">
        <h3>🍱 KANHA BITES</h3>
        <p>Fresh Morning Tiffin for Happy Kids</p>
        <p>📍 कमलांचल, मुरलीपुरा, जयपुर</p>
        <p>📞 9116080032</p>
        <p>Instagram: @kanhabitesjpr</p>
        <small>© 2026 KANHA BITES. All Rights Reserved.</small>
      </footer>
    </div>
  );
}

