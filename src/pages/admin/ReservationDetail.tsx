import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Reservation = {
  id: number;
  customer_name: string | null;
  phone: string | null;
  customer_phone: string | null;
  reservation_date: string | null;
  reservation_time: string | null;
  start_time: string | null;
  end_time: string | null;
  therapist_id: number | null;
  course_id: number | null;
  course: string | null;
  note: string | null;
  message: string | null;
  status: string | null;
  customer_id: number | null;
  store_id: number | null;
};

type Therapist = {
  id: number;
  name: string;
};

type Course = {
  id: number;
  name: string;
  minutes: string | null;
  price: number | null;
};

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [therapist, setTherapist] =
    useState<Therapist | null>(null);

  const [course, setCourse] =
    useState<Course | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("予約IDが指定されていません。");
      setLoading(false);
      return;
    }

    loadReservation(id);
  }, [id]);

  async function loadReservation(reservationId: string) {
    setLoading(true);
    setError("");

    try {
      const {
        data: reservationDataList,
        error: reservationError,
      } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", Number(reservationId))
        .limit(1);

      if (reservationError) {
        throw new Error(
          `予約取得エラー: ${reservationError.message}`
        );
      }

      if (
        !reservationDataList ||
        reservationDataList.length === 0
      ) {
        throw new Error(
          `予約ID ${reservationId} の予約が見つかりません。`
        );
      }

      const reservationData =
        reservationDataList[0] as Reservation;

      setReservation(reservationData);

      if (reservationData.therapist_id) {
        const {
          data: therapistData,
          error: therapistError,
        } = await supabase
          .from("therapists")
          .select("id, name")
          .eq("id", reservationData.therapist_id)
          .single();

        if (therapistError) {
          console.warn(
            "セラピスト取得エラー:",
            therapistError.message
          );
        } else {
          setTherapist(therapistData);
        }
      }

      if (reservationData.course_id) {
        const {
          data: courseData,
          error: courseError,
        } = await supabase
          .from("price_courses")
          .select("id, name, minutes, price")
          .eq("id", reservationData.course_id)
          .single();

        if (courseError) {
          console.warn(
            "コース取得エラー:",
            courseError.message
          );
        } else {
          setCourse(courseData);
        }
      }
    } catch (err) {
      console.error(
        "RESERVATION DETAIL ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "予約情報の取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "-";

    const [year, month, day] = date
      .split("-")
      .map(Number);

    if (!year || !month || !day) {
      return date;
    }

    return `${year}年${month}月${day}日`;
  }

  function formatTime(time: string | null) {
    if (!time) return "-";

    return time.slice(0, 5);
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

  function getStatusStyle(status: string | null) {
    switch (status) {
      case "confirmed":
        return {
          background: "#ecfdf5",
          color: "#047857",
          border: "1px solid #a7f3d0",
        };

      case "pending":
        return {
          background: "#fffbeb",
          color: "#b45309",
          border: "1px solid #fde68a",
        };

      case "arrived":
        return {
          background: "#eff6ff",
          color: "#1d4ed8",
          border: "1px solid #bfdbfe",
        };

      case "completed":
        return {
          background: "#f3e8ff",
          color: "#7e22ce",
          border: "1px solid #d8b4fe",
        };

      case "cancelled":
        return {
          background: "#fff1f2",
          color: "#be123c",
          border: "1px solid #fecdd3",
        };

      default:
        return {
          background: "#f9fafb",
          color: "#374151",
          border: "1px solid #e5e7eb",
        };
    }
  }

  async function handleStatusChange(
    newStatus: string
  ) {
    if (!reservation) return;

    if (reservation.status === newStatus) {
      return;
    }

    const statusLabel =
      getStatusLabel(newStatus);

    const confirmed = window.confirm(
      `予約ステータスを「${statusLabel}」に変更しますか？`
    );

    if (!confirmed) {
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const { error: updateError } =
        await supabase
          .from("reservations")
          .update({
            status: newStatus,
          })
          .eq("id", reservation.id);

      if (updateError) {
        throw new Error(
          `ステータス変更に失敗しました: ${updateError.message}`
        );
      }

      setReservation({
        ...reservation,
        status: newStatus,
      });

      alert(
        `ステータスを「${statusLabel}」に変更しました。`
      );
    } catch (err) {
      console.error(
        "STATUS UPDATE ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "ステータス変更に失敗しました"
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel() {
    await handleStatusChange("cancelled");
  }

  if (loading) {
    return (
      <main
        style={{
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        予約情報を読み込み中...
      </main>
    );
  }

  if (error && !reservation) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f5f5",
          padding: "50px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              padding: "20px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>

          <Link
            to="/admin/reservations"
            style={{
              color: "#111",
            }}
          >
            ← 予約カレンダーへ戻る
          </Link>
        </div>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main
        style={{
          padding: "80px 20px",
          textAlign: "center",
        }}
      >
        予約が見つかりませんでした。
      </main>
    );
  }

  const statusStyle = getStatusStyle(
    reservation.status
  );

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
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
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
              RESERVATION DETAIL
            </p>

            <h1
              style={{
                margin: "6px 0 0",
                fontSize: "28px",
              }}
            >
              予約詳細
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
              予約カレンダー
            </Link>

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
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "25px 30px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#777",
                  marginBottom: "5px",
                }}
              >
                予約ID
              </div>

              <strong
                style={{
                  fontSize: "20px",
                }}
              >
                #{reservation.id}
              </strong>
            </div>

            <span
              style={{
                ...statusStyle,
                padding: "8px 14px",
                borderRadius: "999px",
                fontSize: "13px",
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
              padding: "30px",
              display: "grid",
              gap: "24px",
            }}
          >
            <InfoRow
              label="お客様"
              value={
                reservation.customer_name || "-"
              }
            />

            <InfoRow
              label="電話番号"
              value={
                reservation.customer_phone ||
                reservation.phone ||
                "-"
              }
            />

            <InfoRow
              label="予約日"
              value={formatDate(
                reservation.reservation_date
              )}
            />

            <InfoRow
              label="時間"
              value={`${formatTime(
                reservation.start_time ||
                  reservation.reservation_time
              )} ～ ${formatTime(
                reservation.end_time
              )}`}
            />

            <InfoRow
              label="セラピスト"
              value={
                therapist?.name ||
                (reservation.therapist_id
                  ? `ID: ${reservation.therapist_id}`
                  : "-")
              }
            />

            <InfoRow
              label="コース"
              value={
                course?.name ||
                reservation.course ||
                "-"
              }
            />

            {course && (
              <>
                <InfoRow
                  label="所要時間"
                  value={
                    course.minutes
                      ? `${course.minutes}分`
                      : "-"
                  }
                />

                <InfoRow
                  label="料金"
                  value={
                    course.price != null
                      ? `${course.price.toLocaleString()}円`
                      : "-"
                  }
                />
              </>
            )}

            <InfoRow
              label="顧客ID"
              value={
                reservation.customer_id
                  ? String(
                      reservation.customer_id
                    )
                  : "-"
              }
            />

            <InfoRow
              label="備考"
              value={
                reservation.note ||
                reservation.message ||
                "-"
              }
            />
          </div>

          {/* ステータス変更 */}

          <div
            style={{
              padding: "25px 30px",
              borderTop: "1px solid #eee",
              background: "#fafafa",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "15px",
              }}
            >
              予約ステータス
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              <StatusButton
                label="仮予約"
                status="pending"
                currentStatus={
                  reservation.status
                }
                disabled={updating}
                onClick={handleStatusChange}
              />

              <StatusButton
                label="確定"
                status="confirmed"
                currentStatus={
                  reservation.status
                }
                disabled={updating}
                onClick={handleStatusChange}
              />

              <StatusButton
                label="来店済み"
                status="arrived"
                currentStatus={
                  reservation.status
                }
                disabled={updating}
                onClick={handleStatusChange}
              />

              <StatusButton
                label="完了"
                status="completed"
                currentStatus={
                  reservation.status
                }
                disabled={updating}
                onClick={handleStatusChange}
              />

              <StatusButton
                label="キャンセル"
                status="cancelled"
                currentStatus={
                  reservation.status
                }
                disabled={updating}
                onClick={handleStatusChange}
              />
            </div>

            {updating && (
              <div
                style={{
                  marginTop: "12px",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "#777",
                }}
              >
                ステータスを更新しています...
              </div>
            )}
          </div>

          {/* 操作 */}

          <div
            style={{
              padding: "20px 30px 30px",
              borderTop: "1px solid #eee",
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/admin/reservations/${reservation.id}/edit`
                )
              }
              disabled={updating}
              style={{
                padding: "14px",
                background: updating
                  ? "#9ca3af"
                  : "#111",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: updating
                  ? "not-allowed"
                  : "pointer",
                fontSize: "15px",
                fontWeight: "bold",
              }}
            >
              編集する
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={
                updating ||
                reservation.status ===
                  "cancelled"
              }
              style={{
                padding: "14px",
                background:
                  reservation.status ===
                    "cancelled" ||
                  updating
                    ? "#d1d5db"
                    : "#fff",
                color:
                  reservation.status ===
                    "cancelled" ||
                  updating
                    ? "#6b7280"
                    : "#be123c",
                border:
                  reservation.status ===
                    "cancelled" ||
                  updating
                    ? "1px solid #d1d5db"
                    : "1px solid #fecdd3",
                borderRadius: "7px",
                cursor:
                  reservation.status ===
                    "cancelled" ||
                  updating
                    ? "not-allowed"
                    : "pointer",
                fontSize: "15px",
                fontWeight: "bold",
              }}
            >
              {reservation.status ===
              "cancelled"
                ? "キャンセル済み"
                : "予約をキャンセル"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusButton({
  label,
  status,
  currentStatus,
  disabled,
  onClick,
}: {
  label: string;
  status: string;
  currentStatus: string | null;
  disabled: boolean;
  onClick: (status: string) => void;
}) {
  const active =
    currentStatus === status;

  return (
    <button
      type="button"
      onClick={() => onClick(status)}
      disabled={disabled || active}
      style={{
        padding: "12px",
        borderRadius: "7px",
        border: active
          ? "2px solid #111"
          : "1px solid #ddd",
        background: active
          ? "#111"
          : "#fff",
        color: active
          ? "#fff"
          : "#333",
        cursor:
          disabled || active
            ? "not-allowed"
            : "pointer",
        fontWeight: active
          ? "bold"
          : "normal",
        opacity: disabled
          ? 0.6
          : 1,
      }}
    >
      {active ? `✓ ${label}` : label}
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "140px 1fr",
        gap: "20px",
        paddingBottom: "18px",
        borderBottom:
          "1px solid #f0f0f0",
      }}
    >
      <div
        style={{
          color: "#777",
          fontSize: "13px",
          fontWeight: "bold",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "15px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}