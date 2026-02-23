import AuthModal from "./AuthModal";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import MapBackground from "./MapBackground";

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // (cái test này giữ cũng được)
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase.from("provinces").select("*");
      console.log("DATA:", data);
      console.log("ERROR:", error);
    };
    test();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <h1 style={styles.title}>RATDELand</h1>
        <p style={styles.subtitle}>Dự án bản đồ tiện ích</p>

        {!user && <p style={{ color: "#fbbf24" }}>Chưa đăng nhập</p>}
        {user && <p style={{ color: "#34d399" }}>Đã đăng nhập: {user.email}</p>}

        {!user ? (
          <button style={styles.button} onClick={() => setAuthOpen(true)}>
            Đăng nhập / Đăng ký
          </button>
        ) : (
          <button style={styles.button} onClick={logout}>
            Đăng xuất
          </button>
        )}
      </div>

      <div style={styles.right}>
        <MapBackground
          user={user}
          onRequireAuth={() => setAuthOpen(true)}
        />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: "20px",
    display: "flex",
    overflow: "hidden",
    borderRadius: "16px",
  },
  left: {
    flex: "0 0 20%",
    background: "#0f172a",
    color: "white",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  right: { flex: 1, position: "relative", background: "#fff" },
  title: { fontSize: "48px", fontWeight: "900", margin: 0, color: "#0ea5e9" },
  subtitle: { marginTop: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 },
  button: {
    marginTop: 20,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: "#6366f1",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
  },
};