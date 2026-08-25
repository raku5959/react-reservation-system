import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Customer = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  note: string;
};

const emptyForm: CustomerForm = {
  name: "",
  phone: "",
  email: "",
  note: "",
};

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [form, setForm] =
    useState<CustomerForm>(emptyForm);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("id", {
          ascending: false,
        });

      console.log("CustomerManagement customers:", data);
      console.log("CustomerManagement error:", error);

      if (error) {
        throw new Error(
          `顧客取得エラー: ${error.message}`
        );
      }

      setCustomers((data ?? []) as Customer[]);
    } catch (error) {
      console.error(
        "CustomerManagement LOAD ERROR:",
        error
      );

      setCustomers([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "顧客情報の取得に失敗しました。"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFormChange(
    field: keyof CustomerForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(customer: Customer) {
    setEditingId(customer.id);

    setForm({
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      note: customer.note ?? "",
    });

    setMessage("");
    setErrorMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSave() {
    setMessage("");
    setErrorMessage("");

    const name = form.name.trim();

    if (!name) {
      setErrorMessage(
        "顧客名を入力してください。"
      );
      return;
    }

    setSaving(true);

    try {
      const customerData = {
        name,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        note: form.note.trim() || null,
      };

      if (editingId !== null) {
        const { error } = await supabase
          .from("customers")
          .update({
            ...customerData,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) {
          throw new Error(
            `顧客更新エラー: ${error.message}`
          );
        }

        setMessage(
          "顧客情報を更新しました。"
        );
      } else {
        const { error } = await supabase
          .from("customers")
          .insert(customerData);

        if (error) {
          throw new Error(
            `顧客登録エラー: ${error.message}`
          );
        }

        setMessage(
          "顧客を登録しました。"
        );
      }

      resetForm();

      await loadCustomers();
    } catch (error) {
      console.error(
        "CustomerManagement SAVE ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "顧客情報の保存に失敗しました。"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "この顧客を削除しますか？\n\n予約履歴がある顧客は削除できません。"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      /*
       * 予約履歴が存在するか確認
       */
      const {
        data: reservations,
        error: reservationError,
      } = await supabase
        .from("reservations")
        .select("id")
        .eq("customer_id", id)
        .limit(1);

      if (reservationError) {
        throw new Error(
          `予約確認エラー: ${reservationError.message}`
        );
      }

      if (
        reservations &&
        reservations.length > 0
      ) {
        setErrorMessage(
          "この顧客には予約履歴があるため削除できません。"
        );
        return;
      }

      /*
       * 顧客削除
       */
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(
          `顧客削除エラー: ${error.message}`
        );
      }

      if (editingId === id) {
        resetForm();
      }

      setMessage(
        "顧客を削除しました。"
      );

      await loadCustomers();
    } catch (error) {
      console.error(
        "CustomerManagement DELETE ERROR:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "顧客の削除に失敗しました。"
      );
    }
  }

  const filteredCustomers = useMemo(() => {
    const keyword = searchKeyword
      .trim()
      .toLowerCase();

    if (!keyword) {
      return customers;
    }

    return customers.filter((customer) => {
      const name =
        customer.name?.toLowerCase() ?? "";

      const phone =
        customer.phone?.toLowerCase() ?? "";

      const email =
        customer.email?.toLowerCase() ?? "";

      return (
        name.includes(keyword) ||
        phone.includes(keyword) ||
        email.includes(keyword)
      );
    });
  }, [customers, searchKeyword]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6f8",
        padding: "30px",
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

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "3px",
                color: "#888",
                marginBottom: "6px",
              }}
            >
              CUSTOMER MANAGEMENT
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                color: "#222",
              }}
            >
              顧客管理
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              顧客情報を登録・編集・管理します。
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/admin"
              style={{
                textDecoration: "none",
                border:
                  "1px solid #d9dce1",
                borderRadius: "7px",
                padding: "10px 14px",
                background: "#fff",
                color: "#333",
                fontSize: "14px",
              }}
            >
              管理画面
            </Link>

            <Link
              to="/admin/customers"
              style={{
                textDecoration: "none",
                border:
                  "1px solid #d9dce1",
                borderRadius: "7px",
                padding: "10px 14px",
                background: "#fff",
                color: "#333",
                fontSize: "14px",
              }}
            >
              顧客一覧
            </Link>
          </div>
        </div>

        {/* メッセージ */}

        {message && (
          <div
            style={{
              background: "#eef9f0",
              border:
                "1px solid #b7dfbd",
              color: "#247a32",
              padding: "14px 16px",
              borderRadius: "8px",
              marginBottom: "18px",
            }}
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              background: "#fff0f0",
              border:
                "1px solid #ffcaca",
              color: "#c62828",
              padding: "14px 16px",
              borderRadius: "8px",
              marginBottom: "18px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* 顧客登録・編集 */}

        <section
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "12px",
            marginBottom: "25px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#888",
                  marginBottom: "4px",
                }}
              >
                CUSTOMER FORM
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                {editingId !== null
                  ? "顧客情報を編集"
                  : "新規顧客登録"}
              </h2>
            </div>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={
                  buttonSecondaryStyle
                }
              >
                編集をキャンセル
              </button>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                顧客名 *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  handleFormChange(
                    "name",
                    event.target.value
                  )
                }
                placeholder="山田 太郎"
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
                  handleFormChange(
                    "phone",
                    event.target.value
                  )
                }
                placeholder="090-0000-0000"
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
                  handleFormChange(
                    "email",
                    event.target.value
                  )
                }
                placeholder="example@example.com"
                style={inputStyle}
              />
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
                  handleFormChange(
                    "note",
                    event.target.value
                  )
                }
                rows={4}
                placeholder="顧客に関するメモ"
                style={{
                  ...inputStyle,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "10px",
            }}
          >
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={
                  buttonSecondaryStyle
                }
              >
                キャンセル
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                ...buttonPrimaryStyle,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "保存中..."
                : editingId !== null
                ? "変更を保存"
                : "顧客を登録"}
            </button>
          </div>
        </section>

        {/* 検索 */}

        <section
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <label style={labelStyle}>
            顧客検索
          </label>

          <input
            type="search"
            value={searchKeyword}
            onChange={(event) =>
              setSearchKeyword(
                event.target.value
              )
            }
            placeholder="名前・電話番号・メールアドレスで検索"
            style={inputStyle}
          />

          <div
            style={{
              marginTop: "10px",
              fontSize: "13px",
              color: "#777",
            }}
          >
            {filteredCustomers.length}件
            の顧客を表示
          </div>
        </section>

        {/* 顧客一覧 */}

        <section
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "12px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#888",
                  marginBottom: "4px",
                }}
              >
                CUSTOMER LIST
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "21px",
                }}
              >
                顧客一覧
              </h2>
            </div>

            <strong
              style={{
                color: "#555",
              }}
            >
              {filteredCustomers.length}件
            </strong>
          </div>

          {loading ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              顧客情報を読み込んでいます...
            </div>
          ) : filteredCustomers.length ===
            0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#777",
                border:
                  "1px dashed #ccc",
                borderRadius: "8px",
              }}
            >
              {searchKeyword
                ? "検索条件に一致する顧客がいません。"
                : "顧客が登録されていません。"}
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
                  minWidth: "1000px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      顧客名
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      電話番号
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      メール
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      備考
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      登録日
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
                  {filteredCustomers.map(
                    (customer) => (
                      <tr
                        key={customer.id}
                      >
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <Link
                            to={`/admin/customers/${customer.id}`}
                            style={{
                              color: "#2563eb",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            {customer.name || "-"}
                          </Link>
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {customer.phone ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {customer.email ||
                            "-"}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            maxWidth: "250px",
                            whiteSpace:
                              "normal",
                          }}
                        >
                          {customer.note ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {formatDateTime(
                            customer.created_at
                          )}
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
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <Link
                              to={`/admin/customers/${customer.id}`}
                              style={
                                buttonDetailStyle
                              }
                            >
                              詳細
                            </Link>

                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  customer
                                )
                              }
                              style={
                                buttonEditStyle
                              }
                            >
                              編集
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  customer.id
                                )
                              }
                              style={
                                buttonDeleteStyle
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
      </div>
    </div>
  );
}

function formatDateTime(
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #d9dce1",
  borderRadius: "7px",
  background: "#fff",
  fontSize: "14px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#444",
};

const buttonPrimaryStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "7px",
  padding: "11px 20px",
  background: "#222",
  color: "#fff",
  fontSize: "14px",
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  border: "1px solid #d9dce1",
  borderRadius: "7px",
  padding: "10px 16px",
  background: "#fff",
  color: "#333",
  fontSize: "14px",
  cursor: "pointer",
};

const buttonDetailStyle: React.CSSProperties = {
  display: "inline-block",
  border: "1px solid #c9d7ef",
  borderRadius: "6px",
  padding: "7px 12px",
  background: "#f5f8ff",
  color: "#2563eb",
  fontSize: "13px",
  textDecoration: "none",
  cursor: "pointer",
};

const buttonEditStyle: React.CSSProperties = {
  border: "1px solid #c9d7ef",
  borderRadius: "6px",
  padding: "7px 12px",
  background: "#fff",
  color: "#2563eb",
  fontSize: "13px",
  cursor: "pointer",
};

const buttonDeleteStyle: React.CSSProperties = {
  border: "1px solid #e0b0b0",
  borderRadius: "6px",
  padding: "7px 12px",
  background: "#fff",
  color: "#c62828",
  fontSize: "13px",
  cursor: "pointer",
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