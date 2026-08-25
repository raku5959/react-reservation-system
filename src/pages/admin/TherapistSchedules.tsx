import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Therapist = {
  id: number;
  name: string;
};

type TherapistSchedule = {
  id: number;
  therapist_id: number;
  work_date: string;
  start_time: string;
  end_time: string;
  is_working: boolean;
  created_at?: string;
};

function getTodayString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(time: string) {
  return time ? time.slice(0, 5) : "";
}

export default function TherapistSchedules() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);

  const [selectedTherapist, setSelectedTherapist] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [therapistRes, scheduleRes] = await Promise.all([
        supabase
          .from("therapists")
          .select("id, name")
          .order("id", { ascending: true }),

        supabase
          .from("therapist_schedules")
          .select(
            "id, therapist_id, work_date, start_time, end_time, is_working, created_at"
          )
          .order("work_date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

      if (therapistRes.error) {
        throw new Error(
          `セラピスト取得エラー: ${therapistRes.error.message}`
        );
      }

      if (scheduleRes.error) {
        throw new Error(
          `出勤予定取得エラー: ${scheduleRes.error.message}`
        );
      }

      setTherapists(therapistRes.data ?? []);
      setSchedules(scheduleRes.data ?? []);
    } catch (err) {
      console.error("LOAD SCHEDULE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  function getTherapistName(id: number) {
    return (
      therapists.find((therapist) => therapist.id === id)?.name ||
      `ID:${id}`
    );
  }

  function resetForm() {
    setSelectedTherapist("");
    setSelectedDate(getTodayString());
    setStartTime("10:00");
    setEndTime("18:00");
    setEditingId(null);
  }

  function startEdit(schedule: TherapistSchedule) {
    setEditingId(schedule.id);
    setSelectedTherapist(String(schedule.therapist_id));
    setSelectedDate(schedule.work_date);
    setStartTime(formatTime(schedule.start_time));
    setEndTime(formatTime(schedule.end_time));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSchedule() {
    setError("");

    if (!selectedTherapist) {
      setError("セラピストを選択してください");
      return;
    }

    if (!selectedDate) {
      setError("出勤日を選択してください");
      return;
    }

    if (!startTime || !endTime) {
      setError("出勤時間と退勤時間を入力してください");
      return;
    }

    if (startTime >= endTime) {
      setError("退勤時間は出勤時間より後にしてください");
      return;
    }

    const therapistId = Number(selectedTherapist);

    // 同じセラピスト・同じ日付の時間重複チェック
    const duplicated = schedules.find((schedule) => {
      if (editingId !== null && schedule.id === editingId) {
        return false;
      }

      if (schedule.therapist_id !== therapistId) {
        return false;
      }

      if (schedule.work_date !== selectedDate) {
        return false;
      }

      if (!schedule.is_working) {
        return false;
      }

      const existingStart = schedule.start_time.slice(0, 5);
      const existingEnd = schedule.end_time.slice(0, 5);

      return (
        startTime < existingEnd &&
        endTime > existingStart
      );
    });

    if (duplicated) {
      setError(
        `出勤時間が重複しています。既存予定「${formatTime(
          duplicated.start_time
        )}〜${formatTime(duplicated.end_time)}」と重なっています。`
      );
      return;
    }

    setSaving(true);

    try {
      const data = {
        therapist_id: therapistId,
        work_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        is_working: true,
      };

      if (editingId !== null) {
        const { error: updateError } = await supabase
          .from("therapist_schedules")
          .update(data)
          .eq("id", editingId);

        if (updateError) {
          throw new Error(
            `出勤予定更新エラー: ${updateError.message}`
          );
        }
      } else {
        const { error: insertError } = await supabase
          .from("therapist_schedules")
          .insert(data);

        if (insertError) {
          throw new Error(
            `出勤予定登録エラー: ${insertError.message}`
          );
        }
      }

      await loadData();
      resetForm();
    } catch (err) {
      console.error("SAVE SCHEDULE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "出勤予定の保存に失敗しました"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSchedule(id: number) {
    if (!window.confirm("この出勤予定を削除しますか？")) {
      return;
    }

    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("therapist_schedules")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(
          `出勤予定削除エラー: ${deleteError.message}`
        );
      }

      await loadData();

      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("DELETE SCHEDULE ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "出勤予定の削除に失敗しました"
      );
    }
  }

  if (loading) {
    return (
      <main
        style={{
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        出勤予定を読み込み中...
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
              THERAPIST SCHEDULE
            </p>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "28px",
              }}
            >
              出勤予定管理
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
              ? "出勤予定を編集"
              : "出勤予定を登録"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
            }}
          >
            <label>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                セラピスト
              </div>

              <select
                value={selectedTherapist}
                onChange={(e) =>
                  setSelectedTherapist(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "11px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#fff",
                  boxSizing: "border-box",
                }}
              >
                <option value="">
                  セラピストを選択
                </option>

                {therapists.map((therapist) => (
                  <option
                    key={therapist.id}
                    value={String(therapist.id)}
                  >
                    {therapist.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                出勤日
              </div>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                出勤時間
              </div>

              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setStartTime(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px",
                }}
              >
                退勤時間
              </div>

              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setEndTime(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={saveSchedule}
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
                : "出勤予定を登録"}
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
                REGISTERED SCHEDULES
              </p>

              <h2
                style={{
                  margin: "5px 0 0",
                  fontSize: "22px",
                }}
              >
                登録済み出勤予定
              </h2>
            </div>

            <strong>{schedules.length}件</strong>
          </div>

          {schedules.length === 0 ? (
            <div
              style={{
                padding: "50px 20px",
                textAlign: "center",
                color: "#777",
                border: "1px dashed #ccc",
                borderRadius: "8px",
              }}
            >
              出勤予定はまだ登録されていません。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              {schedules.map((schedule) => (
                <article
                  key={schedule.id}
                  style={{
                    padding: "18px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
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
                      <strong
                        style={{
                          fontSize: "18px",
                        }}
                      >
                        {getTherapistName(
                          schedule.therapist_id
                        )}
                      </strong>

                      <div
                        style={{
                          marginTop: "7px",
                          color: "#555",
                        }}
                      >
                        {schedule.work_date}
                        {"　"}
                        {formatTime(schedule.start_time)}
                        {"〜"}
                        {formatTime(schedule.end_time)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          startEdit(schedule)
                        }
                        style={{
                          padding: "9px 14px",
                          background: "#111",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        編集
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSchedule(schedule.id)
                        }
                        style={{
                          padding: "9px 14px",
                          background: "#dc2626",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}