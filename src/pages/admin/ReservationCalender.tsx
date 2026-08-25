import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase"; // プロジェクトに合わせてパスを調整してください

// 型定義例（既存の型定義に合わせて調整してください）
interface Reservation {
  id: number;
  therapist_id: number | null;
  reservation_date: string;
  start_time: string;
  course: string | null;
  course_id: number | null;
  status: string;
  customer_name: string;
  customer_phone?: string;
  phone?: string;
  message?: string;
  note?: string;
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

function ReservationCalender() {
  const navigate = useNavigate();

  // State管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [editForm, setEditForm] = useState({
    customer_name: "",
    phone: "",
    reservation_date: "",
    start_time: "",
    therapist_id: "",
    course: "",
    course_id: "",
    note: "",
  });

  // 補助関数
  const getReservationDate = (res: Reservation) => res.reservation_date || "";
  const getStartTime = (res: Reservation) => res.start_time ? res.start_time.slice(0, 5) : "";
  const getPhone = (res: Reservation) => res.customer_phone || res.phone || "-";
  const getDateString = (date: Date) => date.toISOString().split("T")[0];
  const getTodayString = () => getDateString(new Date());
  const formatTime = (timeStr?: string) => timeStr ? timeStr.slice(0, 5) : "-";

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "受付";
      case "confirmed": return "確定";
      case "completed": return "完了";
      case "cancelled": return "キャンセル";
      default: return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed": return { background: "#dcfce7", color: "#15803d" };
      case "completed": return { background: "#dbeafe", color: "#1d4ed8" };
      case "cancelled": return { background: "#fee2e2", color: "#b91c1c" };
      default: return { background: "#f3f4f6", color: "#374151" };
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const reservationQuery = supabase
        .from("reservations")
        .select(`
          id,
          therapist_id,
          reservation_date,
          start_time,
          course,
          course_id,
          status,
          customer_name,
          customer_phone,
          phone,
          message,
          note
        `)
        .order("created_at", { ascending: false });

      const therapistQuery = supabase
        .from("therapists")
        .select("id, name")
        .order("id", { ascending: true });

      const courseQuery = supabase
        .from("price_courses")
        .select("id, name, minutes, price")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const [reservationRes, therapistRes, courseRes] = await Promise.all([
        reservationQuery,
        therapistQuery,
        courseQuery,
      ]);

      if (reservationRes.error) {
        throw new Error(`予約取得エラー: ${reservationRes.error.message}`);
      }
      if (therapistRes.error) {
        throw new Error(`セラピスト取得エラー: ${therapistRes.error.message}`);
      }
      if (courseRes.error) {
        throw new Error(`コース取得エラー: ${courseRes.error.message}`);
      }

      setReservations(reservationRes.data ?? []);
      setTherapists(therapistRes.data ?? []);
      setCourses(courseRes.data ?? []);
    } catch (err) {
      console.error("LOAD DATA ERROR:", err);
      setError(
        err instanceof Error ? err.message : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date();

    setCurrentDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setSelectedDate(
      [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-")
    );

    loadData();
  }, []);

  function getTherapistName(therapistId: number | null) {
    if (!therapistId) return "未指定";
    const therapist = therapists.find((item) => item.id === therapistId);
    return therapist?.name || `ID:${therapistId}`;
  }

  async function updateReservationStatus(
    reservationId: number,
    status: string
  ) {
    setError("");
    setUpdatingId(reservationId);

    try {
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ status })
        .eq("id", reservationId);

      if (updateError) {
        throw new Error(`予約ステータスの更新に失敗しました: ${updateError.message}`);
      }

      const { data: updatedReservation, error: selectError } = await supabase
        .from("reservations")
        .select(`
          id,
          therapist_id,
          reservation_date,
          start_time,
          course,
          course_id,
          status,
          customer_name,
          customer_phone,
          phone,
          message,
          note
        `)
        .eq("id", reservationId)
        .maybeSingle();

      if (selectError) {
        throw new Error(`更新後の予約取得に失敗しました: ${selectError.message}`);
      }

      if (!updatedReservation) {
        throw new Error("更新後の予約データを取得できませんでした");
      }

      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: updatedReservation.status }
            : reservation
        )
      );

      setSelectedReservation((current) =>
        current && current.id === reservationId
          ? { ...current, status: updatedReservation.status }
          : current
      );
    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);
      setError(
        err instanceof Error ? err.message : "予約ステータスの更新に失敗しました"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calenderDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<Date | null> = [];

    for (let i = 0; i < firstWeekday; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [year, month]);

  const selectedReservations = reservations
    .filter((reservation) => getReservationDate(reservation) === selectedDate)
    .filter(
      (reservation) =>
        statusFilter === "all" || reservation.status === statusFilter
    )
    .filter(
      (reservation) =>
        therapistFilter === "all" ||
        String(reservation.therapist_id) === therapistFilter
    )
    .sort((a, b) => getStartTime(a).localeCompare(getStartTime(b)));

  function changeMonth(amount: number) {
    setCurrentDate(new Date(year, month + amount, 1));
  }

  function goToday() {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getDateString(now));
  }

  const startEditing = (reservation: Reservation) => {
    setError("");

    let selectedCourseId = reservation.course_id
      ? String(reservation.course_id)
      : "";

    if (!selectedCourseId && reservation.course) {
      const matchedCourse = courses.find(
        (course) => course.name === reservation.course
      );

      if (matchedCourse) {
        selectedCourseId = String(matchedCourse.id);
      }
    }

    setEditForm({
      customer_name: reservation.customer_name || "",
      phone: reservation.customer_phone || reservation.phone || "",
      reservation_date: reservation.reservation_date || "",
      start_time: reservation.start_time || "",
      therapist_id: reservation.therapist_id
        ? String(reservation.therapist_id)
        : "",
      course: reservation.course || "",
      course_id: selectedCourseId,
      note: reservation.note || reservation.message || "",
    });

    setIsEditing(true);
  };

  const saveReservation = async () => {
    if (!selectedReservation) return;

    setUpdatingId(selectedReservation.id);
    setError("");

    try {
      console.log("========== 予約保存開始 ==========");

      const courseId = editForm.course_id
        ? Number(editForm.course_id)
        : null;

      const selectedCourse = courses.find(
        (course) => course.id === courseId
      );

      const updateData = {
        customer_name: editForm.customer_name,
        customer_phone: editForm.phone,
        phone: editForm.phone,
        reservation_date: editForm.reservation_date,
        start_time: editForm.start_time,
        therapist_id: editForm.therapist_id
          ? Number(editForm.therapist_id)
          : null,
        course: selectedCourse?.name || editForm.course || null,
        course_id: courseId,
        note: editForm.note,
      };

      console.log("保存データ:", updateData);
      console.log("選択コース:", selectedCourse);

      // コース時間を使って予約時間の重複を確認
      if (
        courseId &&
        editForm.therapist_id &&
        editForm.reservation_date &&
        editForm.start_time
      ) {
        if (!selectedCourse) {
          throw new Error("選択されたコースが見つかりません。");
        }

        const newStartMinutes =
          Number(editForm.start_time.slice(0, 2)) * 60 +
          Number(editForm.start_time.slice(3, 5));

        const newDuration = Number(selectedCourse.minutes || 0);

        if (newDuration <= 0) {
          throw new Error("選択されたコースの所要時間が設定されていません。");
        }

        const newEndMinutes = newStartMinutes + newDuration;

        const { data: existingReservations, error: duplicateError } =
          await supabase
            .from("reservations")
            .select("id, customer_name, start_time, course_id")
            .eq("therapist_id", Number(editForm.therapist_id))
            .eq("reservation_date", editForm.reservation_date)
            .neq("id", selectedReservation.id)
            .neq("status", "cancelled");

        if (duplicateError) {
          throw new Error(
            `重複予約の確認に失敗しました: ${duplicateError.message}`
          );
        }

        for (const reservation of existingReservations || []) {
          if (!reservation.start_time || !reservation.course_id) {
            continue;
          }

          const existingCourse = courses.find(
            (course) => course.id === Number(reservation.course_id)
          );

          if (!existingCourse) {
            continue;
          }

          const existingStartMinutes =
            Number(reservation.start_time.slice(0, 2)) * 60 +
            Number(reservation.start_time.slice(3, 5));

          const existingDuration = Number(existingCourse.minutes || 0);

          const existingEndMinutes =
            existingStartMinutes + existingDuration;

          const isOverlapping =
            newStartMinutes < existingEndMinutes &&
            newEndMinutes > existingStartMinutes;

          if (isOverlapping) {
            throw new Error(
              `予約時間が重複しています。既存予約「${
                reservation.customer_name || "お客様"
              }」の時間と重なるため、この時間では予約できません。`
            );
          }
        }
      }

      const { error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", selectedReservation.id);

      if (error) {
        console.error("予約更新エラー:", error);
        throw new Error(
          `予約の更新に失敗しました: ${error.message}`
        );
      }

      console.log("予約保存成功");

      setSelectedReservation({
        ...selectedReservation,
        ...updateData,
      });

      setIsEditing(false);

      await loadData();

    } catch (err) {
      console.error("SAVE RESERVATION ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "予約の更新に失敗しました"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: "80px 20px", textAlign: "center" }}>
        予約カレンダーを読み込み中...
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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
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
              RESERVATION CALENDER
            </p>
            <h1 style={{ margin: "6px 0 0", fontSize: "28px" }}>
              予約カレンダー
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                navigate(
                  `/admin/reservations/new?date=${encodeURIComponent(selectedDate)}`
                );
              }}
              style={{
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ＋ 新規予約登録
            </button>
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
            <button
              type="button"
              onClick={loadData}
              style={{
                padding: "10px 16px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              更新
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
            }}
          >
            {error}
          </div>
        )}

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
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px",
              gap: "15px",
            }}
          >
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              style={{
                padding: "10px 16px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ← 前月
            </button>

            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: "24px" }}>
                {year}年 {month + 1}月
              </h2>
              <button
                type="button"
                onClick={goToday}
                style={{
                  marginTop: "8px",
                  border: "none",
                  background: "none",
                  textDecoration: "underline",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                今日
              </button>
            </div>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              style={{
                padding: "10px 16px",
                background: "#fff",
                border: "1px solid #ddd",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              次月 →
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderTop: "1px solid #eee",
              borderLeft: "1px solid #eee",
            }}
          >
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div
                key={day}
                style={{
                  padding: "12px 5px",
                  textAlign: "center",
                  fontWeight: "bold",
                  background: "#f9fafb",
                  borderRight: "1px solid #eee",
                  borderBottom: "1px solid #eee",
                }}
              >
                {day}
              </div>
            ))}

            {calenderDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    style={{
                      minHeight: "110px",
                      background: "#fafafa",
                      borderRight: "1px solid #eee",
                      borderBottom: "1px solid #eee",
                    }}
                  />
                );
              }

              const dateString = getDateString(date);

              const dayReservations = reservations.filter(
                (reservation) =>
                  getReservationDate(reservation) === dateString &&
                  reservation.status !== "cancelled"
              );

              const isSelected = dateString === selectedDate;
              const isToday = dateString === getTodayString();

              return (
                <button
                  key={dateString}
                  type="button"
                  onClick={() => setSelectedDate(dateString)}
                  style={{
                    minHeight: "110px",
                    padding: "10px",
                    textAlign: "left",
                    background: isSelected ? "#f3f4f6" : "#fff",
                    border: "none",
                    borderRight: "1px solid #eee",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    outline: isSelected ? "2px solid #111" : "none",
                    outlineOffset: "-2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: isToday || isSelected ? "bold" : "normal",
                      }}
                    >
                      {date.getDate()}
                    </span>

                    {isToday && (
                      <span
                        style={{
                          fontSize: "10px",
                          background: "#111",
                          color: "#fff",
                          padding: "3px 6px",
                          borderRadius: "999px",
                        }}
                      >
                        TODAY
                      </span>
                    )}
                  </div>

                  {dayReservations.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "grid",
                        gap: "4px",
                      }}
                    >
                      {dayReservations
                        .sort((a, b) =>
                          getStartTime(a).localeCompare(getStartTime(b))
                        )
                        .slice(0, 4)
                        .map((reservation) => (
                          <div
                            key={reservation.id}
                            style={{
                              padding: "5px 6px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              lineHeight: 1.3,
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              ...getStatusStyle(reservation.status),
                            }}
                          >
                            <strong>
                              {getStartTime(reservation)}
                            </strong>
                            {" "}
                            {reservation.customer_name || "名前なし"}
                          </div>
                        ))}

                      {dayReservations.length > 4 && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#666",
                            marginTop: "2px",
                          }}
                        >
                          他 {dayReservations.length - 4}件
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #eee",
            padding: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "12px", color: "#777" }}>
                SELECTED DATE
              </p>
              <h2 style={{ margin: "5px 0 0" }}>{selectedDate || "未選択"}</h2>
            </div>

            <strong>{selectedReservations.length}件</strong>
          </div>

          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label
                htmlFor="status-filter"
                style={{ fontWeight: "bold", fontSize: "14px" }}
              >
                ステータス：
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="all">すべて</option>
                <option value="pending">受付</option>
                <option value="confirmed">確定</option>
                <option value="completed">完了</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label
                htmlFor="therapist-filter"
                style={{ fontWeight: "bold", fontSize: "14px" }}
              >
                セラピスト：
              </label>
              <select
                id="therapist-filter"
                value={therapistFilter}
                onChange={(e) => setTherapistFilter(e.target.value)}
                style={{
                  padding: "10px 14px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="all">すべて</option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={String(therapist.id)}>
                    {therapist.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedReservations.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#777",
                border: "1px dashed #ccc",
                borderRadius: "8px",
              }}
            >
              この日の予約はありません。
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {selectedReservations.map((reservation) => (
                <article
                  key={reservation.id}
                  onClick={() => {
                    setSelectedReservation(reservation);
                    setIsEditing(false);
                  }}
                  style={{
                    padding: "18px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "15px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "22px" }}>
                        {getStartTime(reservation)}
                      </strong>
                      <span style={{ marginLeft: "15px", color: "#555" }}>
                        {reservation.customer_name || "（名前なし）"}
                      </span>
                    </div>

                    <span
                      style={{
                        ...getStatusStyle(reservation.status),
                        padding: "6px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {getStatusLabel(reservation.status)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: "6px",
                      marginTop: "15px",
                      color: "#555",
                      fontSize: "14px",
                    }}
                  >
                    <div>
                      <strong>セラピスト：</strong>
                      {getTherapistName(reservation.therapist_id)}
                    </div>
                    <div>
                      <strong>コース：</strong>
                      {reservation.course || "未設定"}
                    </div>
                    <div>
                      <strong>電話：</strong>
                      {getPhone(reservation)}
                    </div>
                    {(reservation.message || reservation.note) && (
                      <div>
                        <strong>備考：</strong>
                        {reservation.message || reservation.note}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedReservation && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            overflowY: "auto",
            padding: "40px 20px",
            boxSizing: "border-box",
          }}
          onClick={() => {
            setSelectedReservation(null);
            setIsEditing(false);
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "520px",
              margin: "0 auto",
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedReservation(null);
                setIsEditing(false);
              }}
              style={{
                position: "absolute",
                top: "15px",
                right: "15px",
                padding: "6px 12px",
                background: "#eee",
                color: "#333",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              閉じる
            </button>

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
                  RESERVATION DETAIL
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "22px" }}>
                  {isEditing ? "予約情報の編集" : "予約詳細"}
                </h2>
              </div>
            </div>

            {isEditing ? (
              <div style={{ display: "grid", gap: "14px" }}>
                <label>
                  <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                    お客様名
                  </div>
                  <input
                    type="text"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      boxSizing: "border-box",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <label>
                  <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                    電話番号
                  </div>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      boxSizing: "border-box",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label>
                    <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                      予約日
                    </div>
                    <input
                      type="date"
                      value={editForm.reservation_date}
                      onChange={(e) => setEditForm({ ...editForm, reservation_date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px",
                        boxSizing: "border-box",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                      }}
                    />
                  </label>

                  <label>
                    <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                      開始時間
                    </div>
                    <input
                      type="time"
                      value={editForm.start_time}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px",
                        boxSizing: "border-box",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                      }}
                    />
                  </label>
                </div>

                <label>
                  <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                    セラピスト
                  </div>
                  <select
                    value={editForm.therapist_id}
                    onChange={(e) => setEditForm({ ...editForm, therapist_id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      background: "#fff",
                    }}
                  >
                    <option value="">未指定</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginBottom: "4px",
                    }}
                  >
                    コース名
                  </div>

                  <select
                    value={editForm.course_id}
                    onChange={(e) => {
                      const selectedCourseId = e.target.value;

                      const selectedCourse = courses.find(
                        (course) => String(course.id) === selectedCourseId
                      );

                      setEditForm({
                        ...editForm,
                        course_id: selectedCourseId,
                        course: selectedCourse?.name || "",
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      boxSizing: "border-box",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      background: "#fff",
                    }}
                  >
                    <option value="">コースを選択してください</option>

                    {courses.map((course) => (
                      <option key={course.id} value={String(course.id)}>
                        {course.name}
                      </option>
                    ))}
                  </select>

                  {editForm.course_id && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "12px 15px",
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    >
                      {(() => {
                        const selectedCourse = courses.find(
                          (course) =>
                            String(course.id) === String(editForm.course_id)
                        );

                        if (!selectedCourse) {
                          return null;
                        }

                        return (
                          <>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "6px",
                              }}
                            >
                              <span style={{ color: "#666", fontSize: "13px" }}>
                                所要時間
                              </span>

                              <strong style={{ fontSize: "16px" }}>
                                {selectedCourse.minutes}分
                              </strong>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ color: "#666", fontSize: "13px" }}>
                                料金
                              </span>

                              <strong style={{ fontSize: "16px" }}>
                                {selectedCourse.price != null
                                  ? selectedCourse.price.toLocaleString()
                                  : "-"}円
                              </strong>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </label>

                <label>
                  <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                    備考・ご要望
                  </div>
                  <textarea
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px",
                      boxSizing: "border-box",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      resize: "vertical",
                    }}
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: "12px",
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>

                  <button
                    type="button"
                    onClick={saveReservation}
                    disabled={updatingId === selectedReservation.id}
                    style={{
                      padding: "12px",
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {updatingId === selectedReservation.id ? "保存中..." : "変更を保存"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "14px" }}>
                <div style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
                    お客様名
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                    {selectedReservation.customer_name || "未登録"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
                      予約日
                    </div>
                    <div style={{ fontWeight: "bold" }}>
                      {selectedReservation.reservation_date || "-"}
                    </div>
                  </div>

                  <div style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
                      開始時間
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "18px" }}>
                      {formatTime(selectedReservation.start_time)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "15px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      marginBottom: "8px",
                    }}
                  >
                    コース
                  </div>

                  {(() => {
                    const selectedCourse = courses.find(
                      (course) =>
                        String(course.id) ===
                        String(selectedReservation.course_id)
                    );

                    return (
                      <div>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "18px",
                          }}
                        >
                          {selectedCourse?.name ||
                            selectedReservation.course ||
                            "-"}
                        </div>

                        {selectedCourse && (
                          <div
                            style={{
                              marginTop: "6px",
                              color: "#555",
                              fontSize: "14px",
                            }}
                          >
                            {selectedCourse.minutes}分
                            {" / "}
                            {selectedCourse.price != null
                              ? selectedCourse.price.toLocaleString()
                              : "-"}円
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
                    電話番号
                  </div>
                  <div style={{ fontWeight: "bold" }}>
                    {getPhone(selectedReservation)}
                  </div>
                </div>

                <div style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
                    ご要望・備考
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {selectedReservation.note || selectedReservation.message || "なし"}
                  </div>
                </div>

                <div style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "5px" }}>
                    ステータス
                  </div>
                  <div style={{ fontWeight: "bold" }}>
                    {getStatusLabel(selectedReservation.status)}
                  </div>
                </div>

                {/* ステータス変更ボタン */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "12px" }}>
                  <button
                    type="button"
                    disabled={updatingId === selectedReservation.id}
                    onClick={() => updateReservationStatus(selectedReservation.id, "confirmed")}
                    style={{
                      padding: "12px",
                      background: updatingId === selectedReservation.id ? "#9ca3af" : "#15803d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: updatingId === selectedReservation.id ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {updatingId === selectedReservation.id ? "更新中..." : "予約確定"}
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === selectedReservation.id}
                    onClick={() => updateReservationStatus(selectedReservation.id, "completed")}
                    style={{
                      padding: "12px",
                      background: updatingId === selectedReservation.id ? "#9ca3af" : "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: updatingId === selectedReservation.id ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {updatingId === selectedReservation.id ? "更新中..." : "完了"}
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === selectedReservation.id}
                    onClick={() => {
                      if (window.confirm("この予約をキャンセルしますか？")) {
                        updateReservationStatus(selectedReservation.id, "cancelled");
                      }
                    }}
                    style={{
                      gridColumn: "1 / -1",
                      padding: "12px",
                      background: updatingId === selectedReservation.id ? "#9ca3af" : "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: updatingId === selectedReservation.id ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {updatingId === selectedReservation.id ? "更新中..." : "予約をキャンセル"}
                  </button>
                </div>

                {/* 編集・閉じるボタン */}
                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <button
                    type="button"
                    onClick={() => startEditing(selectedReservation)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    編集
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReservation(null)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default ReservationCalender;