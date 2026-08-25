import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type SiteSettings = {
  id: number;
  site_name: string | null;
  logo_url: string | null;
  phone: string | null;
  line_url: string | null;
  business_hours: string | null;
  concept: string | null;
  description: string | null;
  main_image_url: string | null;
  updated_at: string | null;
};

export default function SiteSettings() {
  const [settings, setSettings] =
    useState<SiteSettings | null>(null);

  const [siteName, setSiteName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [concept, setConcept] = useState("");
  const [description, setDescription] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("site_settings")
      .select(`
        id,
        site_name,
        logo_url,
        phone,
        line_url,
        business_hours,
        concept,
        description,
        main_image_url,
        updated_at
      `)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("サイト設定取得エラー:", error);

      setErrorMessage(
        `サイト設定の取得に失敗しました: ${error.message}`
      );

      setLoading(false);
      return;
    }

    if (!data) {
      setErrorMessage(
        "site_settings に設定データが登録されていません。"
      );

      setLoading(false);
      return;
    }

    const settingsData = data as SiteSettings;

    setSettings(settingsData);

    setSiteName(settingsData.site_name || "");
    setLogoUrl(settingsData.logo_url || "");
    setPhone(settingsData.phone || "");
    setLineUrl(settingsData.line_url || "");
    setBusinessHours(
      settingsData.business_hours || ""
    );
    setConcept(settingsData.concept || "");
    setDescription(
      settingsData.description || ""
    );
    setMainImageUrl(
      settingsData.main_image_url || ""
    );

    setLoading(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!settings) {
      return;
    }

    if (!siteName.trim()) {
      setErrorMessage("サイト名を入力してください。");
      setSuccessMessage("");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      site_name: siteName.trim(),
      logo_url: logoUrl.trim() || null,
      phone: phone.trim() || null,
      line_url: lineUrl.trim() || null,
      business_hours:
        businessHours.trim() || null,
      concept: concept.trim() || null,
      description:
        description.trim() || null,
      main_image_url:
        mainImageUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("site_settings")
      .update(payload)
      .eq("id", settings.id);

    if (error) {
      console.error("サイト設定更新エラー:", error);

      setErrorMessage(
        `サイト設定の更新に失敗しました: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setSettings({
      ...settings,
      ...payload,
    });

    setSuccessMessage(
      "サイト設定を保存しました。"
    );

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
        サイト設定を読み込んでいます...
      </main>
    );
  }

  if (!settings) {
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
            {errorMessage ||
              "サイト設定が見つかりません。"}
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
            サイト設定
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
            }}
          >
            サイト全体の基本情報を管理します。
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

        {successMessage && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              padding: "14px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "12px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <FormField
              label="サイト名"
              required
              value={siteName}
              onChange={setSiteName}
              placeholder="例：銀座○○"
            />

            <FormField
              label="ロゴURL"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="https://..."
              type="url"
            />

            <FormField
              label="電話番号"
              value={phone}
              onChange={setPhone}
              placeholder="例：03-1234-5678"
              type="tel"
            />

            <FormField
              label="LINE URL"
              value={lineUrl}
              onChange={setLineUrl}
              placeholder="https://line.me/..."
              type="url"
            />

            <FormField
              label="営業時間"
              value={businessHours}
              onChange={setBusinessHours}
              placeholder="例：10:00〜翌2:00"
            />

            <FormField
              label="コンセプト"
              value={concept}
              onChange={setConcept}
              placeholder="サイトや店舗のコンセプト"
            />

            <div
              style={{
                marginBottom: "25px",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#333",
                }}
              >
                サイト説明
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                rows={7}
                placeholder="サイトについての説明を入力してください。"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "7px",
                  fontSize: "14px",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            <FormField
              label="メイン画像URL"
              value={mainImageUrl}
              onChange={setMainImageUrl}
              placeholder="https://..."
              type="url"
            />

            <div
              style={{
                marginTop: "10px",
                marginBottom: "25px",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "13px",
                  color: "#777",
                }}
              >
                現在のメイン画像
              </p>

              {mainImageUrl ? (
                <img
                  src={mainImageUrl}
                  alt="メイン画像"
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: "300px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    border: "1px solid #eee",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : (
                <div
                  style={{
                    padding: "30px",
                    background: "#f9fafb",
                    border:
                      "1px solid #eee",
                    borderRadius: "8px",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  画像が設定されていません
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                padding: "14px",
                background: saving
                  ? "#9ca3af"
                  : "#111",
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
                : "サイト設定を保存"}
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
    <div
      style={{
        marginBottom: "22px",
      }}
    >
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