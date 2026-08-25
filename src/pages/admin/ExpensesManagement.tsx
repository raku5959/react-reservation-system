import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Expense = {
  id: number;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const EXPENSE_CATEGORIES = [
  "家賃",
  "広告費",
  "消耗品費",
  "水道光熱費",
  "通信費",
  "外注費",
  "交通費",
  "手数料",
  "その他",
];

type FormData = {
  expense_date: string;
  category: string;
  amount: string;
  description: string;
};

const emptyForm: FormData = {
  expense_date: new Date()
    .toISOString()
    .slice(0, 10),
  category: "その他",
  amount: "",
  description: "",
};

export default function ExpensesManagement() {
  const [expenses, setExpenses] = useState<Expense[]>(
    []
  );

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [selectedMonth, setSelectedMonth] =
    useState(() => {
      const now = new Date();

      return `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
    });

  const [form, setForm] =
    useState<FormData>(emptyForm);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("expenses")
      .select(
        "id, expense_date, category, amount, description, created_at, updated_at"
      )
      .order("expense_date", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (error) {
      console.error(
        "経費取得エラー:",
        error
      );

      setErrorMessage(
        `経費データ取得エラー: ${error.message}`
      );

      setLoading(false);
      return;
    }

    setExpenses(data || []);
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function showSuccess(message: string) {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!form.expense_date) {
      setErrorMessage("支払日を入力してください。");
      return;
    }

    if (!form.category) {
      setErrorMessage("カテゴリを選択してください。");
      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage(
        "金額は1円以上で入力してください。"
      );
      return;
    }

    setSaving(true);

    const payload = {
      expense_date: form.expense_date,
      category: form.category,
      amount: Math.floor(amount),
      description:
        form.description.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId !== null) {
      const { error } = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error(
          "経費更新エラー:",
          error
        );

        setErrorMessage(
          `経費更新エラー: ${error.message}`
        );

        setSaving(false);
        return;
      }

      showSuccess(
        "経費を更新しました。"
      );
    } else {
      const { error } = await supabase
        .from("expenses")
        .insert({
          ...payload,
          created_at:
            new Date().toISOString(),
        });

      if (error) {
        console.error(
          "経費登録エラー:",
          error
        );

        setErrorMessage(
          `経費登録エラー: ${error.message}`
        );

        setSaving(false);
        return;
      }

      showSuccess(
        "経費を登録しました。"
      );
    }

    resetForm();

    await loadExpenses();

    setSaving(false);
  }

  function handleEdit(expense: Expense) {
    setEditingId(expense.id);

    setForm({
      expense_date: expense.expense_date,
      category: expense.category,
      amount: String(expense.amount),
      description:
        expense.description || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(
    expense: Expense
  ) {
    const confirmed = window.confirm(
      `「${expense.category} ${formatMoney(
        expense.amount
      )}」を削除しますか？`
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    if (error) {
      console.error(
        "経費削除エラー:",
        error
      );

      setErrorMessage(
        `経費削除エラー: ${error.message}`
      );

      return;
    }

    if (editingId === expense.id) {
      resetForm();
    }

    showSuccess(
      "経費を削除しました。"
    );

    await loadExpenses();
  }

  const monthlyExpenses = useMemo(() => {
    return expenses.filter((expense) =>
      expense.expense_date.startsWith(
        selectedMonth
      )
    );
  }, [expenses, selectedMonth]);

  const monthlyTotal = useMemo(() => {
    return monthlyExpenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  }, [monthlyExpenses]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};

    monthlyExpenses.forEach((expense) => {
      if (!map[expense.category]) {
        map[expense.category] = 0;
      }

      map[expense.category] += Number(
        expense.amount || 0
      );
    });

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
      }))
      .sort(
        (a, b) => b.amount - a.amount
      );
  }, [monthlyExpenses]);

  const largestCategory =
    categoryTotals.length > 0
      ? categoryTotals[0]
      : null;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={loadingStyle}>
            経費データを読み込んでいます...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        {/* =========================
            ヘッダー
        ========================= */}

        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>
              EXPENSE MANAGEMENT
            </p>

            <h1 style={titleStyle}>
              経費管理
            </h1>

            <p style={subtitleStyle}>
              店舗運営にかかる経費を登録・管理します。
            </p>
          </div>

          <button
            type="button"
            onClick={loadExpenses}
            style={darkButtonStyle}
          >
            再読み込み
          </button>
        </header>

        {/* =========================
            メッセージ
        ========================= */}

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

        {/* =========================
            経費登録
        ========================= */}

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionEyebrowStyle}>
                EXPENSE ENTRY
              </p>

              <h2 style={sectionTitleStyle}>
                {editingId !== null
                  ? "経費を編集"
                  : "経費を登録"}
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
                  支払日
                </label>

                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      expense_date:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  カテゴリ
                </label>

                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category:
                        event.target.value,
                    })
                  }
                  style={inputStyle}
                >
                  {EXPENSE_CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label style={labelStyle}>
                  金額
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      amount:
                        event.target.value,
                    })
                  }
                  placeholder="例：50000"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  備考
                </label>

                <input
                  type="text"
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="例：8月分家賃"
                  style={inputStyle}
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
                  : "経費を登録"}
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

        {/* =========================
            月選択
        ========================= */}

        <section style={sectionStyle}>
          <label style={labelStyle}>
            集計対象月
          </label>

          <input
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(
                event.target.value
              )
            }
            style={{
              ...inputStyle,
              maxWidth: "220px",
            }}
          />
        </section>

        {/* =========================
            集計カード
        ========================= */}

        <section style={statsGridStyle}>
          <StatCard
            label="月間経費"
            value={formatMoney(monthlyTotal)}
          />

          <StatCard
            label="経費件数"
            value={`${monthlyExpenses.length}件`}
          />

          <StatCard
            label="平均経費"
            value={formatMoney(
              monthlyExpenses.length > 0
                ? Math.round(
                    monthlyTotal /
                      monthlyExpenses.length
                  )
                : 0
            )}
          />

          <StatCard
            label="最大カテゴリ"
            value={
              largestCategory
                ? largestCategory.category
                : "-"
            }
          />
        </section>

        {/* =========================
            カテゴリ別集計
        ========================= */}

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionEyebrowStyle}>
                CATEGORY ANALYSIS
              </p>

              <h2 style={sectionTitleStyle}>
                カテゴリ別経費
              </h2>
            </div>

            <strong>
              {formatMoney(monthlyTotal)}
            </strong>
          </div>

          {categoryTotals.length === 0 ? (
            <EmptyState text="この月の経費はありません。" />
          ) : (
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      カテゴリ
                    </th>

                    <th style={tableHeaderStyle}>
                      金額
                    </th>

                    <th style={tableHeaderStyle}>
                      構成比
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categoryTotals.map(
                    (item) => {
                      const ratio =
                        monthlyTotal > 0
                          ? Math.round(
                              (item.amount /
                                monthlyTotal) *
                                100
                            )
                          : 0;

                      return (
                        <tr
                          key={item.category}
                        >
                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {item.category}
                          </td>

                          <td
                            style={{
                              ...tableCellStyle,
                              fontWeight: 700,
                              textAlign:
                                "right",
                            }}
                          >
                            {formatMoney(
                              item.amount
                            )}
                          </td>

                          <td
                            style={{
                              ...tableCellStyle,
                              textAlign:
                                "right",
                            }}
                          >
                            {ratio}%
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =========================
            経費一覧
        ========================= */}

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <p style={sectionEyebrowStyle}>
                EXPENSE LIST
              </p>

              <h2 style={sectionTitleStyle}>
                経費一覧
              </h2>
            </div>

            <span
              style={{
                color: "#777",
                fontSize: "13px",
              }}
            >
              {monthlyExpenses.length}件
            </span>
          </div>

          {monthlyExpenses.length === 0 ? (
            <EmptyState text="この月の経費はありません。" />
          ) : (
            <div style={tableWrapperStyle}>
              <table
                style={{
                  ...tableStyle,
                  minWidth: "800px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      支払日
                    </th>

                    <th style={tableHeaderStyle}>
                      カテゴリ
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      金額
                    </th>

                    <th style={tableHeaderStyle}>
                      備考
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
                  {monthlyExpenses.map(
                    (expense) => (
                      <tr key={expense.id}>
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {formatJapaneseDate(
                            expense.expense_date
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <span
                            style={
                              categoryBadgeStyle
                            }
                          >
                            {expense.category}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign:
                              "right",
                            fontWeight: 700,
                          }}
                        >
                          {formatMoney(
                            expense.amount
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {expense.description ||
                            "-"}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign:
                              "center",
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
                                  expense
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
                                  expense
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

                <tfoot>
                  <tr>
                    <td
                      colSpan={2}
                      style={{
                        ...tableCellStyle,
                        fontWeight: 700,
                      }}
                    >
                      月間合計
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign:
                          "right",
                        fontWeight: 700,
                        fontSize: "17px",
                      }}
                    >
                      {formatMoney(
                        monthlyTotal
                      )}
                    </td>

                    <td
                      colSpan={2}
                      style={
                        tableCellStyle
                      }
                    />
                  </tr>
                </tfoot>
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

/* =========================
   コンポーネント
========================= */

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

/* =========================
   共通関数
========================= */

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString()}円`;
}

function formatJapaneseDate(
  date: string
) {
  const [
    year,
    month,
    day,
  ] = date
    .split("-")
    .map(Number);

  return `${year}年${month}月${day}日`;
}

/* =========================
   スタイル
========================= */

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

const categoryBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: "999px",
  background: "#f3f4f6",
  color: "#444",
  fontSize: "12px",
  fontWeight: 600,
};

const emptyStateStyle: React.CSSProperties = {
  padding: "45px 20px",
  textAlign: "center",
  color: "#777",
};