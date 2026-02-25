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
  // ✅ Auto: width <= 768 OR height <= 768
const [isAutoCompact, setIsAutoCompact] = useState(
  window.innerWidth <= 768 || window.innerHeight <= 500
);

const handleToggleCompact = () => {
  if (compactMode) {
    // đang 3 gạch -> ép mở rộng desktop
    setForceMode("desktop");
    setSidebarOpen(false);
  } else {
    // đang desktop -> ép thu nhỏ 3 gạch
    setForceMode("compact");
    setSidebarOpen(false);
  }
};

// null = AUTO, "compact" = ép 3 gạch, "desktop" = ép mở rộng
const [forceMode, setForceMode] = useState(null);

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

  useEffect(() => {
  const onResize = () => {
    setIsAutoCompact(window.innerWidth <= 768 || window.innerHeight <= 500);
  };

  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

  const compactMode =
  forceMode === "compact" ? true :
  forceMode === "desktop" ? false :
  isAutoCompact;

return (
   <div
  className={`app ${compactMode ? "compact" : ""} ${sidebarOpen ? "sidebar-open" : ""} ${
    authOpen ? "modal-open" : ""
  }`}
>
      {/* ✅ nút mở menu (chỉ hiện ở mobile nhờ CSS) */}
     {compactMode && (
      <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Menu">
        ☰
      </button>
      )}

      {/* ✅ backdrop (mobile) */}
      {compactMode && sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}

     <button
        className={`panel-toggle ${compactMode ? "is-compact" : "is-desktop"} ${
          compactMode && !sidebarOpen ? "is-closed" : ""
        }`}
        onClick={handleToggleCompact}
        title={compactMode ? "Mở rộng" : "Thu nhỏ"}
        >
        {compactMode ? ">" : "<"}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
       
        <div className="brand">
          <h1 className="title">RATDELand</h1>
          <p
            className="subtitle"
            style={{
              cursor: "pointer",
              color: "#ef4444",   // đỏ đẹp (Tailwind red-500)
              fontWeight: "800",  // đậm hơn
              fontSize: "18px",   // to hơn một chút
            }}
            onClick={() => {
              window.open(
                "https://youtu.be/LVHt2UEkX10?si=XNqbyVMWFNRCKQKr",
                "_blank"
              );
            }}
          >
            Phần mềm địa chính RATDE
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
      <div className="main" onClick={() => compactMode && setSidebarOpen(false)}>
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