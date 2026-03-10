import "./App.css";
import AuthModal from "./AuthModal";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import MapBackground from "./MapBackground";

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [approved, setApproved] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isAutoCompact, setIsAutoCompact] = useState(
    window.innerWidth <= 768 || window.innerHeight <= 500
  );

  const [forceMode, setForceMode] = useState(null);

  const compactMode =
    forceMode === "compact"
      ? true
      : forceMode === "desktop"
      ? false
      : isAutoCompact;

  const isForcedCompact = forceMode === null && isAutoCompact;

  const handleToggleCompact = () => {
    if (compactMode) {
      setForceMode("desktop");
      setSidebarOpen(false);
    } else {
      setForceMode("compact");
      setSidebarOpen(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // lấy user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // auto compact
  useEffect(() => {
    const onResize = () => {
      setIsAutoCompact(
        window.innerWidth <= 768 || window.innerHeight <= 500
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // mở modal nếu chưa login
  useEffect(() => {
    if (!user) setAuthOpen(true);
  }, [user]);

  // load quyền user_access
  useEffect(() => {
    const loadAccess = async () => {
      if (!user) {
        setApproved(false);
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(true);

      const { data, error } = await supabase
        .from("user_access")
        .select("approved, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.log("user_access error:", error);
        setApproved(false);
        setCheckingAccess(false);
        return;
      }

      const okApproved = data?.approved === true;
      const okNotExpired =
        !data?.expires_at || new Date(data.expires_at) > new Date();

      const allowed = okApproved && okNotExpired;

      setApproved(allowed);
      setCheckingAccess(false);

      if (!allowed) {
        await supabase.auth.signOut();
        setAuthOpen(true);
      }
    };

    loadAccess();
  }, [user]);

  return (
    <div
      className={`app ${compactMode ? "compact" : ""} ${
        sidebarOpen ? "sidebar-open" : ""
      } ${authOpen ? "modal-open" : ""}`}
    >
      {compactMode && (
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Menu"
        >
          ☰
        </button>
      )}

      {compactMode && sidebarOpen && (
        <div className="backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {!isForcedCompact && (
        <button
          className={`panel-toggle ${
            compactMode ? "is-compact" : "is-desktop"
          } ${compactMode && !sidebarOpen ? "is-closed" : ""}`}
          onClick={handleToggleCompact}
          title={compactMode ? "Mở rộng" : "Thu nhỏ"}
        >
          {compactMode ? ">" : "<"}
        </button>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <h1 className="title">RATDELand</h1>

          <p
            className="subtitle"
            style={{
              cursor: "pointer",
              color: "#ef4444",
              fontWeight: "800",
              fontSize: "18px",
            }}
            onClick={() =>
              window.open(
                "https://youtu.be/LVHt2UEkX10?si=XNqbyVMWFNRCKQKr",
                "_blank"
              )
            }
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
                setSidebarOpen(false);
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
      <div
        className="main"
        onClick={() => compactMode && setSidebarOpen(false)}
      >
        {/* MAP LUÔN TỒN TẠI */}
        <MapBackground
          user={user}
          approved={approved}
          onRequireAuth={() => setAuthOpen(true)}
          uiLocked={sidebarOpen || authOpen || !approved}
          isForcedCompact={isForcedCompact}
        />

        {/* Overlay kiểm tra quyền */}
        {checkingAccess && (
          <div style={overlayStyle}>
            Đang kiểm tra quyền truy cập...
          </div>
        )}

        {!user && (
          <div style={overlayStyle}>
            Vui lòng đăng nhập để sử dụng.
          </div>
        )}

        {user && !approved && (
          <div style={overlayStyle}>
            Tài khoản của bạn chưa được duyệt hoặc đã hết hạn.
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={logout}>
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  color: "white",
  padding: 24,
  zIndex: 10000,
};