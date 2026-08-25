import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Staff = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  hire_date: string | null;
  salary_type: string;
  salary: number;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type FormData = {
  name: string;
  phone: string;
  email: string;
  role: string;
  hire_date: string;
  salary_type: string;
  salary: string;
  status: string;
  note: string;
};

const ROLES = [
  "店長",
  "副店長",
  "受付",
  "スタッフ",
  "管理者",
  "その他",
];

const SALARY_TYPES = [
  "月給",
  "日給",
  "時給",
  "歩合",
];

const STATUS_OPTIONS = [
  "在籍",
  "休職",
  "退職",
];

const emptyForm: FormData = {
  name: "",
  phone: "",
  email: "",
  role: "スタッフ",
  hire_date: "",
  salary_type: "月給",
  salary: "",
  status: "在籍",
  note: "",
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("すべて");

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("staff")
      .select(
        `
        id,
        name,
        phone,
        email,
        role,
        hire_date,
        salary_type,
        salary,
        status,
        note,
        created_at,
        updated_at
        `
      )
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error("スタッフ取得エラー:", error);

      setErrorMessage(
        `スタッフデータ取得エラー: ${error.message}`
      );

      setLoading(false);
      return;
    }

    setStaff((data || []) as Staff[]);
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!form.name.trim()) {
      setErrorMessage("スタッフ名を入力してください。");
      return;
    }

    const salary =
      form.salary.trim() === ""
        ? 0
        : Number(form.salary);

    if (!Number.isFinite(salary) || salary < 0) {
      setErrorMessage(
        "給与は0円以上の数値で入力してください。"
      );
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      role: form.role,
      hire_date: form.hire_date || null,
      salary_type: form.salary_type,
      salary: Math.floor(salary),
      status: form.status,
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId !== null) {
      const { error } = await supabase
        .from("staff")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error("スタッフ更新エラー:", error);

        setErrorMessage(
          `スタッフ更新エラー: ${error.message}`
        );

        setSaving(false);
        return;
      }

      showSuccess("スタッフ情報を更新しました。");
    } else {
      const { error } = await supabase
        .from("staff")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("スタッフ登録エラー:", error);

        setErrorMessage(
          `スタッフ登録エラー: ${error.message}`
        );

        setSaving(false);
        return;
      }

      showSuccess("スタッフを登録しました。");
    }

    resetForm();
    await loadStaff();

    setSaving(false);
  }

  function handleEdit(item: Staff) {
    setEditingId(item.id);

    setForm({
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      role: item.role || "スタッフ",
      hire_date: item.hire_date || "",
      salary_type: item.salary_type || "月給",
      salary: String(item.salary ?? 0),
      status: item.status || "在籍",
      note: item.note || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(item: Staff) {
    const confirmed = window.confirm(
      `「${item.name}」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error("スタッフ削除エラー:", error);

      setErrorMessage(
        `スタッフ削除エラー: ${error.message}`
      );

      return;
    }

    if (editingId === item.id) {
      resetForm();
    }

    showSuccess("スタッフを削除しました。");

    await loadStaff();
  }

  const filteredStaff = useMemo(() => {
    const keyword = searchKeyword
      .trim()
      .toLowerCase();

    return staff.filter((item) => {
      const matchesKeyword =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        (item.phone || "").includes(keyword) ||
        (item.email || "")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "すべて" ||
        item.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [staff, searchKeyword, statusFilter]);

  const activeStaffCount = useMemo(() => {
    return staff.filter(
      (item) => item.status === "在籍"
    ).length;
  }, [staff]);

  const totalStaffCount = staff.length;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={loadingStyle}>
            スタッフデータを読み込んでいます...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>
              STAFF MANAGEMENT
            </p>

            <h1 style={titleStyle}>
              スタッフ管理
            </h1>

            <p style={subtitleStyle}>
              店舗スタッフの登録・編集・在籍状況を管理します。
            </p>
          </div>

          <button
            type="button"
            onClick={loadStaff}
            style={darkButtonStyle}
          >
            再読み込み
          </button>
        </header>

        {errorMessage && (
          <div style={errorStyle}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div style={successStyle}>
            {successMessage}
          </div>
        )}

        <section style={statsGridStyle}>
          <StatCard
            label="登録スタッフ"
            value={`${totalStaffCount}名`}
          />

          <StatCard
            label="在籍スタッフ"
            value={`${activeStaffCount}名`}
          />

          <StatCard
            label="休職"
            value={`${staff.filter(
              (item) => item.status === "休職"
            ).length}名`}
          />

          <StatCard
            label="退職"
            value={`${staff.filter(
              (item) => item.status === "退職"
            ).length}名`}
          />
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionEyebrowStyle}>
                STAFF ENTRY
              </p>

              <h2 style={sectionTitleStyle}>
                {editingId !== null
                  ? "スタッフを編集"
                  : "スタッフを登録"}
              </h2>
            </div>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={secondaryButtonStyle}
              >
                新規登録に戻す
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={formGridStyle}>
              <div>
                <label style={labelStyle}>
                  氏名 *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="例：山田 太郎"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  電話番号
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  placeholder="例：090-1234-5678"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  メールアドレス
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email: event.target.value,
                    })
                  }
                  placeholder="example@example.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  役職
                </label>

                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      role: event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {ROLES.map((role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  入社日
                </label>

                <input
                  type="date"
                  value={form.hire_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      hire_date:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  給与形態
                </label>

                <select
                  value={form.salary_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      salary_type:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {SALARY_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  給与
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.salary}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      salary:
                        event.target.value,
                    })
                  }
                  placeholder="例：300000"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  ステータス
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {STATUS_OPTIONS.map(
                    (status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label style={labelStyle}>
                  備考
                </label>

                <textarea
                  value={form.note}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      note: event.target.value,
                    })
                  }
                  placeholder="備考・メモ"
                  rows={4}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...darkButtonStyle,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "保存中..."
                  : editingId !== null
                  ? "更新する"
                  : "スタッフを登録"}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={secondaryButtonStyle}
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionEyebrowStyle}>
                STAFF LIST
              </p>

              <h2 style={sectionTitleStyle}>
                スタッフ一覧
              </h2>
            </div>

            <span
              style={{
                color: "#777",
                fontSize: "13px",
              }}
            >
              {filteredStaff.length}名
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(240px, 1fr) 180px",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <input
              type="search"
              value={searchKeyword}
              onChange={(event) =>
                setSearchKeyword(
                  event.target.value
                )
              }
              placeholder="氏名・電話番号・メールで検索"
              style={inputStyle}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              style={inputStyle}
            >
              <option value="すべて">
                すべて
              </option>

              {STATUS_OPTIONS.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                )
              )}
            </select>
          </div>

          {filteredStaff.length === 0 ? (
            <EmptyState text="該当するスタッフがありません。" />
          ) : (
            <div style={tableWrapperStyle}>
              <table
                style={{
                  ...tableStyle,
                  minWidth: "1050px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      氏名
                    </th>

                    <th style={tableHeaderStyle}>
                      役職
                    </th>

                    <th style={tableHeaderStyle}>
                      電話番号
                    </th>

                    <th style={tableHeaderStyle}>
                      メール
                    </th>

                    <th style={tableHeaderStyle}>
                      入社日
                    </th>

                    <th style={tableHeaderStyle}>
                      給与形態
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      給与
                    </th>

                    <th style={tableHeaderStyle}>
                      状態
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "center",
                      }}
                    >
                      操作
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStaff.map(
                    (item) => (
                      <tr key={item.id}>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: 700,
                          }}
                        >
                          {item.name}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.role}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.phone || "-"}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.email || "-"}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.hire_date
                            ? formatJapaneseDate(
                                item.hire_date
                              )
                            : "-"}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.salary_type}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {formatMoney(
                            item.salary
                          )}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          <span
                            style={{
                              ...statusBadgeStyle,
                              background:
                                getStatusBackground(
                                  item.status
                                ),
                              color:
                                getStatusColor(
                                  item.status
                                ),
                            }}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "center",
                              gap: "8px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  item
                                )
                              }
                              style={
                                smallButtonStyle
                              }
                            >
                              編集
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  item
                                )
                              }
                              style={
                                deleteButtonStyle
                              }
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

        <footer
          style={{
            textAlign: "center",
            marginTop: "35px",
            color: "#999",
            fontSize: "12px",
          }}
        >
          店舗管理システム
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>
        {label}
      </div>

      <div style={statValueStyle}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div style={emptyStateStyle}>
      {text}
    </div>
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString(
    "ja-JP"
  )}円`;
}

function formatJapaneseDate(date: string) {
  const [
    year,
    month,
    day,
  ] = date.split("-").map(Number);

  return `${year}年${month}月${day}日`;
}

function getStatusBackground(status: string) {
  switch (status) {
    case "在籍":
      return "#ecfdf5";
    case "休職":
      return "#fff7ed";
    case "退職":
      return "#fef2f2";
    default:
      return "#f3f4f6";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "在籍":
      return "#047857";
    case "休職":
      return "#c2410c";
    case "退職":
      return "#b91c1c";
    default:
      return "#4b5563";
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f5f6f8",
  padding: "30px 20px 80px",
  color: "#111",
  boxSizing: "border-box",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const loadingStyle: React.CSSProperties = {
  padding: "80px 20px",
  textAlign: "center",
  color: "#666",
};

const headerStyle: React.CSSProperties = {
  background: "#111",
  color: "#fff",
  borderRadius: "14px",
  padding: "28px 30px",
  marginBottom: "25px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  boxShadow:
    "0 4px 15px rgba(0,0,0,0.08)",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "11px",
  letterSpacing: "4px",
  color: "#aaa",
};

const titleStyle: React.CSSProperties = {
  margin: "7px 0 0",
  fontSize: "30px",
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#d1d5db",
  fontSize: "14px",
};

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "14px",
  padding: "24px",
  marginBottom: "25px",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.05)",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const sectionEyebrowStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "10px",
  letterSpacing: "3px",
  color: "#999",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: "21px",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "15px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  color: "#666",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "44px",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: "7px",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#fff",
};

const darkButtonStyle: React.CSSProperties = {
  padding: "11px 17px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 15px",
  background: "#f3f4f6",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "13px",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "15px",
  marginBottom: "25px",
};

const statCardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "14px",
  padding: "22px",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.05)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#777",
  marginBottom: "10px",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "25px",
  fontWeight: 700,
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "650px",
};

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

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 600,
};

const smallButtonStyle: React.CSSProperties = {
  padding: "7px 11px",
  background: "#f3f4f6",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "7px 11px",
  background: "#fff1f2",
  color: "#be123c",
  border: "1px solid #fecdd3",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "12px",
};

const errorStyle: React.CSSProperties = {
  padding: "15px",
  marginBottom: "20px",
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#be123c",
  borderRadius: "8px",
};

const successStyle: React.CSSProperties = {
  padding: "15px",
  marginBottom: "20px",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
  borderRadius: "8px",
};

const emptyStateStyle: React.CSSProperties = {
  padding: "45px 20px",
  textAlign: "center",
  color: "#777",
};