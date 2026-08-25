import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Recruitment = {
  id: number;
  title: string | null;
  description: string | null;
  salary: string | null;
  working_hours: string | null;
  requirements: string | null;
  benefits: string | null;
  application_method: string | null;
  is_published: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  salary: "",
  working_hours: "",
  requirements: "",
  benefits: "",
  application_method: "",
  is_published: true,
};

export default function RecruitmentManagement() {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadRecruitments();
  }, []);

  async function loadRecruitments() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("recruitments")
      .select(`
        id,
        title,
        description,
        salary,
        working_hours,
        requirements,
        benefits,
        application_method,
        is_published,
        created_at,
        updated_at
      `)
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error("求人取得エラー:", error);

      setErrorMessage(
        `求人情報の取得に失敗しました: ${error.message}`
      );

      setRecruitments([]);
      setLoading(false);
      return;
    }

    setRecruitments((data || []) as Recruitment[]);
    setLoading(false);
  }

  function startNewRecruitment() {
    setEditingId(null);
    setForm(emptyForm);
    setErrorMessage("");
    setShowForm(true);
  }

  function startEditRecruitment(
    recruitment: Recruitment
  ) {
    setEditingId(recruitment.id);

    setForm({
      title: recruitment.title || "",
      description: recruitment.description || "",
      salary: recruitment.salary || "",
      working_hours:
        recruitment.working_hours || "",
      requirements:
        recruitment.requirements || "",
      benefits: recruitment.benefits || "",
      application_method:
        recruitment.application_method || "",
      is_published:
        recruitment.is_published ?? true,
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
      setErrorMessage("求人タイトルを入力してください。");
      return;
    }

    if (!form.description.trim()) {
      setErrorMessage("求人内容を入力してください。");
      return;
    }

    if (!form.salary.trim()) {
      setErrorMessage("給与情報を入力してください。");
      return;
    }

    if (!form.working_hours.trim()) {
      setErrorMessage("勤務時間を入力してください。");
      return;
    }

    if (!form.requirements.trim()) {
      setErrorMessage("応募資格・条件を入力してください。");
      return;
    }

    if (!form.application_method.trim()) {
      setErrorMessage("応募方法を入力してください。");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      salary: form.salary.trim(),
      working_hours:
        form.working_hours.trim(),
      requirements:
        form.requirements.trim(),
      benefits:
        form.benefits.trim() || null,
      application_method:
        form.application_method.trim(),
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (editingId !== null) {
      const result = await supabase
        .from("recruitments")
        .update(payload)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("recruitments")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

      error = result.error;
    }

    if (error) {
      console.error("求人保存エラー:", error);

      setErrorMessage(
        `求人情報の保存に失敗しました: ${error.message}`
      );

      setSaving(false);
      return;
    }

    alert(
      editingId !== null
        ? "求人情報を更新しました。"
        : "求人を登録しました。"
    );

    setSaving(false);
    closeForm();

    await loadRecruitments();
  }

  async function togglePublished(
    recruitment: Recruitment
  ) {
    const newValue =
      !recruitment.is_published;

    const label = newValue
      ? "公開"
      : "非公開";

    const confirmed = window.confirm(
      `「${
        recruitment.title || "この求人"
      }」を${label}に変更しますか？`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("recruitments")
      .update({
        is_published: newValue,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", recruitment.id);

    if (error) {
      console.error(
        "求人公開状態変更エラー:",
        error
      );

      setErrorMessage(
        `公開状態の変更に失敗しました: ${error.message}`
      );

      return;
    }

    await loadRecruitments();
  }

  async function deleteRecruitment(
    recruitment: Recruitment
  ) {
    const confirmed = window.confirm(
      `「${
        recruitment.title || "この求人"
      }」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("recruitments")
      .delete()
      .eq("id", recruitment.id);

    if (error) {
      console.error(
        "求人削除エラー:",
        error
      );

      setErrorMessage(
        `求人の削除に失敗しました: ${error.message}`
      );

      return;
    }

    alert("求人を削除しました。");

    await loadRecruitments();
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
        求人情報を読み込んでいます...
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
        {/* ヘッダー */}
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
            <Link
              to="/admin"
              style={{
                display: "inline-block",
                marginBottom: "15px",
                color: "#2563eb",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              ← 管理画面へ戻る
            </Link>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                color: "#222",
              }}
            >
              求人・採用管理
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              求人情報を登録・編集・公開管理します。
            </p>
          </div>

          <button
            type="button"
            onClick={startNewRecruitment}
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
            ＋ 新規求人登録
          </button>
        </header>

        {/* エラー */}
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

        {/* 登録・編集フォーム */}
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
                ? "求人情報を編集"
                : "新規求人登録"}
            </h2>

            <form onSubmit={handleSubmit}>
              <FormField
                label="求人タイトル"
                required
                value={form.title}
                onChange={(value) =>
                  setForm({
                    ...form,
                    title: value,
                  })
                }
                placeholder="例：セラピスト募集"
              />

              <TextAreaField
                label="求人内容"
                required
                value={form.description}
                onChange={(value) =>
                  setForm({
                    ...form,
                    description: value,
                  })
                }
                placeholder="仕事内容や募集内容を入力してください。"
                rows={6}
              />

              <FormField
                label="給与"
                required
                value={form.salary}
                onChange={(value) =>
                  setForm({
                    ...form,
                    salary: value,
                  })
                }
                placeholder="例：時給1,500円〜 / 完全歩合制"
              />

              <FormField
                label="勤務時間"
                required
                value={form.working_hours}
                onChange={(value) =>
                  setForm({
                    ...form,
                    working_hours: value,
                  })
                }
                placeholder="例：10:00〜翌2:00の間で応相談"
              />

              <TextAreaField
                label="応募資格・条件"
                required
                value={form.requirements}
                onChange={(value) =>
                  setForm({
                    ...form,
                    requirements: value,
                  })
                }
                placeholder="例：18歳以上、未経験歓迎"
                rows={5}
              />

              <TextAreaField
                label="福利厚生"
                value={form.benefits}
                onChange={(value) =>
                  setForm({
                    ...form,
                    benefits: value,
                  })
                }
                placeholder="例：日払い可、制服貸与、交通費支給"
                rows={5}
              />

              <TextAreaField
                label="応募方法"
                required
                value={form.application_method}
                onChange={(value) =>
                  setForm({
                    ...form,
                    application_method: value,
                  })
                }
                placeholder="例：LINEまたは電話でご応募ください。"
                rows={5}
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
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

        {/* 求人一覧 */}
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
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              求人一覧
            </h2>

            <span
              style={{
                fontSize: "13px",
                color: "#777",
              }}
            >
              {recruitments.length}件
            </span>
          </div>

          {recruitments.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              求人情報が登録されていません。
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
                  borderCollapse:
                    "collapse",
                  minWidth: "1050px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      ID
                    </th>

                    <th style={tableHeaderStyle}>
                      求人タイトル
                    </th>

                    <th style={tableHeaderStyle}>
                      給与
                    </th>

                    <th style={tableHeaderStyle}>
                      勤務時間
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
                  {recruitments.map(
                    (recruitment) => (
                      <tr
                        key={
                          recruitment.id
                        }
                      >
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {recruitment.id}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: 600,
                            minWidth: "250px",
                          }}
                        >
                          {recruitment.title ||
                            "-"}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            minWidth: "180px",
                          }}
                        >
                          {recruitment.salary ||
                            "-"}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            minWidth: "220px",
                          }}
                        >
                          {recruitment.working_hours ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              togglePublished(
                                recruitment
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
                                recruitment.is_published
                                  ? "#ecfdf5"
                                  : "#f3f4f6",
                              color:
                                recruitment.is_published
                                  ? "#047857"
                                  : "#6b7280",
                              fontSize:
                                "12px",
                              fontWeight:
                                "bold",
                            }}
                          >
                            {recruitment.is_published
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
                              display:
                                "flex",
                              gap: "8px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                startEditRecruitment(
                                  recruitment
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
                                deleteRecruitment(
                                  recruitment
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
                    )
                  )}
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
          border:
            "1px solid #d1d5db",
          borderRadius: "7px",
          fontSize: "14px",
          outline: "none",
        }}
      />
    </div>
  );
}

function TextAreaField({
  label,
  required = false,
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
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

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={rows}
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
  );
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