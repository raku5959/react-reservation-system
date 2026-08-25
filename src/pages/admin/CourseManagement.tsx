import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Course = {
  id: number;
  name: string | null;
  minutes: string | null;
  price: number | null;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

const emptyForm = {
  name: "",
  minutes: "",
  price: "",
  description: "",
  sort_order: "0",
  is_active: true,
};

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("price_courses")
      .select(
        `
          id,
          name,
          minutes,
          price,
          description,
          sort_order,
          is_active,
          created_at,
          updated_at
        `
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error("コース取得エラー:", error);

      setErrorMessage(
        `コース情報の取得に失敗しました: ${error.message}`
      );

      setCourses([]);
      setLoading(false);
      return;
    }

    setCourses((data || []) as Course[]);
    setLoading(false);
  }

  function startNewCourse() {
    setEditingId(null);
    setForm(emptyForm);
    setErrorMessage("");
    setShowForm(true);
  }

  function startEditCourse(course: Course) {
    setEditingId(course.id);

    setForm({
      name: course.name || "",
      minutes: course.minutes || "",
      price:
        course.price !== null && course.price !== undefined
          ? String(course.price)
          : "",
      description: course.description || "",
      sort_order:
        course.sort_order !== null &&
        course.sort_order !== undefined
          ? String(course.sort_order)
          : "0",
      is_active:
        course.is_active !== null
          ? course.is_active
          : true,
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

    if (!form.name.trim()) {
      setErrorMessage("コース名を入力してください。");
      return;
    }

    const minutesValue = form.minutes.trim();

    if (!minutesValue) {
      setErrorMessage("所要時間を入力してください。");
      return;
    }

    const priceValue = Number(form.price);

    if (
      form.price.trim() === "" ||
      Number.isNaN(priceValue) ||
      priceValue < 0
    ) {
      setErrorMessage("正しい料金を入力してください。");
      return;
    }

    const sortOrderValue = Number(form.sort_order);

    if (
      Number.isNaN(sortOrderValue) ||
      sortOrderValue < 0
    ) {
      setErrorMessage("表示順は0以上の数字を入力してください。");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const payload = {
      name: form.name.trim(),
      minutes: minutesValue,
      price: priceValue,
      description:
        form.description.trim() || null,
      sort_order: sortOrderValue,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (editingId !== null) {
      const result = await supabase
        .from("price_courses")
        .update(payload)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("price_courses")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

      error = result.error;
    }

    if (error) {
      console.error("コース保存エラー:", error);

      setErrorMessage(
        `コース情報の保存に失敗しました: ${error.message}`
      );

      setSaving(false);
      return;
    }

    alert(
      editingId !== null
        ? "コース情報を更新しました。"
        : "コースを登録しました。"
    );

    setSaving(false);
    closeForm();

    await loadCourses();
  }

  async function toggleActive(course: Course) {
    const newValue = !course.is_active;

    const label = newValue
      ? "有効"
      : "無効";

    const confirmed = window.confirm(
      `「${course.name || "このコース"}」を${label}に変更しますか？`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("price_courses")
      .update({
        is_active: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", course.id);

    if (error) {
      console.error("コース状態変更エラー:", error);

      setErrorMessage(
        `コース状態の変更に失敗しました: ${error.message}`
      );

      return;
    }

    await loadCourses();
  }

  async function deleteCourse(course: Course) {
    const confirmed = window.confirm(
      `「${course.name || "このコース"}」を削除しますか？\n\n過去の予約で使用されている可能性があるため、通常は「無効」にすることをおすすめします。`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("price_courses")
      .delete()
      .eq("id", course.id);

    if (error) {
      console.error("コース削除エラー:", error);

      setErrorMessage(
        `コースの削除に失敗しました: ${error.message}`
      );

      return;
    }

    alert("コースを削除しました。");

    await loadCourses();
  }

  function formatPrice(price: number | null) {
    if (price === null || price === undefined) {
      return "-";
    }

    return `${price.toLocaleString()}円`;
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
        コース情報を読み込んでいます...
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
            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                color: "#222",
              }}
            >
              コース・料金管理
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              施術コースと料金を管理します。
            </p>
          </div>

          <button
            type="button"
            onClick={startNewCourse}
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
            ＋ 新規コース登録
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

        {/* フォーム */}
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
                ? "コース情報を編集"
                : "新規コース登録"}
            </h2>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "18px",
                }}
              >
                <FormField
                  label="コース名"
                  required
                  value={form.name}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      name: value,
                    })
                  }
                  placeholder="例：60分コース"
                />

                <FormField
                  label="所要時間"
                  required
                  value={form.minutes}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      minutes: value,
                    })
                  }
                  placeholder="例：60"
                />

                <FormField
                  label="料金"
                  required
                  value={form.price}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      price: value,
                    })
                  }
                  placeholder="例：12000"
                  type="number"
                />

                <FormField
                  label="表示順"
                  value={form.sort_order}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      sort_order: value,
                    })
                  }
                  placeholder="例：1"
                  type="number"
                />
              </div>

              <div
                style={{
                  marginTop: "5px",
                  marginBottom: "20px",
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
                  説明
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  rows={4}
                  placeholder="コースの説明を入力してください。"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "7px",
                    fontSize: "14px",
                    resize: "vertical",
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
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      is_active:
                        event.target.checked,
                    })
                  }
                />

                有効なコースとして表示する
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

        {/* 一覧 */}
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
              コース一覧
            </h2>

            <span
              style={{
                fontSize: "13px",
                color: "#777",
              }}
            >
              {courses.length}件
            </span>
          </div>

          {courses.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              コースが登録されていません。
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
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      表示順
                    </th>

                    <th style={tableHeaderStyle}>
                      コース名
                    </th>

                    <th style={tableHeaderStyle}>
                      時間
                    </th>

                    <th style={tableHeaderStyle}>
                      料金
                    </th>

                    <th style={tableHeaderStyle}>
                      説明
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
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td style={tableCellStyle}>
                        {course.sort_order ?? 0}
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                          fontWeight: 600,
                        }}
                      >
                        {course.name || "-"}
                      </td>

                      <td style={tableCellStyle}>
                        {course.minutes
                          ? `${course.minutes}分`
                          : "-"}
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                          fontWeight: 600,
                        }}
                      >
                        {formatPrice(
                          course.price
                        )}
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                          whiteSpace:
                            "normal",
                          minWidth: "220px",
                        }}
                      >
                        {course.description ||
                          "-"}
                      </td>

                      <td style={tableCellStyle}>
                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(
                              course
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
                              course.is_active
                                ? "#ecfdf5"
                                : "#f3f4f6",
                            color:
                              course.is_active
                                ? "#047857"
                                : "#6b7280",
                            fontSize:
                              "12px",
                            fontWeight:
                              "bold",
                          }}
                        >
                          {course.is_active
                            ? "有効"
                            : "無効"}
                        </button>
                      </td>

                      <td
                        style={{
                          ...tableCellStyle,
                        }}
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
                              startEditCourse(
                                course
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
                              deleteCourse(
                                course
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
    <div>
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