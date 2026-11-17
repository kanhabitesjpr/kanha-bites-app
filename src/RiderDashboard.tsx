import RiderDeliveryOTP from "./RiderDeliveryOTP";
import RiderDeliveryOrders from "./RiderDeliveryOrders";

type Props = {
  user: any;
  onLogout: () => void;
};

export default function RiderDashboard({ user, onLogout }: Props) {
  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>🍱 KANHA BITES</h1>
          <p style={{ margin: "5px 0 0", color: "#647067" }}>Rider Delivery Panel</p>
          <p style={{ margin: "5px 0 0", fontWeight: 600 }}>
            नमस्ते, {user?.user_metadata?.full_name || user?.email || "Rider"}
          </p>
        </div>
        <button type="button" onClick={onLogout} style={logoutButtonStyle}>
          Logout
        </button>
      </header>

      <RiderDeliveryOrders />
      <RiderDeliveryOTP />
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1000,
  margin: "0 auto",
  padding: 20,
  boxSizing: "border-box",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 14,
  padding: 18,
  borderRadius: 16,
  background: "#fffefa",
  border: "1px solid #e5e9e5",
};

const logoutButtonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: "11px 18px",
  background: "#21633c",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer",
};

