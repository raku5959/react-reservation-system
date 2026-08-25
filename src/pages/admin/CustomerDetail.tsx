import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

type Reservation = {
  id: number;
  customer_id: number | null;
  therapist_id: number | null;
  course_id: number | null;
  reservation_date: string | null;
  reservation_time: string | null;
  status: string | null;
  note: string | null;
};

type Therapist = {
  id: number;
  name: string | null;
};

type Course = {
  id: number;
  name: string | null;
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [therapists, setTherapists] =
    useState<Therapist[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    if (!id) {
      setErrorMessage(
        "顧客IDが指定されていません。"
      );
      setLoading(false);
      return;
    }

    const customerId = Number(id);

    if (
      Number.isNaN(customerId) ||
      customerId <= 0
    ) {
      setErrorMessage(
        "顧客IDが正しくありません。"
      );
      setLoading(false);
      return;
    }

    loadCustomerData(customerId);
  }, [id]);

  async function loadCustomerData(
    customerId: number
  ) {
    setLoading(true);
    setErrorMessage("");

    const [
      customerResult,
      reservationResult,
      therapistResult,
      courseResult,
    ] = await Promise.all([
      supabase
        .from("customers")
        .select(
          `
            id,
            name,
            phone,
            email,
            note,
            created_at,
            updated_at
          `
        )
        .eq("id", customerId)
        .maybeSingle(),

      supabase
        .from("reservations")
        .select(
          `
            id,
            customer_id,
            therapist_id,
            course_id,
            reservation_date,
            reservation_time,
            status,
            note
          `
        )
        .eq("customer_id", customerId)
        .order("reservation_date", {
          ascending: false,
        }),

      supabase
        .from("therapists")
        .select("id, name")
        .order("id", {
          ascending: true,
        }),

      supabase
        .from("price_courses")
        .select("id, name")
        .order("id", {
          ascending: true,
        }),
    ]);

    console.log(
      "CustomerDetail 顧客取得:",
      customerResult.data
    );

    console.log(
      "CustomerDetail 顧客取得エラー:",
      customerResult.error
    );

    if (customerResult.error) {
      console.error(
        "顧客取得エラー:",
        customerResult.error
      );

      setErrorMessage(
        `顧客取得エラー: ${customerResult.error.message}`
      );

      setCustomer(null);
      setLoading(false);
      return;
    }

    if (!customerResult.data) {
      setErrorMessage(
        `顧客ID「${customerId}」の顧客情報が見つかりません。`
      );

      setCustomer(null);
      setReservations([]);
      setLoading(false);
      return;
    }

    if (reservationResult.error) {
      console.error(
        "予約履歴取得エラー:",
        reservationResult.error
      );

      setErrorMessage(
        `予約履歴取得エラー: ${reservationResult.error.message}`
      );

      setLoading(false);
      return;
    }

    if (therapistResult.error) {
      console.error(
        "セラピスト取得エラー:",
        therapistResult.error
      );
    }

    if (courseResult.error) {
      console.error(
        "コース取得エラー:",
        courseResult.error
      );
    }

    setCustomer(customerResult.data);

    setReservations(
      reservationResult.data || []
    );

    setTherapists(
      therapistResult.data || []
    );

    setCourses(
      courseResult.data || []
    );

    setLoading(false);
  }

  function getTherapistName(
    therapistId: number | null
  ) {
    if (!therapistId) {
      return "-";
    }

    const therapist = therapists.find(
      (item) => item.id === therapistId
    );

    return therapist?.name || "-";
  }

  function getCourseName(
    courseId: number | null
  ) {
    if (!courseId) {
      return "-";
    }

    const course = courses.find(
      (item) => item.id === courseId
    );

    return course?.name || "-";
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(
      "ja-JP",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  }

  function getStatusLabel(
    status: string | null
  ) {
    switch (status) {
      case "confirmed":
        return "確定";

      case "pending":
        return "仮予約";

      case "completed":
        return "完了";

      case "cancelled":
        return "キャンセル";

      default:
        return status || "-";
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f6f8",
          padding: "30px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            textAlign: "center",
            padding: "60px 20px",
            color: "#777",
          }}
        >
          顧客情報を読み込んでいます...
        </div>
      </div>
    );
  }

  if (!customer) {
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
          <div
            style={{
              background: "#fff0f0",
              border:
                "1px solid #ffcaca",
              color: "#c62828",
              padding: "16px",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {errorMessage ||
              "顧客情報が見つかりません。"}
          </div>

          <Link
            to="/admin/customers"
            style={{
              color: "#2563eb",
              textDecoration: "none",
            }}
          >
            ← 顧客管理へ戻る
          </Link>
        </div>
      </div>
    );
  }

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
        {/* 戻る */}
        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <Link
            to="/admin/customers"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontSize: "14px",
            }}
          >
            ← 顧客管理へ戻る
          </Link>
        </div>

        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "25px",
            flexWrap: "wrap",
            gap: "15px",
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
              顧客詳細
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#666",
              }}
            >
              顧客情報と予約履歴を確認できます。
            </p>
          </div>

          {/* アクションボタンエリア */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* 顧客情報を編集ボタン */}
            <Link
              to={`/admin/customers/${customer.id}/edit`}
              style={{
                display: "inline-block",
                padding: "12px 20px",
                background: "#fff",
                color: "#111",
                textDecoration: "none",
                border: "1px solid #ddd",
                borderRadius: "7px",
                fontWeight: "bold",
              }}
            >
              顧客情報を編集
            </Link>

            {/* 新規予約リンクボタン */}
            <Link
              to={`/admin/reservations/new?customer_id=${customer.id}`}
              style={{
                display: "inline-block",
                padding: "12px 20px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "7px",
                fontWeight: "bold",
              }}
            >
              この顧客で予約を登録
            </Link>
          </div>
        </div>

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

        {/* 顧客基本情報 */}
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
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "21px",
            }}
          >
            {customer.name ||
              "名前未登録"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "18px",
            }}
          >
            <InfoItem
              label="電話番号"
              value={
                customer.phone || "-"
              }
            />

            <InfoItem
              label="メールアドレス"
              value={
                customer.email || "-"
              }
            />

            <InfoItem
              label="登録日"
              value={formatDate(
                customer.created_at
              )}
            />

            <InfoItem
              label="最終更新"
              value={formatDate(
                customer.updated_at
              )}
            />
          </div>

          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "#f8f9fb",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#666",
                marginBottom: "8px",
              }}
            >
              顧客メモ
            </div>

            <div
              style={{
                whiteSpace: "pre-wrap",
                color: "#333",
                lineHeight: 1.7,
              }}
            >
              {customer.note ||
                "メモはありません。"}
            </div>
          </div>
        </section>

        {/* 利用状況 */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <StatCard
            label="予約回数"
            value={`${reservations.length}回`}
          />

          <StatCard
            label="最終予約日"
            value={
              reservations.length > 0
                ? formatDate(
                    reservations[0]
                      .reservation_date
                  )
                : "-"
            }
          />

          <StatCard
            label="登録日"
            value={formatDate(
              customer.created_at
            )}
          />
        </section>

        {/* 予約履歴 */}
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
              marginBottom: "20px",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "21px",
              }}
            >
              予約履歴
            </h2>

            <span
              style={{
                fontSize: "13px",
                color: "#777",
              }}
            >
              {reservations.length}件
            </span>
          </div>

          {reservations.length ===
          0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              予約履歴はありません。
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
                  minWidth: "850px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      予約日
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      時間
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      セラピスト
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      コース
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      ステータス
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      備考
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reservations.map(
                    (reservation) => (
                      <tr
                        key={
                          reservation.id
                        }
                      >
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {formatDate(
                            reservation.reservation_date
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {reservation.reservation_time ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {getTherapistName(
                            reservation.therapist_id
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {getCourseName(
                            reservation.course_id
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <span
                            style={{
                              display:
                                "inline-block",
                              padding:
                                "5px 10px",
                              borderRadius:
                                "999px",
                              background:
                                "#f1f3f5",
                              fontSize:
                                "12px",
                            }}
                          >
                            {getStatusLabel(
                              reservation.status
                            )}
                          </span>
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            whiteSpace:
                              "normal",
                            minWidth:
                              "180px",
                          }}
                        >
                          {reservation.note ||
                            "-"}
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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "13px",
          color: "#777",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "15px",
          color: "#222",
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
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
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        boxShadow:
          "0 2px 10px rgba(0,0,0,0.05)",
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
          fontSize: "24px",
          fontWeight: 700,
          color: "#222",
        }}
      >
        {value}
      </div>
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