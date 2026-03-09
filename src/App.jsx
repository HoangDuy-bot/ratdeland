import "./App.css";
import AuthModal from "./AuthModal";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import MapBackground from "./MapBackground";

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ NEW: kiểm tra quyền approved
  const [approved, setApproved] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // ✅ thêm state mở/đóng sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ✅ Auto: width <= 768 OR height <= 500
  const [isAutoCompact, setIsAutoCompact] = useState(
    window.innerWidth <= 768 || window.innerHeight <= 500
  );

  // null = AUTO, "compact" = ép 3 gạch, "desktop" = ép mở rộng
  const [forceMode, setForceMode] = useState(null);

  const compactMode =
    forceMode === "compact" ? true :
    forceMode === "desktop" ? false :
    isAutoCompact;

  const isForcedCompact = forceMode === null && isAutoCompact;

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

  const logout = async () => {
    await supabase.auth.signOut();
  };

  // 1) lấy user + lắng nghe auth
  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser((prev) => {
      const next = data.user ?? null;
      if (prev?.id === next?.id) return prev;
      return next;
    });
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser((prev) => {
      const next = session?.user ?? null;
      if (prev?.id === next?.id) return prev;
      return next;
    });
  });

  return () => listener.subscription.unsubscribe();
}, []);

  // 2) auto compact khi resize
  useEffect(() => {
    const onResize = () => {
      setIsAutoCompact(window.innerWidth <= 768 || window.innerHeight <= 500);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ NEW: auto mở modal khi chưa login
  useEffect(() => {
    if (!user) setAuthOpen(true);
  }, [user]);

  // ✅ NEW: load quyền từ user_access để chặn map
  useEffect(() => {
  const loadAccess = async () => {
    if (!user?.id) {
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
}, [user?.id]);

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
      {compactMode && sidebarOpen && (
        <div className="backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {!isForcedCompact && (
        <button
          className={`panel-toggle ${compactMode ? "is-compact" : "is-desktop"} ${
            compactMode && !sidebarOpen ? "is-closed" : ""
          }`}
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

      {/* Map / Gate */}
      <div className="main" onClick={() => compactMode && setSidebarOpen(false)}>
        {checkingAccess ? (
          <div style={{ padding: 24, color: "white" }}>
            Đang kiểm tra quyền truy cập...
          </div>
        ) : !user ? (
          <div style={{ padding: 24, color: "white" }}>
            Vui lòng đăng nhập để sử dụng.
          </div>
        ) : !approved ? (
          <div style={{ padding: 24, color: "white" }}>
            Tài khoản của bạn chưa được duyệt hoặc đã hết hạn.
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={logout}>Đăng xuất</button>
            </div>
          </div>
        ) : (
          <MapBackground
            user={user}
            approved={approved}
            onRequireAuth={() => setAuthOpen(true)}
            uiLocked={sidebarOpen || authOpen}
            isForcedCompact={isForcedCompact}
          />
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}