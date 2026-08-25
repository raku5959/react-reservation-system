import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Therapist = {
  id: number;
  name: string;
  is_active: boolean | null;
};

type TherapistSchedule = {
  id: number;
  therapist_id: number;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  is_working: boolean | null;
  created_at: string | null;
};

export default function TherapistScheduleManagement() {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [schedules, setSchedules] = useState<TherapistSchedule[]>([]);

  const [selectedDate, setSelectedDate] =
    useState(getTodayString());

  const [therapistId, setTherapistId] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("20:00");
  const [isWorking, setIsWorking] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const therapistMap = useMemo(() => {
    const map = new Map<number, string>();

    therapists.forEach((therapist) => {
      map.set(therapist.id, therapist.name);
    });

    return map;
  }, [therapists]);

  useEffect(() => {
    loadTherapists();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [selectedDate]);

  async function loadTherapists() {
    const { data, error } = await supabase
      .from("therapists")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("id", {
        ascending: true,
      });

    if (error) {
      console.error("セラピスト取得エラー:", error);

      setErrorMessage(
        `セラピスト取得エラー: ${error.message}`
      );

      return;
    }

    setTherapists(data || []);

    if (data && data.length > 0) {
      setTherapistId((current) =>
        current || String(data[0].id)
      );
    }
  }

  async function loadSchedules() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("therapist_schedules")
      .select(
        `
          id,
          therapist_id,
          work_date,
          start_time,
          end_time,
          is_working,
          created_at
        `
      )
      .eq("work_date", selectedDate)
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      console.error("出勤予定取得エラー:", error);

      setErrorMessage(
        `出勤予定取得エラー: ${error.message}`
      );

      setSchedules([]);
    } else {
      setSchedules(data || []);
    }

    setLoading(false);
  }

  async function handleSave() {
    setMessage("");
    setErrorMessage("");

    if (!therapistId) {
      setErrorMessage(
        "セラピストを選択してください。"
      );
      return;
    }

    if (!selectedDate) {
      setErrorMessage(
        "出勤日を選択してください。"
      );
      return;
    }

    if (isWorking && !startTime) {
      setErrorMessage(
        "出勤時間を入力してください。"
      );
      return;
    }

    if (isWorking && !endTime) {
      setErrorMessage(
        "退勤時間を入力してください。"
      );
      return;
    }

    if (
      isWorking &&
      startTime &&
      endTime &&
      startTime >= endTime
    ) {
      setErrorMessage(
        "退勤時間は出勤時間より後にしてください。"
      );
      return;
    }

    setSaving(true);

    /*
     * 同じセラピスト・同じ日の
     * 既存予定を確認
     */
    const {
      data: existingSchedule,
      error: existingError,
    } = await supabase
      .from("therapist_schedules")
      .select("id")
      .eq("therapist_id", Number(therapistId))
      .eq("work_date", selectedDate)
      .maybeSingle();

    if (existingError) {
      console.error(
        "既存予定確認エラー:",
        existingError
      );

      setErrorMessage(
        `既存予定確認エラー: ${existingError.message}`
      );

      setSaving(false);
      return;
    }

    const scheduleData = {
      therapist_id: Number(therapistId),
      work_date: selectedDate,
      start_time: isWorking
        ? startTime
        : null,
      end_time: isWorking
        ? endTime
        : null,
      is_working: isWorking,
    };

    let saveError = null;

    if (existingSchedule) {
      const { error } = await supabase
        .from("therapist_schedules")
        .update(scheduleData)
        .eq("id", existingSchedule.id);

      saveError = error;
    } else {
      const { error } = await supabase
        .from("therapist_schedules")
        .insert(scheduleData);

      saveError = error;
    }

    if (saveError) {
      console.error(
        "出勤予定保存エラー:",
        saveError
      );

      setErrorMessage(
        `出勤予定保存エラー: ${saveError.message}`
      );

      setSaving(false);
      return;
    }

    setMessage(
      existingSchedule
        ? "出勤予定を更新しました。"
        : "出勤予定を登録しました。"
    );

    await loadSchedules();

    setSaving(false);
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm(
      "この出勤予定を削除しますか？"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("therapist_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "出勤予定削除エラー:",
        error
      );

      setErrorMessage(
        `出勤予定削除エラー: ${error.message}`
      );

      return;
    }

    setMessage(
      "出勤予定を削除しました。"
    );

    await loadSchedules();
  }

  function moveDate(days: number) {
    const date = new Date(
      `${selectedDate}T00:00:00`
    );

    date.setDate(
      date.getDate() + days
    );

    setSelectedDate(
      formatDate(date)
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
        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              color: "#222",
            }}
          >
            出勤予定管理
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#666",
            }}
          >
            セラピストの出勤予定を管理します。
          </p>
        </div>

        {/* 日付 */}

        <div
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "12px",
            marginBottom: "20px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() =>
                moveDate(-1)
              }
              style={buttonSecondaryStyle}
            >
              ← 前日
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(event) =>
                setSelectedDate(
                  event.target.value
                )
              }
              style={inputStyle}
            />

            <button
              type="button"
              onClick={() =>
                moveDate(1)
              }
              style={buttonSecondaryStyle}
            >
              翌日 →
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(
                  getTodayString()
                )
              }
              style={buttonSecondaryStyle}
            >
              今日
            </button>
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

        {/* 登録フォーム */}

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
            出勤予定を登録
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "18px",
            }}
          >
            <div>
              <label style={labelStyle}>
                セラピスト
              </label>

              <select
                value={therapistId}
                onChange={(event) =>
                  setTherapistId(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  選択してください
                </option>

                {therapists.map(
                  (therapist) => (
                    <option
                      key={therapist.id}
                      value={therapist.id}
                    >
                      {therapist.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                出勤時間
              </label>

              <input
                type="time"
                value={startTime}
                onChange={(event) =>
                  setStartTime(
                    event.target.value
                  )
                }
                disabled={!isWorking}
                style={{
                  ...inputStyle,
                  opacity:
                    isWorking
                      ? 1
                      : 0.5,
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>
                退勤時間
              </label>

              <input
                type="time"
                value={endTime}
                onChange={(event) =>
                  setEndTime(
                    event.target.value
                  )
                }
                disabled={!isWorking}
                style={{
                  ...inputStyle,
                  opacity:
                    isWorking
                      ? 1
                      : 0.5,
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>
                出勤状態
              </label>

              <select
                value={
                  isWorking
                    ? "working"
                    : "off"
                }
                onChange={(event) =>
                  setIsWorking(
                    event.target.value ===
                      "working"
                  )
                }
                style={inputStyle}
              >
                <option value="working">
                  出勤
                </option>

                <option value="off">
                  休み
                </option>
              </select>
            </div>
          </div>

          <div
            style={{
              marginTop: "22px",
              textAlign: "right",
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                ...buttonPrimaryStyle,
                opacity:
                  saving ? 0.6 : 1,
              }}
            >
              {saving
                ? "保存中..."
                : "出勤予定を保存"}
            </button>
          </div>
        </section>

        {/* 一覧 */}

        <section
          style={{
            background: "#fff",
            padding: "24px",
            borderRadius: "12px",
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
            {selectedDate}
            {" の出勤予定"}
          </h2>

          {loading ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#777",
              }}
            >
              読み込み中...
            </div>
          ) : schedules.length ===
            0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#777",
              }}
            >
              この日の出勤予定はありません。
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
                  minWidth: "650px",
                }}
              >
                <thead>
                  <tr>
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
                      出勤時間
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      退勤時間
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      状態
                    </th>

                    <th
                      style={
                        tableHeaderStyle
                      }
                    >
                      操作
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map(
                    (schedule) => (
                      <tr
                        key={
                          schedule.id
                        }
                      >
                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {therapistMap.get(
                            schedule.therapist_id
                          ) ||
                            "不明"}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          {schedule.start_time
                            ? schedule.start_time.slice(
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
                          {schedule.end_time
                            ? schedule.end_time.slice(
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
                          {schedule.is_working ? (
                            <span
                              style={{
                                display:
                                  "inline-block",
                                padding:
                                  "5px 10px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#eef9f0",
                                color:
                                  "#247a32",
                              }}
                            >
                              出勤
                            </span>
                          ) : (
                            <span
                              style={{
                                display:
                                  "inline-block",
                                padding:
                                  "5px 10px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#f1f1f1",
                                color:
                                  "#666",
                              }}
                            >
                              休み
                            </span>
                          )}
                        </td>

                        <td
                          style={
                            tableCellStyle
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                schedule.id
                              )
                            }
                            style={
                              buttonDeleteStyle
                            }
                          >
                            削除
                          </button>
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

function getTodayString() {
  const now = new Date();

  return formatDate(now);
}

function formatDate(date: Date) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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