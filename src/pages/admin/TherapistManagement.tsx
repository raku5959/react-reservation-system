import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Therapist = {
  id: number;
  name: string;
  profile?: string | null;
  phone?: string | null;
  image_url?: string | null;
  is_active?: boolean | null;
};

const emptyForm = {
  name: "",
  profile: "",
  phone: "",
  image_url: "",
  is_active: true,
};

export default function TherapistManagement() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTherapists();
  }, []);

  async function loadTherapists() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("therapists")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("THERAPIST LOAD ERROR:", error);
      setError(`セラピスト取得エラー: ${error.message}`);
      setLoading(false);
      return;
    }

    setTherapists(data ?? []);
    setLoading(false);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  }

  function startEdit(therapist: Therapist) {
    setEditingId(therapist.id);

    setForm({
      name: therapist.name || "",
      profile: therapist.profile || "",
      phone: therapist.phone || "",
      image_url: therapist.image_url || "",
      is_active: therapist.is_active !== false,
    });

    setError("");
    setMessage("");
  }

  async function saveTherapist() {
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("セラピスト名を入力してください");
      return;
    }

    setSaving(true);

    try {
      if (editingId === null) {
        const { error } = await supabase
          .from("therapists")
          .insert({
            name: form.name.trim(),
            profile: form.profile.trim() || null,
            phone: form.phone.trim() || null,
            image_url: form.image_url.trim() || null,
            is_active: form.is_active,
          });

        if (error) {
          throw new Error(`セラピスト登録エラー: ${error.message}`);
        }

        setMessage("セラピストを登録しました");
      } else {
        const { error } = await supabase
          .from("therapists")
          .update({
            name: form.name.trim(),
            profile: form.profile.trim() || null,
            phone: form.phone.trim() || null,
            image_url: form.image_url.trim() || null,
            is_active: form.is_active,
          })
          .eq("id", editingId);

        if (error) {
          throw new Error(`セラピスト更新エラー: ${error.message}`);
        }

        setMessage("セラピスト情報を更新しました");
      }

      await loadTherapists();

      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      console.error("THERAPIST SAVE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "セラピストの保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteTherapist(id: number) {
    const therapist = therapists.find((item) => item.id === id);

    if (
      !window.confirm(
        `「${therapist?.name || "このセラピスト"}」を削除しますか？`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("therapists")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("THERAPIST DELETE ERROR:", error);
      setError(`セラピスト削除エラー: ${error.message}`);
      return;
    }

    setMessage("セラピストを削除しました");

    if (editingId === id) {
      startNew();
    }

    await loadTherapists();
  }

  if (loading) {
    return (
      <main style={{ padding: "80px 20px", textAlign: "center" }}>
        セラピスト情報を読み込み中...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "40px 20px 80px",
        color: "#111",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "30px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                letterSpacing: "4px",
                color: "#777",
              }}
            >
              THERAPIST MANAGEMENT
            </p>

            <h1 style={{ margin: "6px 0 0", fontSize: "28px" }}>
              セラピスト管理
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              to="/admin"
              style={{
                textDecoration: "none",
                color: "#111",
                background: "#fff",
                padding: "10px 16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
              }}
            >
              管理画面
            </Link>

            <Link
              to="/admin/reservation-calendar"
              style={{
                textDecoration: "none",
                color: "#111",
                background: "#fff",
                padding: "10px 16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
              }}
            >
              予約カレンダー
            </Link>

            <button
              type="button"
              onClick={startNew}
              style={{
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ＋ 新規登録
            </button>
          </div>
        </header>

        {error && (
          <div
            style={{
              padding: "15px",
              marginBottom: "20px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: "8px",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "15px",
              marginBottom: "20px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              borderRadius: "8px",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px, 1fr) minmax(350px, 1.4fr)",
            gap: "25px",
          }}
        >
          <section
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {editingId === null ? "新規登録" : "セラピスト編集"}
            </h2>

            <div style={{ display: "grid", gap: "15px" }}>
              <label>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  セラピスト名 *
                </div>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="例：さと"
                  style={{
                    width: "100%",
                    padding: "11px",
                    boxSizing: "border-box",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  電話番号
                </div>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                  placeholder="090-1234-5678"
                  style={{
                    width: "100%",
                    padding: "11px",
                    boxSizing: "border-box",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  プロフィール
                </div>

                <textarea
                  value={form.profile}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      profile: e.target.value,
                    })
                  }
                  rows={5}
                  placeholder="プロフィール・紹介文"
                  style={{
                    width: "100%",
                    padding: "11px",
                    boxSizing: "border-box",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    resize: "vertical",
                  }}
                />
              </label>

              <label>
                <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
                  画像URL
                </div>

                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      image_url: e.target.value,
                    })
                  }
                  placeholder="画像URL"
                  style={{
                    width: "100%",
                    padding: "11px",
                    boxSizing: "border-box",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                  }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      is_active: e.target.checked,
                    })
                  }
                />

                <span style={{ fontWeight: "bold" }}>
                  お客様側に表示する
                </span>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={startNew}
                  style={{
                    padding: "12px",
                    background: "#f3f4f6",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  クリア
                </button>

                <button
                  type="button"
                  onClick={saveTherapist}
                  disabled={saving}
                  style={{
                    padding: "12px",
                    background: saving ? "#999" : "#111",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {saving
                    ? "保存中..."
                    : editingId === null
                    ? "登録する"
                    : "変更を保存"}
                </button>
              </div>
            </div>
          </section>

          <section
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: "12px",
              padding: "25px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0 }}>登録済みセラピスト</h2>
              <strong>{therapists.length}名</strong>
            </div>

            {therapists.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#777",
                  border: "1px dashed #ccc",
                  borderRadius: "8px",
                }}
              >
                セラピストが登録されていません。
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {therapists.map((therapist) => (
                  <article
                    key={therapist.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "15px",
                      padding: "15px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                      }}
                    >
                      {therapist.image_url ? (
                        <img
                          src={therapist.image_url}
                          alt={therapist.name}
                          style={{
                            width: "60px",
                            height: "60px",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            background: "#eee",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#999",
                            fontSize: "12px",
                          }}
                        >
                          NO IMAGE
                        </div>
                      )}

                      <div>
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "bold",
                          }}
                        >
                          {therapist.name}
                        </div>

                        <div
                          style={{
                            marginTop: "4px",
                            fontSize: "13px",
                            color: "#777",
                          }}
                        >
                          ID: {therapist.id}
                        </div>

                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "6px",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            background:
                              therapist.is_active === false
                                ? "#fee2e2"
                                : "#dcfce7",
                            color:
                              therapist.is_active === false
                                ? "#991b1b"
                                : "#166534",
                          }}
                        >
                          {therapist.is_active === false
                            ? "非表示"
                            : "表示中"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(therapist)}
                        style={{
                          padding: "8px 12px",
                          background: "#111",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTherapist(therapist.id)}
                        style={{
                          padding: "8px 12px",
                          background: "#fff",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}