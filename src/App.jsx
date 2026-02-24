import "./App.css";
import AuthModal from "./AuthModal";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import MapBackground from "./MapBackground";

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ thêm state này
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="app">
      {/* ✅ Nút menu chỉ cần trên mobile (CSS sẽ xử lý hiển thị) */}
      <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Menu">
        ☰
      </button>

      {/* ✅ nền mờ khi mở sidebar */}
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}

      <div className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <h1 className="title">RATDELand</h1>
          <p className="subtitle">Dự án bản đồ tiện ích</p>
        </div>

        <div className="auth">
          {!user && <p className="status warn">Chưa đăng nhập</p>}
          {user && <p className="status ok">Đã đăng nhập: {user.email}</p>}

          {!user ? (
            <button
              className="btn"
              onClick={() => {
                setAuthOpen(true);
                setMenuOpen(false);
              }}
            >
              Đăng nhập / Đăng ký
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => {
                logout();
                setMenuOpen(false);
              }}
            >
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      <div className="main">
        <MapBackground user={user} onRequireAuth={() => setAuthOpen(true)} />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}