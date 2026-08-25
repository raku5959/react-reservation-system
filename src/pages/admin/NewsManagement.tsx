import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type News = {
  id: number;
  title: string | null;
  content: string | null;
  category: string | null;
  published_at: string | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const emptyForm = {
  title: "",
  content: "",
  category: "",
  published_at: "",
  is_published: false,
};

export default function NewsManagement() {
  const [newsList, setNewsList] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadNews();
  }, []);

  async function loadNews() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("news")
      .select(`
        id,
        title,
        content,
        category,
        published_at,
        is_published,
        created_at,
        updated_at
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("お知らせ取得エラー:", error);

      setErrorMessage(
        `お知らせの取得に失敗しました: ${error.message}`
      );

      setNewsList([]);
      setLoading(false);
      return;
    }

    setNewsList((data || []) as News[]);
    setLoading(false);
  }

  function startNewNews() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      published_at: getCurrentDateTimeLocal(),
    });

    setErrorMessage("");
    setShowForm(true);
  }

  function startEditNews(item: News) {
    setEditingId(item.id);

    setForm({
      title: item.title || "",
      content: item.content || "",
      category: item.category || "",
      published_at: item.published_at
        ? convertToDateTimeLocal(item.published_at)
        : "",
      is_published: item.is_published ?? false,
    });

    setErrorMessage("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.title.trim()) {
      setErrorMessage("タイトルを入力してください。");
      return;
    }

    if (!form.content.trim()) {
      setErrorMessage("本文を入力してください。");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const publishedAt = form.published_at
      ? new Date(form.published_at).toISOString()
      : null;

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category.trim() || null,
      published_at: publishedAt,
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };

    let error = null;

    if (editingId !== null) {
      const result = await supabase
        .from("news")
        .update(payload)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("news")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

      error = result.error;
    }

    if (error) {
      console.error("お知らせ保存エラー:", error);

      setErrorMessage(
        `お知らせの保存に失敗しました: ${error.message}`
      );

      setSaving(false);
      return;
    }

    alert(
      editingId !== null
        ? "お知らせを更新しました。"
        : "お知らせを登録しました。"
    );

    setSaving(false);
    closeForm();

    await loadNews();
  }

  async function togglePublished(item: News) {
    const newValue = !item.is_published;

    const label = newValue
      ? "公開"
      : "非公開";

    const confirmed = window.confirm(
      `「${item.title || "このお知らせ"}」を${label}に変更しますか？`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("news")
      .update({
        is_published: newValue,
        published_at: newValue
          ? item.published_at ||
            new Date().toISOString()
          : item.published_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      console.error(
        "お知らせ公開状態変更エラー:",
        error
      );

      setErrorMessage(
        `公開状態の変更に失敗しました: ${error.message}`
      );

      return;
    }

    await loadNews();
  }

  async function deleteNews(item: News) {
    const confirmed = window.confirm(
      `「${item.title || "このお知らせ"}」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error("お知らせ削除エラー:", error);

      setErrorMessage(
        `お知らせの削除に失敗しました: ${error.message}`
      );

      return;
    }

    alert("お知らせを削除しました。");

    await loadNews();
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        お知らせを読み込んでいます...
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
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
          }}
        >
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                color: "#222",
              }}
            >
              お知らせ管理
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              サイトのお知らせを管理します。
            </p>
          </div>

          <button
            type="button"
            onClick={startNewNews}
            style={{
              padding: "12px 20px",
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            ＋ 新規お知らせ
          </button>
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

        {showForm && (
          <section
            style={{
              background: "#fff",
              padding: "25px",
              borderRadius: "12px",
              marginBottom: "25px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                margin: "0 0 20px",
                fontSize: "21px",
              }}
            >
              {editingId !== null
                ? "お知らせを編集"
                : "新規お知らせ"}
            </h2>

            <form onSubmit={handleSubmit}>
              <FormField
                label="タイトル"
                required
                value={form.title}
                onChange={(value) =>
                  setForm({
                    ...form,
                    title: value,
                  })
                }
                placeholder="例：新コース開始のお知らせ"
              />

              <FormField
                label="カテゴリ"
                value={form.category}
                onChange={(value) =>
                  setForm({
                    ...form,
                    category: value,
                  })
                }
                placeholder="例：キャンペーン"
              />

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
                  本文
                  <span
                    style={{
                      color: "#dc2626",
                      marginLeft: "5px",
                    }}
                  >
                    *
                  </span>
                </label>

                <textarea
                  value={form.content}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      content:
                        event.target.value,
                    })
                  }
                  rows={10}
                  placeholder="お知らせ本文を入力してください。"
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
                  公開日時
                </label>

                <input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      published_at:
                        event.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "7px",
                    fontSize: "14px",
                  }}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_published:
                        event.target.checked,
                    })
                  }
                />

                公開する
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={{
                    padding: "13px",
                    background: "#fff",
                    color: "#333",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "7px",
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "13px",
                    background: saving
                      ? "#9ca3af"
                      : "#111",
                    color: "#fff",
                    border: "none",
                    borderRadius: "7px",
                    cursor: saving
                      ? "not-allowed"
                      : "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {saving
                    ? "保存しています..."
                    : "保存する"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section
          style={{
            background: "#fff",
            borderRadius: "12px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "20px 24px",
              borderBottom:
                "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              お知らせ一覧
            </h2>

            <span
              style={{
                fontSize: "13px",
                color: "#777",
              }}
            >
              {newsList.length}件
            </span>
          </div>

          {newsList.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              お知らせが登録されていません。
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1000px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      タイトル
                    </th>

                    <th style={tableHeaderStyle}>
                      カテゴリ
                    </th>

                    <th style={tableHeaderStyle}>
                      公開日時
                    </th>

                    <th style={tableHeaderStyle}>
                      状態
                    </th>

                    <th style={tableHeaderStyle}>
                      操作
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {newsList.map((item) => (
                    <tr key={item.id}>
                      <td
                        style={{
                          ...tableCellStyle,
                          fontWeight: 600,
                          whiteSpace: "normal",
                          minWidth: "280px",
                        }}
                      >
                        {item.title || "-"}
                      </td>

                      <td
                        style={tableCellStyle}
                      >
                        {item.category || "-"}
                      </td>

                      <td
                        style={tableCellStyle}
                      >
                        {formatDate(
                          item.published_at
                        )}
                      </td>

                      <td
                        style={tableCellStyle}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            togglePublished(
                              item
                            )
                          }
                          style={{
                            padding:
                              "6px 10px",
                            borderRadius:
                              "999px",
                            border: "none",
                            cursor:
                              "pointer",
                            background:
                              item.is_published
                                ? "#ecfdf5"
                                : "#f3f4f6",
                            color:
                              item.is_published
                                ? "#047857"
                                : "#6b7280",
                            fontSize:
                              "12px",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {item.is_published
                            ? "公開"
                            : "非公開"}
                        </button>
                      </td>

                      <td
                        style={
                          tableCellStyle
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              startEditNews(
                                item
                              )
                            }
                            style={{
                              padding:
                                "8px 12px",
                              background:
                                "#111",
                              color:
                                "#fff",
                              border:
                                "none",
                              borderRadius:
                                "6px",
                              cursor:
                                "pointer",
                            }}
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteNews(
                                item
                              )
                            }
                            style={{
                              padding:
                                "8px 12px",
                              background:
                                "#fff",
                              color:
                                "#be123c",
                              border:
                                "1px solid #fecdd3",
                              borderRadius:
                                "6px",
                              cursor:
                                "pointer",
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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

function getCurrentDateTimeLocal() {
  const now = new Date();

  const offset =
    now.getTimezoneOffset() * 60000;

  return new Date(
    now.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

function convertToDateTimeLocal(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset =
    date.getTimezoneOffset() * 60000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px",
  borderBottom: "2px solid #eee",
  fontSize: "13px",
  color: "#666",
  whiteSpace: "nowrap",
};

const tableCellStyle: React.CSSProperties = {
  padding: "14px 12px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
  color: "#333",
  whiteSpace: "nowrap",
};