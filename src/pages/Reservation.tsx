import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Therapist = {
  id: number;
  name: string;
  image_url: string | null;
};

type PriceCourse = {
  id: number;
  name: string;
  minutes: string | number | null;
  price: number | null;
  description: string | null;
  sort_order: number;
};

type TherapistSchedule = {
  id: number;
  therapist_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
};

type ReservationRow = {
  id: number;
  therapist_id: number | null;
  reservation_date: string | null;
  start_time: string | null;
  reservation_time: string | null;
  course: string | null;
  course_id: number | null;
  status: string | null;
};

function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function Reservation() {
  const { therapistId } = useParams();
  const navigate = useNavigate();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [course, setCourse] = useState("");
  const [courseId, setCourseId] = useState<number | null>(null);

  const [courses, setCourses] = useState<PriceCourse[]>([]);

  const [reservationDate, setReservationDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // コース情報から所要時間（分）を取得するヘルパー関数
  const getCourseMinutesById = useCallback((id: number | null, courseName?: string | null): number => {
    if (id) {
      const found = courses.find((c) => c.id === id);
      if (found && found.minutes) {
        const parsed = parseInt(String(found.minutes).replace(/[^0-9]/g, ""), 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    // バックアップ：コース名文字列から数値抽出（例: "90分" -> 90）
    if (courseName) {
      const parsed = parseInt(courseName.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 60; // デフォルト60分
  }, [courses]);

  // コース取得処理
  useEffect(() => {
    async function loadCourses() {
      try {
        const { data, error } = await supabase
          .from("price_courses")
          .select("id, name, minutes, price, description, sort_order")
          .order("sort_order", { ascending: true });

        if (error) {
          throw new Error(`コース取得エラー: ${error.message}`);
        }

        setCourses(data ?? []);
      } catch (err) {
        console.error("COURSE LOAD ERROR:", err);
        setError(
          err instanceof Error
            ? err.message
            : "コースの取得に失敗しました"
        );
      }
    }

    loadCourses();
  }, []);

  // セラピスト・スケジュールデータの初期取得
  useEffect(() => {
    if (!therapistId) return;

    let isMounted = true;
    async function loadTherapistData(id: number) {
      setLoading(true);
      setError("");

      try {
        const therapistRes = await supabase
          .from("therapists")
          .select("id, name, image_url, is_active")
          .eq("id", id)
          .eq("is_active", true)
          .single();

        if (therapistRes.error) {
          throw new Error("セラピストが見つからないか非公開です");
        }

        const scheduleRes = await supabase
          .from("therapist_schedules")
          .select("*")
          .eq("therapist_id", id)
          .gte("work_date", getTodayString())
          .eq("is_working", true)
          .order("work_date", { ascending: true });

        if (scheduleRes.error) {
          throw new Error(`出勤予定の取得に失敗しました: ${scheduleRes.error.message}`);
        }

        if (isMounted) {
          setTherapist(therapistRes.data);
          setSchedules(scheduleRes.data ?? []);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "データの取得に失敗しました");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTherapistData(Number(therapistId));
    return () => {
      isMounted = false;
    };
  }, [therapistId]);

  // 指定日の予約状況を取得する関数
  const loadReservations = useCallback(
    async (date: string) => {
      if (!therapistId || !date) {
        setReservations([]);
        return;
      }

      setLoadingSlots(true);
      setError("");

      try {
        const { data, error } = await supabase
          .from("reservations")
          .select(
            "id, therapist_id, reservation_date, start_time, reservation_time, course, course_id, status"
          )
          .eq("therapist_id", Number(therapistId))
          .eq("reservation_date", date)
          .neq("status", "cancelled");

        if (error) {
          throw new Error(`予約状況の取得に失敗しました: ${error.message}`);
        }

        setReservations(data ?? []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "予約状況の取得に失敗しました");
      } finally {
        setLoadingSlots(false);
      }
    },
    [therapistId]
  );

  // 予約日付が変更されたときのみ予約リストを再取得
  useEffect(() => {
    if (reservationDate) {
      loadReservations(reservationDate);
    }
  }, [reservationDate, loadReservations]);

  const selectedDaySchedule = schedules.find(
    (schedule) => schedule.work_date === reservationDate
  );

  function isSlotAvailable(time: string) {
    if (!selectedDaySchedule) return false;

    const selectedMinutes = timeToMinutes(time);
    const courseMinutes = getCourseMinutesById(courseId, course);

    const scheduleStart = timeToMinutes(selectedDaySchedule.start_time);
    const scheduleEnd = timeToMinutes(selectedDaySchedule.end_time);
    const selectedEnd = selectedMinutes + courseMinutes;

    if (selectedMinutes < scheduleStart || selectedEnd > scheduleEnd) {
      return false;
    }

    for (const reservation of reservations) {
      const reservedStart = reservation.start_time
        ? timeToMinutes(reservation.start_time)
        : reservation.reservation_time
        ? timeToMinutes(reservation.reservation_time.slice(11, 16))
        : null;

      if (reservedStart === null) continue;

      const reservedMinutes = getCourseMinutesById(reservation.course_id, reservation.course);
      const reservedEnd = reservedStart + reservedMinutes;

      const overlap = selectedMinutes < reservedEnd && selectedEnd > reservedStart;
      if (overlap) return false;
    }

    return true;
  }

  function getAvailableSlots() {
    if (!selectedDaySchedule || !courseId) return [];

    const start = timeToMinutes(selectedDaySchedule.start_time);
    const end = timeToMinutes(selectedDaySchedule.end_time);
    const courseMinutes = getCourseMinutesById(courseId, course);

    const slots: string[] = [];
    for (let minutes = start; minutes + courseMinutes <= end; minutes += 30) {
      const time = minutesToTime(minutes);
      if (isSlotAvailable(time)) {
        slots.push(time);
      }
    }
    return slots;
  }

  const availableSlots = getAvailableSlots();

  async function submitReservation() {
    setError("");

    if (!reservationDate) {
      setError("予約日を選択してください");
      return;
    }

    if (!selectedDaySchedule) {
      setError("この日は出勤予定がありません");
      return;
    }

    if (!startTime) {
      setError("開始時間を選択してください");
      return;
    }

    if (!courseId) {
      setError("コースを選択してください");
      return;
    }

    if (!isSlotAvailable(startTime)) {
      setError(
        "申し訳ありません。この時間は現在予約できません。別の時間を選択してください。"
      );
      await loadReservations(reservationDate);
      return;
    }

    if (!customerName.trim()) {
      setError("お名前を入力してください");
      return;
    }

    if (!customerPhone.trim()) {
      setError("電話番号を入力してください");
      return;
    }

    if (!therapist) {
      setError("セラピスト情報を取得できません");
      return;
    }

    setSubmitting(true);

    try {
      const reservationData = {
        therapist_id: therapist.id,
        reservation_date: reservationDate,
        start_time: startTime,
        reservation_time: `${reservationDate} ${startTime}`,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        phone: customerPhone.trim(),
        course_id: courseId,
        course: course || null,
        message: message.trim() || null,
        status: "pending",
      };

      const { error: insertError } = await supabase
        .from("reservations")
        .insert(reservationData);

      if (insertError) {
        if (
          insertError.code === "23505" ||
          insertError.message?.includes("reservations_unique_therapist_datetime")
        ) {
          setError("この時間は先ほど予約が入りました。別の時間を選択してください。");
          await loadReservations(reservationDate);
        } else {
          setError(`予約登録エラー: ${insertError.message}`);
        }
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      console.error("RESERVATION ERROR:", err);
      const errorObject = err as { message?: string };
      setError(`予約登録エラー: ${errorObject?.message || "エラーが発生しました"}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: "80px 20px", textAlign: "center", color: "#666" }}>
        予約画面を読み込み中...
      </main>
    );
  }

  if (error && !therapist) {
    return (
      <main style={{ padding: "80px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "16px" }}>予約画面を表示できません</h1>
        <p style={{ color: "#e11d48", marginBottom: "24px" }}>{error}</p>
        <Link to="/therapists" style={{ color: "#111", textDecoration: "underline" }}>
          セラピスト一覧へ戻る
        </Link>
      </main>
    );
  }

  if (!therapist) return null;

  if (success) {
    return (
      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ letterSpacing: "4px", fontSize: "12px", color: "#999" }}>RESERVATION</p>
        <h1 style={{ fontSize: "24px", margin: "10px 0 20px" }}>予約を受け付けました</h1>
        <p style={{ lineHeight: 1.8, color: "#555" }}>
          ご予約ありがとうございます。<br />
          内容を確認のうえ、担当者よりご連絡いたします。
        </p>

        <div style={{ marginTop: "30px", padding: "24px", background: "#f9fafb", textAlign: "left", borderRadius: "8px", border: "1px solid #eee" }}>
          <p style={{ marginBottom: "12px" }}><strong>セラピスト：</strong>{therapist.name}</p>
          <p style={{ marginBottom: "12px" }}><strong>予約日：</strong>{reservationDate}</p>
          <p style={{ marginBottom: "12px" }}><strong>開始時間：</strong>{startTime}</p>
          <p style={{ marginBottom: "12px" }}><strong>コース：</strong>{course}</p>
          <p style={{ margin: 0 }}><strong>お名前：</strong>{customerName}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/therapists")}
          style={{ marginTop: "30px", padding: "14px 28px", background: "#111", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
        >
          セラピスト一覧へ戻る
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "650px", margin: "0 auto", padding: "40px 20px 80px" }}>
      <Link to={`/therapists/${therapist.id}`} style={{ color: "#666", textDecoration: "none", fontSize: "14px" }}>
        ← 詳細ページへ戻る
      </Link>

      <header style={{ textAlign: "center", marginTop: "30px", marginBottom: "30px" }}>
        <p style={{ letterSpacing: "4px", fontSize: "11px", color: "#999" }}>RESERVATION</p>
        <h1 style={{ margin: "5px 0 10px", fontSize: "26px" }}>WEB予約</h1>
        <p style={{ fontSize: "18px", fontWeight: "bold", color: "#333", margin: 0 }}>
          指名: {therapist.name}
        </p>
      </header>

      {error && (
        <div style={{ padding: "15px", marginBottom: "20px", background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: "6px" }}>
          {error}
        </div>
      )}

      <section style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "30px", borderRadius: "10px" }}>
        <div style={{ display: "grid", gap: "20px" }}>
          <label>
            <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>予約日 *</div>
            <input
              type="date"
              value={reservationDate}
              onChange={(e) => {
                setReservationDate(e.target.value);
                setStartTime("");
              }}
              min={getTodayString()}
              style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #ccc", borderRadius: "6px" }}
            />
          </label>

          {reservationDate && (
            <div style={{ marginTop: "-10px", padding: "12px", background: selectedDaySchedule ? "#f0fdf4" : "#fff1f2", color: selectedDaySchedule ? "#15803d" : "#b91c1c", borderRadius: "6px", fontSize: "13px" }}>
              {selectedDaySchedule
                ? `出勤予定時間: ${selectedDaySchedule.start_time.slice(0, 5)} 〜 ${selectedDaySchedule.end_time.slice(0, 5)}`
                : "※この日は出勤予定が登録されていません"}
            </div>
          )}

          <label>
            <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>コース *</div>
            <select
              value={courseId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setCourseId(id || null);

                const selectedCourse = courses.find((item) => item.id === id);
                setCourse(selectedCourse?.name ?? "");
                setStartTime("");
              }}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            >
              <option value="">コースを選択してください</option>
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.price !== null ? ` ¥${item.price.toLocaleString()}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div style={{ marginBottom: "10px", fontWeight: "bold", fontSize: "14px" }}>開始時間 *</div>

            {loadingSlots ? (
              <div style={{ padding: "20px", textAlign: "center", background: "#f9fafb", borderRadius: "8px", color: "#777" }}>
                空き時間を確認しています...
              </div>
            ) : !reservationDate ? (
              <div style={{ padding: "20px", textAlign: "center", background: "#f9fafb", borderRadius: "8px", color: "#777" }}>
                先に予約日を選択してください
              </div>
            ) : !selectedDaySchedule ? (
              <div style={{ padding: "20px", textAlign: "center", background: "#f9fafb", borderRadius: "8px", color: "#777" }}>
                この日は出勤予定がありません
              </div>
            ) : !courseId ? (
              <div style={{ padding: "20px", textAlign: "center", background: "#f9fafb", borderRadius: "8px", color: "#777" }}>
                コースを選択してください
              </div>
            ) : availableSlots.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", color: "#c2410c" }}>
                このコースで予約できる時間がありません
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {availableSlots.map((time) => {
                  const selected = startTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setStartTime(time)}
                      style={{
                        padding: "14px 8px",
                        border: selected ? "2px solid #111" : "1px solid #ddd",
                        background: selected ? "#111" : "#fff",
                        color: selected ? "#fff" : "#111",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "15px",
                      }}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label>
            <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>お名前 *</div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="例：山田 太郎"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #ccc", borderRadius: "6px" }}
            />
          </label>

          <label>
            <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>電話番号 *</div>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="例：090-1234-5678"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #ccc", borderRadius: "6px" }}
            />
          </label>

          <label>
            <div style={{ marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>ご要望・備考</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="ご希望の時間帯やご要望があればご記入ください"
              style={{ width: "100%", boxSizing: "border-box", padding: "12px", border: "1px solid #ccc", borderRadius: "6px", resize: "vertical" }}
            />
          </label>

          <button
            type="button"
            onClick={submitReservation}
            disabled={submitting || !startTime || availableSlots.length === 0}
            style={{
              marginTop: "10px",
              padding: "16px",
              background: submitting || !startTime || availableSlots.length === 0 ? "#999" : "#111",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: submitting || !startTime || availableSlots.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "送信中..." : "予約を申し込む"}
          </button>
        </div>
      </section>
    </main>
  );
}