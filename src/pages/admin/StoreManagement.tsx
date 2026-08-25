import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Store = {
  id: number;
  name: string | null;
  address: string | null;
  access: string | null;
  phone: string | null;
  business_hours: string | null;
  map_url: string | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean | null;
};

export default function StoreManagement() {
  const [store, setStore] = useState<Store | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [access, setAccess] = useState("");
  const [phone, setPhone] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadStore();
  }, []);

  async function loadStore() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("stores")
      .select(`
        id,
        name,
        address,
        access,
        phone,
        business_hours,
        map_url,
        image_url,
        description,
        is_active
      `)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("店舗情報取得エラー:", error);

      setErrorMessage(
        `店舗情報の取得に失敗しました: ${error.message}`
      );

      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMessage("店舗情報が登録されていません。");
      setLoading(false);
      return;
    }

    const storeData = data as Store;

    setStore(storeData);

    setName(storeData.name || "");
    setAddress(storeData.address || "");
    setAccess(storeData.access || "");
    setPhone(storeData.phone || "");
    setBusinessHours(storeData.business_hours || "");
    setMapUrl(storeData.map_url || "");
    setImageUrl(storeData.image_url || "");
    setDescription(storeData.description || "");
    setIsActive(storeData.is_active ?? true);

    setLoading(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!store) {
      return;
    }

    if (!name.trim()) {
      setErrorMessage("店舗名を入力してください。");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("stores")
      .update({
        name: name.trim(),
        address: address.trim() || null,
        access: access.trim() || null,
        phone: phone.trim() || null,
        business_hours: businessHours.trim() || null,
        map_url: mapUrl.trim() || null,
        image_url: imageUrl.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    if (error) {
      console.error("店舗情報更新エラー:", error);

      setErrorMessage(
        `店舗情報の更新に失敗しました: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setStore({
      ...store,
      name: name.trim(),
      address: address.trim() || null,
      access: access.trim() || null,
      phone: phone.trim() || null,
      business_hours: businessHours.trim() || null,
      map_url: mapUrl.trim() || null,
      image_url: imageUrl.trim() || null,
      description: description.trim() || null,
      is_active: isActive,
    });

    alert("店舗情報を更新しました。");

    setSaving(false);
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
        店舗情報を読み込んでいます...
      </main>
    );
  }

  if (!store) {
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
            {errorMessage || "店舗情報がありません。"}
          </div>

          <Link
            to="/admin"
            style={{
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            ← 管理画面へ戻る
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
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <Link
            to="/admin"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            ← 管理画面へ戻る
          </Link>
        </div>

        <header style={{ marginBottom: "25px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              color: "#222",
            }}
          >
            店舗管理
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
            }}
          >
            店舗の基本情報を管理します。
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
              label="店舗名"
              required
              value={name}
              onChange={setName}
              placeholder="例：銀座○○"
            />

            <FormField
              label="住所"
              value={address}
              onChange={setAddress}
              placeholder="例：東京都中央区銀座..."
            />

            <FormField
              label="アクセス"
              value={access}
              onChange={setAccess}
              placeholder="例：銀座駅A5出口から徒歩3分"
            />

            <FormField
              label="電話番号"
              value={phone}
              onChange={setPhone}
              placeholder="例：03-1234-5678"
              type="tel"
            />

            <FormField
              label="営業時間"
              value={businessHours}
              onChange={setBusinessHours}
              placeholder="例：10:00〜翌2:00"
            />

            <FormField
              label="GoogleマップURL"
              value={mapUrl}
              onChange={setMapUrl}
              placeholder="https://maps.google.com/..."
              type="url"
            />

            <FormField
              label="店舗画像URL"
              value={imageUrl}
              onChange={setImageUrl}
              placeholder="画像URL"
              type="url"
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
                店舗説明
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={7}
                placeholder="店舗についての説明を入力してください。"
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
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "25px",
              }}
            >
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(event) =>
                  setIsActive(event.target.checked)
                }
              />

              <label
                htmlFor="isActive"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                店舗を公開・営業中として扱う
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                padding: "14px",
                background: saving ? "#9ca3af" : "#111",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontSize: "15px",
                fontWeight: "bold",
              }}
            >
              {saving
                ? "保存しています..."
                : "店舗情報を保存"}
            </button>
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
        onChange={(event) =>
          onChange(event.target.value)
        }
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