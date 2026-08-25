import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Customer = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
};

export default function CustomerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!id) {
      setErrorMessage("顧客IDが指定されていません。");
      setLoading(false);
      return;
    }

    const customerId = Number(id);

    if (Number.isNaN(customerId) || customerId <= 0) {
      setErrorMessage("顧客IDが正しくありません。");
      setLoading(false);
      return;
    }

    loadCustomer(customerId);
  }, [id]);

  async function loadCustomer(customerId: number) {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, email, note")
      .eq("id", customerId)
      .maybeSingle();

    if (error) {
      console.error("顧客取得エラー:", error);

      setErrorMessage(
        `顧客情報の取得に失敗しました: ${error.message}`
      );

      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMessage(
        `顧客ID「${customerId}」の顧客情報が見つかりません。`
      );

      setLoading(false);
      return;
    }

    const customerData = data as Customer;

    setCustomer(customerData);

    setName(customerData.name || "");
    setPhone(customerData.phone || "");
    setEmail(customerData.email || "");
    setNote(customerData.note || "");

    setLoading(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!customer) {
      return;
    }

    if (!name.trim()) {
      setErrorMessage("顧客名を入力してください。");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        note: note.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id)
      .select("id, name, phone, email, note")
      .single();

    if (error) {
      console.error("顧客更新エラー:", error);

      setErrorMessage(
        `顧客情報の更新に失敗しました: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setCustomer(data as Customer);

    alert("顧客情報を更新しました。");

    navigate(`/admin/customers/${customer.id}`);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6f8",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        顧客情報を読み込んでいます...
      </main>
    );
  }

  if (!customer) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6f8",
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "700px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #ffcaca",
              color: "#c62828",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {errorMessage || "顧客情報が見つかりません。"}
          </div>

          <Link
            to="/admin/customers"
            style={{
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            ← 顧客管理へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        padding: "30px 20px 60px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <Link
            to={`/admin/customers/${customer.id}`}
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            ← 顧客詳細へ戻る
          </Link>
        </div>

        <header
          style={{
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              color: "#222",
            }}
          >
            顧客情報を編集
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
            }}
          >
            顧客ID：{customer.id}
          </p>
        </header>

        {errorMessage && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #ffcaca",
              color: "#c62828",
              padding: "14px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <FormField
              label="顧客名"
              required
              value={name}
              onChange={setName}
              placeholder="例：山田 太郎"
            />

            <FormField
              label="電話番号"
              value={phone}
              onChange={setPhone}
              placeholder="例：090-1234-5678"
              type="tel"
            />

            <FormField
              label="メールアドレス"
              value={email}
              onChange={setEmail}
              placeholder="例：example@email.com"
              type="email"
            />

            <div style={{ marginBottom: "25px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                顧客メモ
              </label>

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={7}
                placeholder="顧客に関するメモを入力してください。"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "7px",
                  fontSize: "14px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <Link
                to={`/admin/customers/${customer.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px",
                  background: "#fff",
                  color: "#333",
                  border: "1px solid #d1d5db",
                  borderRadius: "7px",
                  textDecoration: "none",
                  boxSizing: "border-box",
                }}
              >
                キャンセル
              </Link>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "14px",
                  background: saving ? "#9ca3af" : "#111",
                  color: "#fff",
                  border: "none",
                  borderRadius: "7px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                {saving ? "保存しています..." : "変更を保存"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function FormField({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: "22px" }}>
      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: 600,
          color: "#333",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: "#dc2626",
              marginLeft: "5px",
            }}
          >
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px",
          border: "1px solid #d1d5db",
          borderRadius: "7px",
          fontSize: "14px",
          outline: "none",
        }}
      />
    </div>
  );
}