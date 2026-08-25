import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type Reservation = {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  reservation_date: string | null;
  status: string | null;
  course_id: number | null;
};

type Course = {
  id: number;
  name: string | null;
  price: number | null;
};

type CustomerStats = {
  reservationCount: number;
  completedCount: number;
  totalSales: number;
  lastVisitDate: string | null;
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  note: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const [
        customerResult,
        reservationResult,
        courseResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .order("id", { ascending: false }),

        supabase
          .from("reservations")
          .select(
            `
              id,
              customer_id,
              customer_name,
              reservation_date,
              status,
              course_id
            `
          ),

        supabase
          .from("price_courses")
          .select("id, name, price")
          .order("id", { ascending: true }),
      ]);

      if (customerResult.error) {
        throw new Error(
          `顧客取得エラー: ${customerResult.error.message}`
        );
      }

      if (reservationResult.error) {
        console.warn(
          "予約取得エラー:",
          reservationResult.error.message
        );
      }

      if (courseResult.error) {
        console.warn(
          "コース取得エラー:",
          courseResult.error.message
        );
      }

      setCustomers(customerResult.data ?? []);
      setReservations(reservationResult.data ?? []);
      setCourses(courseResult.data ?? []);
    } catch (err) {
      console.error("LOAD CUSTOMERS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "顧客情報の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);

    setForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      note: customer.note ?? "",
    });

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCustomer() {
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("顧客名を入力してください");
      return;
    }

    setSaving(true);

    try {
      const data = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        note: form.note.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from("customers")
          .update(data)
          .eq("id", editingId);

        if (updateError) {
          throw new Error(
            `顧客更新エラー: ${updateError.message}`
          );
        }

        setMessage("顧客情報を更新しました");
      } else {
        const { error: insertError } = await supabase
          .from("customers")
          .insert(data);

        if (insertError) {
          throw new Error(
            `顧客登録エラー: ${insertError.message}`
          );
        }

        setMessage("顧客を登録しました");
      }

      await loadCustomers();
      resetForm();
    } catch (err) {
      console.error("SAVE CUSTOMER ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "顧客情報の保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: number) {
    if (!window.confirm("この顧客を削除しますか？")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(
          `顧客削除エラー: ${deleteError.message}`
        );
      }

      if (editingId === id) {
        resetForm();
      }

      await loadCustomers();

      setMessage("顧客を削除しました");
    } catch (err) {
      console.error("DELETE CUSTOMER ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "顧客の削除に失敗しました"
      );
    }
  }

  function getCustomerStats(
    customerId: number
  ): CustomerStats {
    const customerReservations = reservations.filter(
      (reservation) =>
        reservation.customer_id === customerId
    );

    const completedReservations =
      customerReservations.filter(
        (reservation) =>
          reservation.status === "completed"
      );

    const totalSales =
      completedReservations.reduce(
        (total, reservation) => {
          if (!reservation.course_id) {
            return total;
          }

          const course = courses.find(
            (item) =>
              item.id === reservation.course_id
          );

          return total + (course?.price ?? 0);
        },
        0
      );

    const dates = completedReservations
      .map(
        (reservation) =>
          reservation.reservation_date
      )
      .filter(
        (date): date is string =>
          Boolean(date)
      )
      .sort((a, b) =>
        b.localeCompare(a)
      );

    return {
      reservationCount:
        customerReservations.length,
      completedCount:
        completedReservations.length,
      totalSales,
      lastVisitDate:
        dates.length > 0 ? dates[0] : null,
    };
  }

  function formatCurrency(value: number) {
    return `${value.toLocaleString("ja-JP")}円`;
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "-";
    }

    const parts = date.split("-");

    if (parts.length !== 3) {
      return date;
    }

    return `${parts[0]}年${Number(
      parts[1]
    )}月${Number(parts[2])}日`;
  }

  const filteredCustomers = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return customers;
    }

    return customers.filter((customer) => {
      return (
        customer.name
          .toLowerCase()
          .includes(keyword) ||
        (customer.phone ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (customer.email ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [customers, search]);

  const totalCustomerSales = useMemo(() => {
    return customers.reduce(
      (total, customer) =>
        total +
        getCustomerStats(customer.id)
          .totalSales,
      0
    );
  }, [customers, reservations, courses]);

  const repeatCustomers = useMemo(() => {
    return customers.filter(
      (customer) =>
        getCustomerStats(customer.id)
          .completedCount >= 2
    ).length;
  }, [customers, reservations]);

  if (loading) {
    return (
      <main
        style={{
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        顧客情報を読み込み中...
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
          maxWidth: "1100px",
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
              CUSTOMER MANAGEMENT
            </p>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "28px",
              }}
            >
              顧客管理
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
              to="/admin/reservations"
              style={{
                textDecoration: "none",
                color: "#111",
                background: "#fff",
                padding: "10px 16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
              }}
            >
              予約管理
            </Link>
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
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#15803d",
              borderRadius: "8px",
            }}
          >
            {message}
          </div>
        )}

        {/* 顧客KPI */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <KpiCard
            label="登録顧客"
            value={`${customers.length}人`}
            sub="現在登録されている顧客"
          />

          <KpiCard
            label="リピーター"
            value={`${repeatCustomers}人`}
            sub="2回以上の完了予約"
          />

          <KpiCard
            label="顧客累計売上"
            value={formatCurrency(
              totalCustomerSales
            )}
            sub="完了した予約のみ"
          />
        </section>

        {/* 顧客登録 */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "20px",
            }}
          >
            {editingId !== null
              ? "顧客情報を編集"
              : "顧客を登録"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "15px",
            }}
          >
            <FormInput
              label="顧客名 *"
              value={form.name}
              onChange={(value) =>
                setForm({
                  ...form,
                  name: value,
                })
              }
              placeholder="例：山田 太郎"
            />

            <FormInput
              label="電話番号"
              value={form.phone}
              onChange={(value) =>
                setForm({
                  ...form,
                  phone: value,
                })
              }
              placeholder="090-1234-5678"
            />

            <FormInput
              label="メール"
              value={form.email}
              onChange={(value) =>
                setForm({
                  ...form,
                  email: value,
                })
              }
              placeholder="example@email.com"
            />
          </div>

          <label
            style={{
              display: "block",
              marginTop: "15px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "6px",
              }}
            >
              備考
            </div>

            <textarea
              value={form.note}
              onChange={(e) =>
                setForm({
                  ...form,
                  note: e.target.value,
                })
              }
              rows={4}
              placeholder="顧客に関するメモ"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                resize: "vertical",
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={saveCustomer}
              disabled={saving}
              style={{
                flex: 1,
                padding: "13px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontWeight: "bold",
              }}
            >
              {saving
                ? "保存中..."
                : editingId !== null
                ? "変更を保存"
                : "顧客を登録"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  flex: 1,
                  padding: "13px",
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                編集をキャンセル
              </button>
            )}
          </div>
        </section>

        {/* 顧客一覧 */}

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
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#777",
                }}
              >
                CUSTOMER LIST
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  fontSize: "22px",
                }}
              >
                顧客一覧
              </h2>
            </div>

            <strong>
              {filteredCustomers.length}件
            </strong>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="名前・電話番号・メールで検索"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "6px",
              marginBottom: "20px",
            }}
          />

          {filteredCustomers.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#777",
                border: "1px dashed #ccc",
                borderRadius: "8px",
              }}
            >
              顧客は登録されていません。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {filteredCustomers.map(
                (customer) => {
                  const stats =
                    getCustomerStats(
                      customer.id
                    );

                  return (
                    <article
                      key={customer.id}
                      style={{
                        padding: "20px",
                        border: "1px solid #ddd",
                        borderRadius: "10px",
                        background: "#fff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "flex-start",
                          gap: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minWidth: "250px",
                          }}
                        >
                          <strong
                            style={{
                              fontSize: "19px",
                            }}
                          >
                            {customer.name}
                          </strong>

                          <div
                            style={{
                              marginTop: "7px",
                              color: "#555",
                            }}
                          >
                            {customer.phone ||
                              "電話番号未登録"}
                          </div>

                          {customer.email && (
                            <div
                              style={{
                                marginTop: "4px",
                                color: "#777",
                                fontSize: "14px",
                              }}
                            >
                              {customer.email}
                            </div>
                          )}

                          {customer.note && (
                            <div
                              style={{
                                marginTop: "8px",
                                color: "#666",
                                fontSize: "14px",
                              }}
                            >
                              備考：
                              {customer.note}
                            </div>
                          )}
                        </div>

                        {/* 顧客実績 */}

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(3, minmax(100px, 1fr))",
                            gap: "10px",
                            minWidth: "340px",
                          }}
                        >
                          <MiniStat
                            label="予約回数"
                            value={`${stats.reservationCount}回`}
                          />

                          <MiniStat
                            label="来店回数"
                            value={`${stats.completedCount}回`}
                          />

                          <MiniStat
                            label="累計売上"
                            value={formatCurrency(
                              stats.totalSales
                            )}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "18px",
                          paddingTop: "15px",
                          borderTop:
                            "1px solid #eee",
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "center",
                          gap: "15px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#666",
                          }}
                        >
                          最終来店：
                          <strong
                            style={{
                              color: "#111",
                              marginLeft: "5px",
                            }}
                          >
                            {formatDate(
                              stats.lastVisitDate
                            )}
                          </strong>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <Link
                            to={`/admin/customers/${customer.id}`}
                            style={{
                              padding: "9px 14px",
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              textDecoration: "none",
                              display: "inline-block",
                            }}
                          >
                            詳細
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              startEdit(
                                customer
                              )
                            }
                            style={{
                              padding:
                                "9px 14px",
                              background:
                                "#111",
                              color: "#fff",
                              border: "none",
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
                              deleteCustomer(
                                customer.id
                              )
                            }
                            style={{
                              padding:
                                "9px 14px",
                              background:
                                "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius:
                                "6px",
                              cursor:
                                "pointer",
                            }}
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <div
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "11px",
          border: "1px solid #ccc",
          borderRadius: "6px",
        }}
      />
    </label>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#777",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "25px",
          fontWeight: 700,
          marginBottom: "6px",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "#888",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f8f9fb",
        border: "1px solid #eee",
        borderRadius: "8px",
        padding: "10px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#777",
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "14px",
          fontWeight: "bold",
        }}
      >
        {value}
      </div>
    </div>
  );
}