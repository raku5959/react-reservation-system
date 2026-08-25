import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Reservation {
  id: number;
  customer_name: string | null;
  customer_phone: string | null;
  phone: string | null;
  reservation_date: string | null;
  start_time: string | null;
  end_time: string | null;
  therapist_id: number | null;
  course_id: number | null;
  course: string | null;
  status: string | null;
  note: string | null;
  message: string | null;
}

interface Therapist {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  minutes: number;
  price: number;
}

export default function TherapistReservationList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  });

  const [therapistFilter, setTherapistFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [reservationRes, therapistRes, courseRes] =
        await Promise.all([
          supabase
            .from("reservations")
            .select(`
              id,
              customer_name,
              customer_phone,
              phone,
              reservation_date,
              start_time,
              end_time,
              therapist_id,
              course_id,
              course,
              status,
              note,
              message
            `)
            .order("start_time", { ascending: true }),

          supabase
            .from("therapists")
            .select("id, name")
            .order("id", { ascending: true }),

          supabase
            .from("price_courses")
            .select("id, name, minutes, price")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

      if (reservationRes.error) {
        throw new Error(
          `予約取得エラー: ${reservationRes.error.message}`
        );
      }

      if (therapistRes.error) {
        throw new Error(
          `セラピスト取得エラー: ${therapistRes.error.message}`
        );
      }

      if (courseRes.error) {
        throw new Error(
          `コース取得エラー: ${courseRes.error.message}`
        );
      }

      setReservations(reservationRes.data ?? []);
      setTherapists(therapistRes.data ?? []);
      setCourses(courseRes.data ?? []);
    } catch (err) {
      console.error("THERAPIST RESERVATION LIST ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const getTodayString = () => {
    const today = new Date();

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  };

  const formatTime = (time?: string | null) => {
    if (!time) return "-";

    return time.slice(0, 5);
  };

  

  const getCourseName = (reservation: Reservation) => {
    if (reservation.course) {
      return reservation.course;
    }

    if (reservation.course_id) {
      const course = courses.find(
        (item) => item.id === reservation.course_id
      );

      return course?.name || "未設定";
    }

    return "未設定";
  };

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case "pending":
        return "受付";

      case "confirmed":
        return "確定";

      case "completed":
        return "完了";

      case "cancelled":
        return "キャンセル";

      default:
        return status || "未設定";
    }
  };

  const getStatusStyle = (status?: string | null) => {
    switch (status) {
      case "confirmed":
        return {
          background: "#dcfce7",
          color: "#15803d",
        };

      case "completed":
        return {
          background: "#dbeafe",
          color: "#1d4ed8",
        };

      case "cancelled":
        return {
          background: "#fee2e2",
          color: "#b91c1c",
        };

      case "pending":
        return {
          background: "#fef3c7",
          color: "#b45309",
        };

      default:
        return {
          background: "#f3f4f6",
          color: "#374151",
        };
    }
  };

  const filteredReservations = useMemo(() => {
    return reservations
      .filter(
        (reservation) =>
          reservation.reservation_date === selectedDate
      )
      .filter(
        (reservation) =>
          therapistFilter === "all" ||
          String(reservation.therapist_id) === therapistFilter
      )
      .filter(
        (reservation) =>
          statusFilter === "all" ||
          reservation.status === statusFilter
      )
      .sort((a, b) =>
        formatTime(a.start_time).localeCompare(
          formatTime(b.start_time)
        )
      );
  }, [
    reservations,
    selectedDate,
    therapistFilter,
    statusFilter,
  ]);

  const reservationsByTherapist = useMemo(() => {
    const result: Record<number, Reservation[]> = {};

    filteredReservations.forEach((reservation) => {
      if (!reservation.therapist_id) return;

      if (!result[reservation.therapist_id]) {
        result[reservation.therapist_id] = [];
      }

      result[reservation.therapist_id].push(reservation);
    });

    return result;
  }, [filteredReservations]);

  const unassignedReservations = filteredReservations.filter(
    (reservation) => !reservation.therapist_id
  );

  const displayedTherapists =
    therapistFilter === "all"
      ? therapists
      : therapists.filter(
          (therapist) =>
            String(therapist.id) === therapistFilter
        );

  const totalReservations = filteredReservations.length;

  const confirmedCount = filteredReservations.filter(
    (reservation) => reservation.status === "confirmed"
  ).length;

  const pendingCount = filteredReservations.filter(
    (reservation) => reservation.status === "pending"
  ).length;

  const completedCount = filteredReservations.filter(
    (reservation) => reservation.status === "completed"
  ).length;

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        セラピスト別予約一覧を読み込み中...
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
        {/* ヘッダー */}
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
              THERAPIST RESERVATIONS
            </p>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "28px",
              }}
            >
              セラピスト別予約一覧
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
              to="/admin/reservations/calendar"
              style={{
                padding: "10px 16px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ddd",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              予約カレンダー
            </Link>

            <Link
              to="/admin/reservations"
              style={{
                padding: "10px 16px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ddd",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              予約一覧
            </Link>

            <Link
              to="/admin"
              style={{
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              管理画面
            </Link>
          </div>
        </header>

        {/* エラー */}
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

        {/* 日付・フィルター */}
        <section
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #eee",
            padding: "25px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "15px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <label
                htmlFor="reservation-date"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                予約日
              </label>

              <input
                id="reservation-date"
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayString())}
              style={{
                marginTop: "18px",
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              今日
            </button>

            <div>
              <label
                htmlFor="therapist-filter"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                セラピスト
              </label>

              <select
                id="therapist-filter"
                value={therapistFilter}
                onChange={(e) =>
                  setTherapistFilter(e.target.value)
                }
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              >
                <option value="all">全員</option>

                {therapists.map((therapist) => (
                  <option
                    key={therapist.id}
                    value={String(therapist.id)}
                  >
                    {therapist.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-filter"
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                ステータス
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                }}
              >
                <option value="all">すべて</option>
                <option value="pending">受付</option>
                <option value="confirmed">確定</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>

            <button
              type="button"
              onClick={loadData}
              style={{
                marginTop: "18px",
                padding: "10px 16px",
                background: "#fff",
                color: "#111",
                border: "1px solid #ccc",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              更新
            </button>
          </div>
        </section>

        {/* 集計 */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#777",
              }}
            >
              TOTAL
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "28px",
                fontWeight: "bold",
              }}
            >
              {totalReservations}件
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#777",
              }}
            >
              受付
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "28px",
                fontWeight: "bold",
                color: "#b45309",
              }}
            >
              {pendingCount}件
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#777",
              }}
            >
              確定
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "28px",
                fontWeight: "bold",
                color: "#15803d",
              }}
            >
              {confirmedCount}件
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #eee",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#777",
              }}
            >
              完了
            </div>

            <div
              style={{
                marginTop: "5px",
                fontSize: "28px",
                fontWeight: "bold",
                color: "#2563eb",
              }}
            >
              {completedCount}件
            </div>
          </div>
        </section>

        {/* セラピスト別一覧 */}
        <section
          style={{
            display: "grid",
            gap: "20px",
          }}
        >
          {displayedTherapists.map((therapist) => {
            const therapistReservations =
              reservationsByTherapist[therapist.id] || [];

            return (
              <article
                key={therapist.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #eee",
                  overflow: "hidden",
                }}
              >
                {/* セラピストヘッダー */}
                <div
                  style={{
                    padding: "18px 20px",
                    background: "#111",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "11px",
                        letterSpacing: "2px",
                        opacity: 0.7,
                      }}
                    >
                      THERAPIST
                    </div>

                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        marginTop: "3px",
                      }}
                    >
                      {therapist.name}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "7px 12px",
                      background: "#fff",
                      color: "#111",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: "bold",
                    }}
                  >
                    {therapistReservations.length}件
                  </div>
                </div>

                {/* 予約 */}
                {therapistReservations.length === 0 ? (
                  <div
                    style={{
                      padding: "30px 20px",
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    この日の予約はありません
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "0",
                    }}
                  >
                    {therapistReservations.map(
                      (reservation) => (
                        <div
                          key={reservation.id}
                          style={{
                            padding: "18px 20px",
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          <div
                            style={{
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
                                display: "flex",
                                alignItems: "center",
                                gap: "15px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "22px",
                                  fontWeight: "bold",
                                  minWidth: "65px",
                                }}
                              >
                                {formatTime(
                                  reservation.start_time
                                )}
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontSize: "17px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {reservation.customer_name ||
                                    "名前なし"}
                                </div>

                                <div
                                  style={{
                                    marginTop: "4px",
                                    color: "#666",
                                    fontSize: "13px",
                                  }}
                                >
                                  {getCourseName(
                                    reservation
                                  )}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                ...getStatusStyle(
                                  reservation.status
                                ),
                                padding: "6px 12px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              {getStatusLabel(
                                reservation.status
                              )}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "20px",
                              flexWrap: "wrap",
                              marginTop: "12px",
                              color: "#666",
                              fontSize: "13px",
                            }}
                          >
                            <span>
                              電話：
                              {reservation.customer_phone ||
                                reservation.phone ||
                                "-"}
                            </span>

                            {reservation.end_time && (
                              <span>
                                終了：
                                {formatTime(
                                  reservation.end_time
                                )}
                              </span>
                            )}
                          </div>

                          {(reservation.note ||
                            reservation.message) && (
                            <div
                              style={{
                                marginTop: "10px",
                                padding: "10px",
                                background: "#f9fafb",
                                borderRadius: "6px",
                                fontSize: "13px",
                                color: "#555",
                              }}
                            >
                              備考：
                              {reservation.note ||
                                reservation.message}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* セラピスト未指定 */}
          {therapistFilter === "all" &&
            unassignedReservations.length > 0 && (
              <article
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #f59e0b",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 20px",
                    background: "#fffbeb",
                    color: "#92400e",
                    fontWeight: "bold",
                  }}
                >
                  セラピスト未指定
                </div>

                {unassignedReservations.map(
                  (reservation) => (
                    <div
                      key={reservation.id}
                      style={{
                        padding: "18px 20px",
                        borderTop: "1px solid #eee",
                      }}
                    >
                      <strong>
                        {formatTime(
                          reservation.start_time
                        )}
                      </strong>

                      <span
                        style={{
                          marginLeft: "15px",
                        }}
                      >
                        {reservation.customer_name ||
                          "名前なし"}
                      </span>

                      <div
                        style={{
                          marginTop: "5px",
                          color: "#666",
                          fontSize: "13px",
                        }}
                      >
                        {getCourseName(reservation)}
                      </div>
                    </div>
                  )
                )}
              </article>
            )}
        </section>

        {displayedTherapists.length === 0 && (
          <div
            style={{
              padding: "50px 20px",
              background: "#fff",
              borderRadius: "12px",
              textAlign: "center",
              color: "#777",
            }}
          >
            セラピストが登録されていません。
          </div>
        )}
      </div>
    </main>
  );
}