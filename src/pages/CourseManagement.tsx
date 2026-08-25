import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Course = {
  id: number;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

const emptyForm = {
  name: "",
  duration: "60",
  price: "0",
  description: "",
  sort_order: "0",
  is_active: true,
};

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("sort_order", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        });

      if (error) {
        throw new Error(
          `コース取得エラー: ${error.message}`
        );
      }

      setCourses(data ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "コースの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      sort_order: String(courses.length + 1),
    });
    setIsFormOpen(true);
    setError("");
  }

  function openEditForm(course: Course) {
    setEditingId(course.id);

    setForm({
      name: course.name,
      duration: String(course.duration),
      price: String(course.price),
      description: course.description || "",
      sort_order: String(course.sort_order),
      is_active: course.is_active,
    });

    setIsFormOpen(true);
    setError("");
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveCourse() {
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("コース名を入力してください");
      return;
    }

    const duration = Number(form.duration);
    const price = Number(form.price);
    const sortOrder = Number(form.sort_order);

    if (!duration || duration <= 0) {
      setError("時間を正しく入力してください");
      return;
    }

    if (price < 0) {
      setError("料金を正しく入力してください");
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        duration,
        price,
        description:
          form.description.trim() || null,
        sort_order: sortOrder,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingId === null) {
        const { error } = await supabase
          .from("courses")
          .insert(payload);

        if (error) {
          throw new Error(
            `コース登録エラー: ${error.message}`
          );
        }

        setSuccess("コースを登録しました。");
      } else {
        const { error } = await supabase
          .from("courses")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw new Error(
            `コース更新エラー: ${error.message}`
          );
        }

        setSuccess("コースを更新しました。");
      }

      closeForm();
      await loadCourses();

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "コースの保存に失敗しました"
      );
    }
  }

  async function toggleCourse(course: Course) {
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("courses")
        .update({
          is_active: !course.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", course.id);

      if (error) {
        throw new Error(
          `表示状態変更エラー: ${error.message}`
        );
      }

      setCourses((current) =>
        current.map((item) =>
          item.id === course.id
            ? {
                ...item,
                is_active: !item.is_active,
              }
            : item
        )
      );

      setSuccess(
        course.is_active
          ? "コースを非表示にしました。"
          : "コースを表示しました。"
      );

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "表示状態の変更に失敗しました"
      );
    }
  }

  async function deleteCourse(course: Course) {
    const confirmed = window.confirm(
      `「${course.name}」を削除しますか？\n\nこの操作は元に戻せません。`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", course.id);

      if (error) {
        throw new Error(
          `コース削除エラー: ${error.message}`
        );
      }

      setCourses((current) =>
        current.filter(
          (item) => item.id !== course.id
        )
      );

      setSuccess("コースを削除しました。");

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "コースの削除に失敗しました"
      );
    }
  }

  if (loading) {
    return (
      <main
        style={{
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        コース管理画面を読み込み中...
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
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
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
              GINZA HIDEAWAYS
            </p>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "28px",
              }}
            >
              コース管理
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/admin"
              style={{
                padding: "10px 16px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ddd",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              管理画面
            </Link>

            <Link
              to="/reservation-management"
              style={{
                padding: "10px 16px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ddd",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              予約管理
            </Link>

            <button
              type="button"
              onClick={openCreateForm}
              style={{
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ＋ コース追加
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
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "15px",
              marginBottom: "20px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              borderRadius: "8px",
            }}
          >
            {success}
          </div>
        )}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "10px",
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
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "20px",
                }}
              >
                コース一覧
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#777",
                  fontSize: "13px",
                }}
              >
                {courses.length}件のコース
              </p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "#777",
                border: "1px dashed #ccc",
                borderRadius: "8px",
              }}
            >
              コースが登録されていません。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {courses.map((course) => (
                <article
                  key={course.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    padding: "20px",
                    opacity: course.is_active
                      ? 1
                      : 0.55,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "20px",
                          }}
                        >
                          {course.name}
                        </strong>

                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            background:
                              course.is_active
                                ? "#dcfce7"
                                : "#f3f4f6",
                            color:
                              course.is_active
                                ? "#166534"
                                : "#666",
                          }}
                        >
                          {course.is_active
                            ? "公開中"
                            : "非公開"}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "25px",
                          marginTop: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <small
                            style={{
                              color: "#888",
                              display: "block",
                            }}
                          >
                            時間
                          </small>

                          <strong>
                            {course.duration}分
                          </strong>
                        </div>

                        <div>
                          <small
                            style={{
                              color: "#888",
                              display: "block",
                            }}
                          >
                            料金
                          </small>

                          <strong>
                            ¥
                            {course.price.toLocaleString(
                              "ja-JP"
                            )}
                          </strong>
                        </div>

                        <div>
                          <small
                            style={{
                              color: "#888",
                              display: "block",
                            }}
                          >
                            表示順
                          </small>

                          <strong>
                            {course.sort_order}
                          </strong>
                        </div>
                      </div>

                      {course.description && (
                        <p
                          style={{
                            margin:
                              "15px 0 0",
                            color: "#666",
                            fontSize: "14px",
                          }}
                        >
                          {course.description}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openEditForm(course)
                        }
                        style={{
                          padding: "9px 13px",
                          background: "#fff",
                          border:
                            "1px solid #ccc",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleCourse(course)
                        }
                        style={{
                          padding: "9px 13px",
                          background: "#fff",
                          border:
                            "1px solid #ccc",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        {course.is_active
                          ? "非公開"
                          : "公開"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCourse(course)
                        }
                        style={{
                          padding: "9px 13px",
                          background: "#fff",
                          color: "#dc2626",
                          border:
                            "1px solid #fecaca",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isFormOpen && (
        <div
          onClick={closeForm}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    letterSpacing: "3px",
                    color: "#999",
                  }}
                >
                  COURSE
                </p>

                <h2
                  style={{
                    margin: "5px 0 0",
                  }}
                >
                  {editingId === null
                    ? "コース追加"
                    : "コース編集"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                style={{
                  width: "36px",
                  height: "36px",
                  border: "1px solid #ddd",
                  background: "#fff",
                  borderRadius: "50%",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              <label>
                <div
                  style={{
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  コース名
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
                  placeholder="例：90分コース"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label>
                  <div
                    style={{
                      marginBottom: "6px",
                      fontWeight: "bold",
                    }}
                  >
                    時間（分）
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        duration:
                          e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <label>
                  <div
                    style={{
                      marginBottom: "6px",
                      fontWeight: "bold",
                    }}
                  >
                    料金（円）
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price:
                          e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>
              </div>

              <label>
                <div
                  style={{
                    marginBottom: "6px",
                    fontWeight: "bold",
                  }}
                >
                  説明
                </div>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="コースの説明"
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding: "12px",
                    border:
                      "1px solid #ccc",
                    borderRadius: "6px",
                    resize: "vertical",
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label>
                  <div
                    style={{
                      marginBottom: "6px",
                      fontWeight: "bold",
                    }}
                  >
                    表示順
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sort_order:
                          e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      boxSizing:
                        "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <label>
                  <div
                    style={{
                      marginBottom: "6px",
                      fontWeight: "bold",
                    }}
                  >
                    公開状態
                  </div>

                  <select
                    value={
                      form.is_active
                        ? "true"
                        : "false"
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_active:
                          e.target.value ===
                          "true",
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "6px",
                      background:
                        "#fff",
                    }}
                  >
                    <option value="true">
                      公開
                    </option>

                    <option value="false">
                      非公開
                    </option>
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  style={{
                    padding: "13px",
                    background:
                      "#f3f4f6",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  onClick={saveCourse}
                  style={{
                    padding: "13px",
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {editingId === null
                    ? "コースを登録"
                    : "変更を保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}