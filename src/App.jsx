import "./App.css";
import AuthModal from "./AuthModal";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import MapBackground from "./MapBackground";

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ thêm state mở/đóng sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""} ${authOpen ? "modal-open" : ""}`}>
      {/* ✅ nút mở menu (chỉ hiện ở mobile nhờ CSS) */}
      <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
        ☰
      </button>

      {/* ✅ backdrop (mobile) */}
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <h1 className="title">RATDELand</h1>
          <p
            className="subtitle"
            style={{
              cursor: "pointer",
              color: "#0ea5e9",
              fontWeight: "700",
            }}
            onClick={() => {
              window.open(
                "https://drive.google.com/file/d/1R35Eq1Tul6ZZkP7WW-k7VWDpWTN75oQh/view?usp=drive_link",
                "_blank"
              );
              window.open(
                "https://youtu.be/LVHt2UEkX10?si=XNqbyVMWFNRCKQKr",
                "_blank"
              );
            }}
            >
            Phần mềm địa chính
          </p>
        </div>

        <div className="auth">
          {!user && <p className="status warn">Chưa đăng nhập</p>}
          {user && <p className="status ok">Đã đăng nhập: {user.email}</p>}

          {!user ? (
            <button
              className="btn"
              onClick={() => {
                setAuthOpen(true);
                setSidebarOpen(false); // ✅ đóng drawer khi mở modal
              }}
            >
              Đăng nhập / Đăng ký
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                logout();
                setSidebarOpen(false);
              }}
            >
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="main" onClick={() => setSidebarOpen(false)}>
        <MapBackground
            user={user}
            onRequireAuth={() => setAuthOpen(true)}
            uiLocked={sidebarOpen || authOpen}
          />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}