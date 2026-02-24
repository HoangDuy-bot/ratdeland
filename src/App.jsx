import "./App.css";
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

  return (
    <div className="app">
      {/* Sidebar / Topbar */}
      <div className="sidebar">
        <div className="brand">
          <h1 className="title">RATDELand</h1>
          <p className="subtitle">Dự án bản đồ tiện ích</p>
        </div>

        <div className="auth">
          {!user && <p className="status warn">Chưa đăng nhập</p>}
          {user && <p className="status ok">Đã đăng nhập: {user.email}</p>}

          {!user ? (
            <button className="btn" onClick={() => setAuthOpen(true)}>
              Đăng nhập / Đăng ký
            </button>
          ) : (
            <button className="btn" onClick={logout}>
              Đăng xuất
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="main">
        <MapBackground user={user} onRequireAuth={() => setAuthOpen(true)} />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}