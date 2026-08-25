import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

type TherapistSchedule = {
  id: number;
  therapist_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
};

export default function TherapistDetail() {
  const { therapistId } = useParams<{ therapistId: string }>();
  const navigate = useNavigate();

  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (therapistId) {
      loadTherapist(Number(therapistId));
    }
  }, [therapistId]);

  async function loadTherapist(therapistId: number) {
    setLoading(true);
    setError("");

    try {
      const therapistResult = await supabase
        .from("therapists")
        .select("*")
        .eq("id", therapistId)
        .eq("is_active", true)
        .single();

      if (therapistResult.error) {
        console.error("THERAPIST ERROR:", therapistResult.error);
        setError(therapistResult.error.message);
        setLoading(false);
        return;
      }

      const scheduleResult = await supabase
        .from("therapist_schedules")
        .select("*")
        .eq("therapist_id", therapistId)
        .eq("is_working", true)
        .order("work_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (scheduleResult.error) {
        console.error("SCHEDULE ERROR:", scheduleResult.error);
        setError(scheduleResult.error.message);
        setLoading(false);
        return;
      }

      setTherapist(therapistResult.data);
      setSchedules(scheduleResult.data ?? []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  if (loading) {
    return (
      <main style={{ padding: "80px 20px", textAlign: "center", color: "#666" }}>
        セラピスト情報を読み込み中...
      </main>
    );
  }

  if (error || !therapist) {
    return (
      <main style={{ padding: "80px 20px", textAlign: "center" }}>
        <h1>セラピストが見つかりません</h1>
        <p style={{ color: "#999", marginTop: "10px" }}>{error}</p>
        <Link
          to="/therapists"
          style={{
            display: "inline-block",
            marginTop: "20px",
            padding: "12px 24px",
            background: "#111",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "6px",
          }}
        >
          セラピスト一覧へ戻る
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 20px 80px" }}>
      {/* 戻るリンク */}
      <Link
        to="/therapists"
        style={{ color: "#666", textDecoration: "none", fontSize: "14px" }}
      >
        ← セラピスト一覧へ戻る
      </Link>

      {/* メインプロフィール情報 */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "40px",
          marginTop: "30px",
        }}
      >
        {/* 写真 */}
        <div>
          <div
            style={{
              aspectRatio: "3 / 4",
              background: "#f5f5f5",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {therapist.image_url ? (
              <img
                src={therapist.image_url}
                alt={therapist.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
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
        </div>

        {/* プロフィール詳細 */}
        <div>
          <p style={{ letterSpacing: "3px", fontSize: "12px", color: "#888", margin: 0 }}>
            THERAPIST
          </p>

          <h1 style={{ fontSize: "32px", margin: "8px 0 20px" }}>
            {therapist.name}
          </h1>

          {/* 基本データ */}
          <div
            style={{
              padding: "18px 20px",
              background: "#f8f8f8",
              borderRadius: "8px",
              marginBottom: "20px",
              lineHeight: 1.6,
            }}
          >
            {(therapist.age !== null || therapist.height !== null) && (
              <p style={{ margin: "0 0 5px 0" }}>
                {therapist.age !== null && `${therapist.age}歳`}
                {therapist.age !== null && therapist.height !== null && " / "}
                {therapist.height !== null && `${therapist.height}cm`}
              </p>
            )}

            {(therapist.bust || therapist.waist || therapist.hip) && (
              <p style={{ margin: 0, color: "#555" }}>
                {therapist.bust && `B${therapist.bust} `}
                {therapist.waist && `W${therapist.waist} `}
                {therapist.hip && `H${therapist.hip}`}
              </p>
            )}
          </div>

          {/* バッジ表示 */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "25px" }}>
            {therapist.is_new && (
              <span style={{ padding: "4px 10px", background: "#e0f2fe", color: "#0369a1", fontSize: "12px", borderRadius: "4px" }}>
                NEW
              </span>
            )}
            {therapist.is_recommended && (
              <span style={{ padding: "4px 10px", background: "#fef3c7", color: "#b45309", fontSize: "12px", borderRadius: "4px" }}>
                おすすめ
              </span>
            )}
            {therapist.is_popular && (
              <span style={{ padding: "4px 10px", background: "#fce7f3", color: "#be185d", fontSize: "12px", borderRadius: "4px" }}>
                人気
              </span>
            )}
          </div>

          {/* 自己紹介文 */}
          {therapist.description && (
            <div>
              <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>プロフィール</h2>
              <p style={{ lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#333", margin: 0 }}>
                {therapist.description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 出勤スケジュール */}
      <section style={{ marginTop: "60px" }}>
        <p style={{ letterSpacing: "3px", fontSize: "12px", color: "#888", margin: 0 }}>
          SCHEDULE
        </p>

        <h2 style={{ fontSize: "22px", margin: "6px 0 20px" }}>
          出勤スケジュール
        </h2>

        {schedules.length === 0 ? (
          <div
            style={{
              padding: "30px",
              background: "#f8f8f8",
              color: "#777",
              textAlign: "center",
              borderRadius: "8px",
            }}
          >
            現在、出勤予定はありません。
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  background: "#fff",
                }}
              >
                <strong style={{ fontSize: "16px" }}>
                  {formatDate(schedule.work_date)}
                </strong>

                <span style={{ color: "#444", fontSize: "15px" }}>
                  {schedule.start_time?.slice(0, 5)} 〜 {schedule.end_time?.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 予約ボタン */}
      <div style={{ marginTop: "50px", textAlign: "center" }}>
        <button
          type="button"
          style={{
            width: "100%",
            maxWidth: "400px",
            padding: "18px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
          onClick={() => navigate(`/reservation/${therapist.id}`)}
        >
          このセラピストを予約する
        </button>
      </div>
    </main>
  );
}