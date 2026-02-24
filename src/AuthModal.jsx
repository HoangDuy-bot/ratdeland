import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
  if (!open) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handleAuth = async () => {
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("✅ Đăng ký thành công.");
     } else {
     const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // ✅ THÊM DÒNG NÀY: đá tất cả thiết bị khác
        await supabase.auth.signOut({ scope: "others" });

        setMsg("✅ Đăng nhập thành công!");
        onClose?.();
            }
    } catch (e) {
      setMsg(`❌ ${e.message || "Có lỗi xảy ra"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0 }}>
            {mode === "login" ? "Đăng nhập" : "Đăng ký"}
          </h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={styles.label}>Mật khẩu</label>
          <input
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
          />
        </div>

        {msg && (
          <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
            {msg}
          </div>
        )}

        <button
          style={{ ...styles.primaryBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleAuth}
          disabled={loading || !email || !password}
        >
          {loading ? "Đang xử lý..." : (mode === "login" ? "Đăng nhập" : "Đăng ký")}
        </button>

        <div style={{ marginTop: 12, fontSize: 14 }}>
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <button style={styles.linkBtn} onClick={() => setMode("signup")}>
                Đăng ký
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button style={styles.linkBtn} onClick={() => setMode("login")}>
                Đăng nhập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    background: "#0b1220",
    color: "white",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
  },
  label: { display: "block", fontSize: 13, opacity: 0.8, marginBottom: 6 },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    outline: "none",
  },
  primaryBtn: {
    marginTop: 14,
    width: "100%",
    padding: "12px 12px",
    borderRadius: 10,
    border: "none",
    background: "#6366f1",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 16,
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#60a5fa",
    cursor: "pointer",
    padding: 0,
    fontWeight: 700,
  },
};