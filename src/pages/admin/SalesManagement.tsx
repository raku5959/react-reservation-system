import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Reservation = {
  id: number;
  customer_name: string | null;
  reservation_date: string | null;
  reservation_time: string | null;
  therapist_id: number | null;
  course_id: number | null;
  status: string | null;
};

type Therapist = {
  id: number;
  name: string | null;
};

type Course = {
  id: number;
  name: string | null;
  price: number | null;
};

type DailySales = {
  date: string;
  sales: number;
  count: number;
};

export default function SalesManagement() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  useEffect(() => {
    loadSalesData();
  }, []);

  async function loadSalesData() {
    setLoading(true);
    setErrorMessage("");

    const [
      reservationResult,
      therapistResult,
      courseResult,
    ] = await Promise.all([
      supabase
        .from("reservations")
        .select(`
          id,
          customer_name,
          reservation_date,
          reservation_time,
          therapist_id,
          course_id,
          status
        `)
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
        .select("id, name, price")
        .order("id", {
          ascending: true,
        }),
    ]);

    if (reservationResult.error) {
      console.error(
        "売上用予約取得エラー:",
        reservationResult.error
      );

      setErrorMessage(
        `予約データ取得エラー: ${reservationResult.error.message}`
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

    setReservations(reservationResult.data || []);
    setTherapists(therapistResult.data || []);
    setCourses(courseResult.data || []);

    setLoading(false);
  }

  function getTherapistName(id: number | null) {
    if (!id) return "-";

    return (
      therapists.find(
        (therapist) => therapist.id === id
      )?.name || "-"
    );
  }

  function getCourse(id: number | null) {
    if (!id) return null;

    return (
      courses.find(
        (course) => course.id === id
      ) || null
    );
  }

  function formatMoney(value: number) {
    return `${value.toLocaleString()}円`;
  }

  function getStatusLabel(status: string | null) {
    switch (status) {
      case "confirmed":
        return "確定";

      case "pending":
        return "仮予約";

      case "arrived":
        return "来店済み";

      case "completed":
        return "完了";

      case "cancelled":
        return "キャンセル";

      default:
        return status || "-";
    }
  }

  /*
   * 選択月の予約
   */

  const monthlyReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (!reservation.reservation_date) {
        return false;
      }

      return reservation.reservation_date.startsWith(
        selectedMonth
      );
    });
  }, [reservations, selectedMonth]);

  /*
   * 完了予約
   */

  const completedReservations = useMemo(() => {
    return monthlyReservations.filter(
      (reservation) =>
        reservation.status === "completed"
    );
  }, [monthlyReservations]);

  /*
   * 月間売上
   */

  const monthlySales = useMemo(() => {
    return completedReservations.reduce(
      (total, reservation) => {
        const course = getCourse(
          reservation.course_id
        );

        return total + (course?.price || 0);
      },
      0
    );
  }, [completedReservations, courses]);

  /*
   * 平均客単価
   */

  const averageSales = useMemo(() => {
    if (completedReservations.length === 0) {
      return 0;
    }

    return Math.round(
      monthlySales /
        completedReservations.length
    );
  }, [
    monthlySales,
    completedReservations,
  ]);

  /*
   * 日別売上
   */

  const dailySales = useMemo(() => {
    const result: DailySales[] = [];

    const [year, month] =
      selectedMonth.split("-").map(Number);

    const daysInMonth = new Date(
      year,
      month,
      0
    ).getDate();

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const date = `${selectedMonth}-${String(
        day
      ).padStart(2, "0")}`;

      const dayReservations =
        completedReservations.filter(
          (reservation) =>
            reservation.reservation_date ===
            date
        );

      const sales =
        dayReservations.reduce(
          (total, reservation) => {
            const course = getCourse(
              reservation.course_id
            );

            return (
              total +
              (course?.price || 0)
            );
          },
          0
        );

      result.push({
        date,
        sales,
        count: dayReservations.length,
      });
    }

    return result;
  }, [
    selectedMonth,
    completedReservations,
    courses,
  ]);

  const activeDailySales = useMemo(() => {
    return dailySales.filter(
      (item) => item.sales > 0
    );
  }, [dailySales]);

  /*
   * セラピスト別売上
   */
  const therapistSales = useMemo(() => {
    const result = therapists.map((therapist) => {
      const therapistReservations =
        completedReservations.filter(
          (reservation) =>
            reservation.therapist_id === therapist.id
        );

      const sales = therapistReservations.reduce(
        (total, reservation) => {
          const course = getCourse(
            reservation.course_id
          );

          return total + (course?.price || 0);
        },
        0
      );

      const count = therapistReservations.length;

      const average =
        count > 0
          ? Math.round(sales / count)
          : 0;

      return {
        id: therapist.id,
        name: therapist.name || "名前未設定",
        count,
        sales,
        average,
      };
    });

    return result
      .filter((item) => item.count > 0)
      .sort((a, b) => b.sales - a.sales);
  }, [
    therapists,
    completedReservations,
    courses,
  ]);

  /*
   * コース別売上
   */
  const courseSales = useMemo(() => {
    const result = courses.map((course) => {
      const courseReservations =
        completedReservations.filter(
          (reservation) =>
            reservation.course_id === course.id
        );

      const count = courseReservations.length;

      const sales = count * (course.price || 0);

      const ratio =
        monthlySales > 0
          ? Math.round(
              (sales / monthlySales) * 100
            )
          : 0;

      return {
        id: course.id,
        name: course.name || "コース名未設定",
        price: course.price || 0,
        count,
        sales,
        ratio,
      };
    });

    return result
      .filter((item) => item.count > 0)
      .sort((a, b) => b.sales - a.sales);
  }, [
    courses,
    completedReservations,
    monthlySales,
  ]);

  /*
   * 最大日別売上
   */

  const maxDailySales = useMemo(() => {
    if (dailySales.length === 0) {
      return 0;
    }

    return Math.max(
      ...dailySales.map(
        (item) => item.sales
      )
    );
  }, [dailySales]);

  /*
   * 売上のない状態
   */

  if (loading) {
    return (
      <main style={pageStyle}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            textAlign: "center",
            paddingTop: "100px",
            color: "#666",
          }}
        >
          売上データを読み込んでいます...
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
            <div style={eyebrowStyle}>
              SALES MANAGEMENT
            </div>

            <h1 style={titleStyle}>
              売上管理
            </h1>

            <p style={subtitleStyle}>
              完了した予約をもとに売上を集計します。
            </p>
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
              style={secondaryButtonStyle}
            >
              管理画面へ戻る
            </Link>

            <button
              type="button"
              onClick={loadSalesData}
              style={primaryButtonStyle}
            >
              再読み込み
            </button>
          </div>
        </header>

        {/* =========================
            エラー
        ========================= */}

        {errorMessage && (
          <div style={errorStyle}>
            {errorMessage}
          </div>
        )}

        {/* =========================
            月選択
        ========================= */}

        <section style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h2 style={sectionTitleStyle}>
                集計期間
              </h2>

              <p style={sectionDescriptionStyle}>
                集計したい年月を選択してください。
              </p>
            </div>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  event.target.value
                )
              }
              style={monthInputStyle}
            />
          </div>
        </section>

        {/* =========================
            KPI
        ========================= */}

        <section style={kpiGridStyle}>
          <StatCard
            label="月間売上"
            value={formatMoney(monthlySales)}
          />

          <StatCard
            label="完了件数"
            value={`${completedReservations.length}件`}
          />

          <StatCard
            label="平均客単価"
            value={formatMoney(averageSales)}
          />

          <StatCard
            label="対象予約数"
            value={`${monthlyReservations.length}件`}
          />
        </section>

        {/* =========================
            日別売上
        ========================= */}

        <section style={cardStyle}>
          <SectionHeader
            title="日別売上"
            description="完了済み予約のみを集計しています。"
            right={formatMoney(monthlySales)}
          />

          {maxDailySales > 0 && (
            <div
              style={{
                overflowX: "auto",
                paddingBottom: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "5px",
                  height: "190px",
                  minWidth: "700px",
                  padding: "15px 5px 0",
                  borderBottom:
                    "1px solid #eee",
                }}
              >
                {dailySales.map((item) => {
                  const height =
                    maxDailySales > 0
                      ? Math.max(
                          4,
                          Math.round(
                            (item.sales /
                              maxDailySales) *
                              150
                          )
                        )
                      : 4;

                  return (
                    <div
                      key={item.date}
                      title={`${item.date} ${formatMoney(
                        item.sales
                      )}`}
                      style={{
                        flex: 1,
                        minWidth: "10px",
                        height: `${height}px`,
                        background: "#111",
                        borderRadius:
                          "4px 4px 0 0",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {activeDailySales.length === 0 ? (
            <EmptyMessage>
              この月の売上はありません。
            </EmptyMessage>
          ) : (
            <SalesTable
              rows={activeDailySales}
            />
          )}
        </section>

        {/* =========================
            セラピスト別売上分析
        ========================= */}

        <section
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "25px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                letterSpacing: "3px",
                color: "#999",
              }}
            >
              THERAPIST SALES
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                fontSize: "21px",
              }}
            >
              セラピスト別売上
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: "13px",
                color: "#777",
              }}
            >
              選択した月の完了済み予約をセラピスト別に集計しています。
            </p>
          </div>

          {therapistSales.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              この月のセラピスト別売上はありません。
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
                  minWidth: "650px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      順位
                    </th>

                    <th style={tableHeaderStyle}>
                      セラピスト
                    </th>

                    <th style={tableHeaderStyle}>
                      件数
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      売上
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      平均客単価
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {therapistSales.map(
                    (item, index) => (
                      <tr key={item.id}>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: "bold",
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: 600,
                          }}
                        >
                          {item.name}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.count}件
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "right",
                            fontWeight: "bold",
                          }}
                        >
                          {formatMoney(item.sales)}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "right",
                          }}
                        >
                          {formatMoney(item.average)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =========================
            コース別売上分析
        ========================= */}

        <section
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "25px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                letterSpacing: "3px",
                color: "#999",
              }}
            >
              COURSE SALES
            </p>

            <h2
              style={{
                margin: "5px 0 0",
                fontSize: "21px",
              }}
            >
              コース別売上分析
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: "13px",
                color: "#777",
              }}
            >
              選択した月の完了済み予約をコース別に集計しています。
            </p>
          </div>

          {courseSales.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#777",
              }}
            >
              この月のコース売上はありません。
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
                  minWidth: "700px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      順位
                    </th>

                    <th style={tableHeaderStyle}>
                      コース
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      料金
                    </th>

                    <th style={tableHeaderStyle}>
                      件数
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      売上
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      構成比
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {courseSales.map(
                    (item, index) => (
                      <tr key={item.id}>
                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: "bold",
                          }}
                        >
                          {index + 1}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            fontWeight: 600,
                          }}
                        >
                          {item.name}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "right",
                          }}
                        >
                          {formatMoney(item.price)}
                        </td>

                        <td
                          style={tableCellStyle}
                        >
                          {item.count}件
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "right",
                            fontWeight: "bold",
                          }}
                        >
                          {formatMoney(item.sales)}
                        </td>

                        <td
                          style={{
                            ...tableCellStyle,
                            textAlign: "right",
                          }}
                        >
                          {item.ratio}%
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        ...tableCellStyle,
                        fontWeight: "bold",
                      }}
                    >
                      合計
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "16px",
                      }}
                    >
                      {formatMoney(monthlySales)}
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        {/* =========================
            売上明細
        ========================= */}

        <section style={cardStyle}>
          <SectionHeader
            title="売上明細"
            description="選択月の完了済み予約です。"
            right={`${completedReservations.length}件`}
          />

          {completedReservations.length === 0 ? (
            <EmptyMessage>
              この月の完了済み予約はありません。
            </EmptyMessage>
          ) : (
            <div style={tableWrapperStyle}>
              <table
                style={{
                  ...tableStyle,
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      予約日
                    </th>

                    <th style={tableHeaderStyle}>
                      時間
                    </th>

                    <th style={tableHeaderStyle}>
                      顧客
                    </th>

                    <th style={tableHeaderStyle}>
                      セラピスト
                    </th>

                    <th style={tableHeaderStyle}>
                      コース
                    </th>

                    <th style={tableHeaderStyle}>
                      ステータス
                    </th>

                    <th
                      style={{
                        ...tableHeaderStyle,
                        textAlign: "right",
                      }}
                    >
                      売上
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {completedReservations.map(
                    (reservation) => {
                      const course =
                        getCourse(
                          reservation.course_id
                        );

                      return (
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
                            {formatJapaneseDate(
                              reservation.reservation_date
                            )}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {reservation.reservation_time
                              ? reservation.reservation_time.slice(
                                  0,
                                  5
                                )
                              : "-"}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            {reservation.customer_name ||
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
                            {course?.name ||
                              "-"}
                          </td>

                          <td
                            style={
                              tableCellStyle
                            }
                          >
                            <StatusBadge>
                              {getStatusLabel(
                                reservation.status
                              )}
                            </StatusBadge>
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
                              course?.price ||
                                0
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        ...tableCellStyle,
                        fontWeight: 700,
                      }}
                    >
                      合計
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        fontWeight: 700,
                      }}
                    >
                      {
                        completedReservations.length
                      }
                      件
                    </td>

                    <td
                      style={{
                        ...tableCellStyle,
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: "16px",
                      }}
                    >
                      {formatMoney(
                        monthlySales
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <footer style={footerStyle}>
          店舗管理システム
        </footer>
      </div>
    </main>
  );
}

/* =====================================================
   コンポーネント
===================================================== */

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

function SectionHeader({
  title,
  description,
  right,
}: {
  title: string;
  description: string;
  right?: string;
}) {
  return (
    <div style={sectionHeaderStyle}>
      <div>
        <h2 style={sectionTitleStyle}>
          {title}
        </h2>

        <p style={sectionDescriptionStyle}>
          {description}
        </p>
      </div>

      {right && (
        <div
          style={{
            fontWeight: 700,
            fontSize: "16px",
          }}
        >
          {right}
        </div>
      )}
    </div>
  );
}

function EmptyMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "45px 20px",
        textAlign: "center",
        color: "#777",
        fontSize: "14px",
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: "999px",
        background: "#f3f4f6",
        color: "#374151",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function SalesTable({
  rows,
}: {
  rows: DailySales[];
}) {
  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={tableHeaderStyle}>
              日付
            </th>

            <th style={tableHeaderStyle}>
              件数
            </th>

            <th
              style={{
                ...tableHeaderStyle,
                textAlign: "right",
              }}
            >
              売上
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((item) => (
            <tr key={item.date}>
              <td style={tableCellStyle}>
                {formatJapaneseDate(
                  item.date
                )}
              </td>

              <td style={tableCellStyle}>
                {item.count}件
              </td>

              <td
                style={{
                  ...tableCellStyle,
                  textAlign: "right",
                  fontWeight: 700,
                }}
              >
                {item.sales.toLocaleString()}円
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =====================================================
   ヘルパー
===================================================== */

function formatJapaneseDate(
  date: string | null
) {
  if (!date) {
    return "-";
  }

  const [
    year,
    month,
    day,
  ] = date
    .split("-")
    .map(Number);

  return `${year}年${month}月${day}日`;
}

/* =====================================================
   スタイル
===================================================== */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f5f6f8",
  padding: "30px 20px 80px",
  boxSizing: "border-box",
  color: "#111",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap",
  marginBottom: "25px",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "12px",
  letterSpacing: "4px",
  color: "#777",
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "30px",
  fontWeight: 700,
  letterSpacing: "-0.5px",
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#666",
  fontSize: "14px",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: "7px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 16px",
  background: "#fff",
  color: "#111",
  border: "1px solid #ddd",
  borderRadius: "7px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
};

const errorStyle: React.CSSProperties = {
  padding: "15px",
  marginBottom: "20px",
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#be123c",
  borderRadius: "8px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "14px",
  padding: "24px",
  marginBottom: "25px",
  boxShadow:
    "0 2px 10px rgba(0,0,0,0.05)",
  boxSizing: "border-box",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "21px",
  color: "#222",
};

const sectionDescriptionStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "13px",
  color: "#777",
};

const monthInputStyle: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: "7px",
  fontSize: "15px",
  background: "#fff",
};

const kpiGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
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
  color: "#111",
};

const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "600px",
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

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  marginTop: "35px",
  color: "#999",
  fontSize: "12px",
};