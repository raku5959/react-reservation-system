import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Therapist = {
  id: number;
  name: string;
  age: number | null;
  height: number | null;
  bust: string | null;
  waist: string | null;
  hip: string | null;
  image_url: string | null;
  description: string | null;
  is_new: boolean;
  is_recommended: boolean;
  is_popular: boolean;
  is_active: boolean;
};

type Reservation = {
  id: number;
  customer_name: string | null;
  phone: string | null;
  reservation_date?: string | null;
  reservation_time: string | null;
  therapist_id: number | null;
  course_id: number | null;
  store_id: number | null;
  note: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  course: string | null;
  message: string | null;
  start_time: string | null;
  customer_phone: string | null;
};

type TherapistSchedule = {
  id: number;
  therapist_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
};

export default function Therapists() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ========================================
  // 初期表示
  // ========================================

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);
      setError("");

      try {
        await Promise.all([
          loadTherapists(),
          loadSchedules(),
          loadReservations(),
        ]);
      } catch (err) {
        console.error("DATA LOAD EXCEPTION:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, []);

  // ========================================
  // Supabaseからデータ取得
  // ========================================

  async function loadTherapists() {
    const { data, error } = await supabase
      .from("therapists")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("THERAPISTS SELECT ERROR:", error);
      throw new Error(`セラピスト取得エラー: ${error.message}`);
    }

    setTherapists(data ?? []);
  }

  async function loadReservations() {
    setReservationLoading(true);

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("RESERVATIONS SELECT ERROR:", error);
      setMessage(`予約一覧取得エラー: ${error.message}`);
      setReservationLoading(false);
      return;
    }

    setReservations(data ?? []);
    setReservationLoading(false);
  }

  async function updateReservationStatus(id: number, status: string) {
    setReservationLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("reservations")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("RESERVATION UPDATE ERROR:", error);
      setMessage(`予約更新エラー: ${error.message}`);
      setReservationLoading(false);
      return;
    }

    setMessage("予約ステータスを更新しました");
    await loadReservations();
    setReservationLoading(false);
  }

  async function loadSchedules() {
    // 本日以降の出勤スケジュールを取得
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("therapist_schedules")
      .select("*")
      .gte("work_date", today)
      .eq("is_working", true)
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("SCHEDULE SELECT ERROR:", error);
      throw new Error(`スケジュール取得エラー: ${error.message}`);
    }

    setSchedules(data ?? []);
  }

  // 時間表記整形 (18:00:00 -> 18:00)
  const formatTime = (timeStr: string) => timeStr?.slice(0, 5) ?? "";

  // 日付表記整形 (2026-08-10 -> 8/10(月))
  const formatDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(date);
  };

  // ========================================
  // 読み込み中
  // ========================================

  if (loading) {
    return (
      <main style={{ minHeight: "60vh", padding: "80px 20px", textAlign: "center", color: "#666" }}>
        <p style={{ letterSpacing: "3px", fontSize: "12px", color: "#777" }}>THERAPISTS</p>
        <h1>セラピスト一覧</h1>
        <p>読み込み中...</p>
      </main>
    );
  }

  // ========================================
  // エラー表示
  // ========================================

  if (error) {
    return (
      <main style={{ minHeight: "60vh", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ letterSpacing: "3px", fontSize: "12px", color: "#777" }}>THERAPISTS</p>
        <h1>セラピスト一覧</h1>
        <p style={{ color: "#ef4444", marginTop: "30px" }}>データの取得に失敗しました。</p>
        <p style={{ color: "#777", fontSize: "14px" }}>{error}</p>
      </main>
    );
  }

  // ========================================
  // 一覧表示
  // ========================================

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 20px", background: "#fff" }}>
      {/* ヘッダー */}
      <header style={{ textAlign: "center", marginBottom: "50px" }}>
        <p style={{ letterSpacing: "4px", fontSize: "12px", color: "#777", marginBottom: "10px" }}>
          THERAPISTS
        </p>
        <h1 style={{ margin: 0, fontSize: "32px", fontWeight: 500 }}>
          セラピスト一覧
        </h1>

        {/* 予約管理セクション */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            padding: "30px",
            borderRadius: "10px",
            marginTop: "30px",
            textAlign: "left",
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
            <h2 style={{ margin: 0 }}>予約管理</h2>
            <strong>{reservations.length}件</strong>
          </div>

          {message && (
            <div
              style={{
                padding: "10px 15px",
                marginBottom: "20px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                borderRadius: "6px",
                fontSize: "14px",
              }}
            >
              {message}
            </div>
          )}

          {reservationLoading ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#777",
              }}
            >
              予約情報を読み込み中...
            </div>
          ) : reservations.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "#777",
                border: "1px dashed #ccc",
              }}
            >
              予約はありません。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "15px",
              }}
            >
              {reservations.map((reservation) => {
                const therapist = therapists.find(
                  (item) => item.id === reservation.therapist_id
                );

                const phone =
                  reservation.customer_phone ||
                  reservation.phone ||
                  "-";

                const course =
                  reservation.course ||
                  (reservation.course_id
                    ? `コースID: ${reservation.course_id}`
                    : "-");

                const time =
                  reservation.start_time ||
                  reservation.reservation_time ||
                  "-";

                const note =
                  reservation.message ||
                  reservation.note ||
                  "";

                return (
                  <div
                    key={reservation.id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      padding: "20px",
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
                        <h3 style={{ marginTop: 0 }}>
                          {therapist?.name ||
                            `セラピストID: ${reservation.therapist_id ?? "-"}`}
                        </h3>

                        <p style={{ margin: "4px 0" }}>
                          <strong>お客様：</strong>
                          {reservation.customer_name || "-"}
                        </p>

                        <p style={{ margin: "4px 0" }}>
                          <strong>電話：</strong>
                          {phone}
                        </p>

                        <p style={{ margin: "4px 0" }}>
                          <strong>予約日：</strong>
                          {reservation.reservation_date || "-"}
                        </p>

                        <p style={{ margin: "4px 0" }}>
                          <strong>開始時間：</strong>
                          {time}
                        </p>

                        <p style={{ margin: "4px 0" }}>
                          <strong>コース：</strong>
                          {course}
                        </p>

                        {note && (
                          <p style={{ margin: "4px 0" }}>
                            <strong>備考：</strong>
                            {note}
                          </p>
                        )}

                        <p style={{ margin: "4px 0" }}>
                          <strong>ステータス：</strong>{" "}
                          {reservation.status || "未設定"}
                        </p>
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
                            updateReservationStatus(reservation.id, "confirmed")
                          }
                          disabled={reservationLoading}
                          style={{
                            padding: "10px 15px",
                            background: "#16a34a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                        >
                          予約確定
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateReservationStatus(reservation.id, "cancelled")
                          }
                          disabled={reservationLoading}
                          style={{
                            padding: "10px 15px",
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                        >
                          キャンセル
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateReservationStatus(reservation.id, "pending")
                          }
                          disabled={reservationLoading}
                          style={{
                            padding: "10px 15px",
                            background: "#f3f4f6",
                            border: "1px solid #ccc",
                            borderRadius: "5px",
                            cursor: "pointer",
                          }}
                        >
                          受付中に戻す
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </header>

      {/* セラピスト0件 */}
      {therapists.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#777" }}>
          現在、公開中のセラピストはいません。
        </div>
      ) : (
        /* セラピストカード一覧 */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "30px",
          }}
        >
          {therapists.map((therapist) => {
            const therapistSchedules = schedules.filter(
              (s) => s.therapist_id === therapist.id
            );

            return (
              <article
                key={therapist.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  background: "#fff",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div>
                  {/* 写真 */}
                  <div
                    style={{
                      aspectRatio: "3 / 4",
                      background: "#f5f5f5",
                      overflow: "hidden",
                    }}
                  >
                    {therapist.image_url ? (
                      <img
                        src={therapist.image_url}
                        alt={therapist.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#999",
                        }}
                      >
                        NO IMAGE
                      </div>
                    )}
                  </div>

                  {/* 情報エリア */}
                  <div style={{ padding: "20px" }}>
                    {/* 名前 */}
                    <h2 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 600 }}>
                      {therapist.name}
                    </h2>

                    {/* 年齢・身長 */}
                    {(therapist.age !== null || therapist.height !== null) && (
                      <p style={{ margin: "0 0 6px", color: "#555", fontSize: "14px" }}>
                        {therapist.age !== null ? `${therapist.age}歳` : ""}
                        {therapist.age !== null && therapist.height !== null && " / "}
                        {therapist.height !== null ? `${therapist.height}cm` : ""}
                      </p>
                    )}

                    {/* B / W / H */}
                    {(therapist.bust || therapist.waist || therapist.hip) && (
                      <p style={{ margin: "0 0 12px", color: "#555", fontSize: "14px" }}>
                        {therapist.bust ? `B${therapist.bust}` : ""}
                        {therapist.waist ? ` W${therapist.waist}` : ""}
                        {therapist.hip ? ` H${therapist.hip}` : ""}
                      </p>
                    )}

                    {/* プロフィール */}
                    {therapist.description && (
                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          color: "#666",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {therapist.description}
                      </p>
                    )}

                    {/* バッジ */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "15px" }}>
                      {therapist.is_new && (
                        <span style={{ padding: "3px 8px", background: "#e0f2fe", color: "#0369a1", fontSize: "11px", borderRadius: "4px" }}>
                          NEW
                        </span>
                      )}
                      {therapist.is_recommended && (
                        <span style={{ padding: "3px 8px", background: "#fef3c7", color: "#b45309", fontSize: "11px", borderRadius: "4px" }}>
                          おすすめ
                        </span>
                      )}
                      {therapist.is_popular && (
                        <span style={{ padding: "3px 8px", background: "#fce7f3", color: "#be185d", fontSize: "11px", borderRadius: "4px" }}>
                          人気
                        </span>
                      )}
                    </div>

                    {/* 出勤スケジュール枠 */}
                    <div
                      style={{
                        padding: "12px",
                        background: "#f8f9fa",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ fontWeight: "bold", marginBottom: "6px", color: "#333" }}>
                        🗓 直近の出勤予定
                      </div>
                      {therapistSchedules.length > 0 ? (
                        <div style={{ display: "grid", gap: "4px" }}>
                          {therapistSchedules.slice(0, 2).map((sc) => (
                            <div key={sc.id} style={{ color: "#111", display: "flex", justifyContent: "space-between" }}>
                              <span>{formatDate(sc.work_date)}</span>
                              <span>{formatTime(sc.start_time)}〜{formatTime(sc.end_time)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "#999" }}>出勤予定なし</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 詳細ボタン */}
                <div style={{ padding: "0 20px 20px 20px" }}>
                  <Link
                    to={`/therapists/${therapist.id}`}
                    style={{
                      display: "block",
                      padding: "12px",
                      background: "#111",
                      color: "#fff",
                      textAlign: "center",
                      textDecoration: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}