import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    if (!password) {
      setErrorMessage("パスワードを入力してください。");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("ログインエラー:", error);

        setErrorMessage(
          "ログインに失敗しました。メールアドレスまたはパスワードを確認してください。"
        );

        setLoading(false);
        return;
      }

      navigate("/admin", {
        replace: true,
      });
    } catch (error) {
      console.error("ログイン処理エラー:", error);

      setErrorMessage(
        "ログイン処理中にエラーが発生しました。"
      );

      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <div style={loginCardStyle}>
        <div style={headerStyle}>
          <p style={eyebrowStyle}>
            ADMIN LOGIN
          </p>

          <h1 style={titleStyle}>
            管理画面ログイン
          </h1>

          <p style={subtitleStyle}>
            店舗管理システムにログインしてください。
          </p>
        </div>

        {errorMessage && (
          <div style={errorStyle}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={fieldStyle}>
            <label style={labelStyle}>
              メールアドレス
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="メールアドレス"
              autoComplete="email"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>
              パスワード
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="パスワード"
              autoComplete="current-password"
              style={inputStyle}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "ログイン中..."
              : "ログイン"}
          </button>
        </form>
      </div>
    </main>
  );
}

/* =====================================================
   スタイル
===================================================== */

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f5f6f8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  boxSizing: "border-box",
};

const loginCardStyle: CSSProperties = {
  width: "100%",
  maxWidth: "430px",
  background: "#fff",
  borderRadius: "14px",
  padding: "35px",
  boxSizing: "border-box",
  boxShadow: "0 5px 25px rgba(0,0,0,0.08)",
};

const headerStyle: CSSProperties = {
  marginBottom: "25px",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  letterSpacing: "4px",
  color: "#999",
};

const titleStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: "28px",
  color: "#111",
};

const subtitleStyle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "14px",
  color: "#777",
};

const fieldStyle: CSSProperties = {
  marginBottom: "18px",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#555",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: "46px",
  padding: "0 12px",
  border: "1px solid #ddd",
  borderRadius: "7px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  height: "48px",
  marginTop: "5px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 600,
};

const errorStyle: CSSProperties = {
  padding: "13px",
  marginBottom: "20px",
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#be123c",
  borderRadius: "7px",
  fontSize: "13px",
};