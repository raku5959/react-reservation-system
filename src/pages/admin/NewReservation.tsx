import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

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

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
};

export default function NewReservation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const customerIdFromUrl =
    searchParams.get("customer_id");

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    phone: "",
    reservation_date: "",
    start_time: "",
    therapist_id: "",
    course_id: "",
    note: "",
  });

  useEffect(() => {
    loadMasterData();
  }, []);

  async function loadMasterData() {
    setLoading(true);
    setError("");

    try {
      const [therapistRes, courseRes, customerRes] =
        await Promise.all([
          supabase
            .from("therapists")
            .select("id, name")
            .order("id", { ascending: true }),

          supabase
            .from("price_courses")
            .select("id, name, minutes, price")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),

          supabase
            .from("customers")
            .select("id, name, phone, email, note")
            .order("id", { ascending: true }),
        ]);

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

      if (customerRes.error) {
        throw new Error(
          `顧客取得エラー: ${customerRes.error.message}`
        );
      }

      const therapistData = therapistRes.data ?? [];
      const courseData = courseRes.data ?? [];
      const customerData = customerRes.data ?? [];

      setTherapists(therapistData);
      setCourses(courseData);
      setCustomers(customerData);

      // URLから顧客IDが渡されている場合
      if (customerIdFromUrl) {
        const customer = customerData.find(
          (item) =>
            String(item.id) === customerIdFromUrl
        );

        if (customer) {
          setForm((prev) => ({
            ...prev,
            customer_id: String(customer.id),
            customer_name: customer.name || "",
            phone: customer.phone || "",
          }));
        }
      }
    } catch (err) {
      console.error("MASTER DATA ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "データの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedCourse = courses.find(
    (course) => String(course.id) === form.course_id
  );

  const selectedCustomer = customers.find(
    (customer) => String(customer.id) === form.customer_id
  );

  function handleCustomerChange(customerId: string) {
    const customer = customers.find(
      (item) => String(item.id) === customerId
    );

    if (!customer) {
      setForm((prev) => ({
        ...prev,
        customer_id: "",
        customer_name: "",
        phone: "",
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer.name || "",
      phone: customer.phone || "",
    }));
  }

  function calculateEndTime(
    startTime: string,
    duration: number
  ): string {
    const [hours, minutes] = startTime.split(":").map(Number);

    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;

    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;

    return `${String(endHours).padStart(2, "0")}:${String(
      endMins
    ).padStart(2, "0")}:00`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.customer_id) {
      setError("お客様を選択してください。");
      return;
    }

    if (!selectedCustomer) {
      setError("選択された顧客情報が見つかりません。");
      return;
    }

    if (!form.customer_name.trim()) {
      setError("お客様名を入力してください。");
      return;
    }

    if (!form.phone.trim()) {
      setError("電話番号を入力してください。");
      return;
    }

    if (!form.reservation_date) {
      setError("予約日を選択してください。");
      return;
    }

    if (!form.start_time) {
      setError("開始時間を選択してください。");
      return;
    }

    if (!form.therapist_id) {
      setError("セラピストを選択してください。");
      return;
    }

    if (!form.course_id) {
      setError("コースを選択してください。");
      return;
    }

    if (!selectedCourse) {
      setError("選択されたコースが見つかりません。");
      return;
    }

    const duration = Number(selectedCourse.minutes || 0);

    if (duration <= 0) {
      setError(
        "選択されたコースの所要時間が設定されていません。"
      );
      return;
    }

    setSaving(true);

    try {
      const newStartMinutes =
        Number(form.start_time.slice(0, 2)) * 60 +
        Number(form.start_time.slice(3, 5));

      const newEndMinutes = newStartMinutes + duration;

      const endTime = calculateEndTime(
        form.start_time,
        duration
      );

      // 重複チェック
      const {
        data: existingReservations,
        error: duplicateError,
      } = await supabase
        .from("reservations")
        .select(
          "id, customer_name, start_time, end_time, course_id, status"
        )
        .eq("therapist_id", Number(form.therapist_id))
        .eq("reservation_date", form.reservation_date)
        .neq("status", "cancelled");

      if (duplicateError) {
        throw new Error(
          `重複予約の確認に失敗しました: ${duplicateError.message}`
        );
      }

      for (const reservation of existingReservations || []) {
        if (!reservation.start_time) {
          continue;
        }

        let existingEndMinutes: number;

        if (reservation.end_time) {
          const [endHour, endMinute] = reservation.end_time
            .slice(0, 5)
            .split(":")
            .map(Number);

          existingEndMinutes =
            endHour * 60 + endMinute;
        } else {
          if (!reservation.course_id) {
            continue;
          }

          const existingCourse = courses.find(
            (course) =>
              course.id === Number(reservation.course_id)
          );

          if (!existingCourse) {
            continue;
          }

          const existingDuration = Number(
            existingCourse.minutes || 0
          );

          if (existingDuration <= 0) {
            continue;
          }

          const existingStartMinutes =
            Number(
              reservation.start_time.slice(0, 2)
            ) *
              60 +
            Number(
              reservation.start_time.slice(3, 5)
            );

          existingEndMinutes =
            existingStartMinutes + existingDuration;
        }

        const existingStartMinutes =
          Number(
            reservation.start_time.slice(0, 2)
          ) *
            60 +
          Number(
            reservation.start_time.slice(3, 5)
          );

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

      // 新規保存処理
      const insertData = {
        customer_id: Number(form.customer_id),
        customer_name: form.customer_name.trim(),
        customer_phone: form.phone.trim(),
        phone: form.phone.trim(),
        reservation_date: form.reservation_date,
        reservation_time: form.start_time,
        start_time: form.start_time,
        end_time: endTime,
        therapist_id: Number(form.therapist_id),
        course: selectedCourse.name,
        course_id: selectedCourse.id,
        note: form.note.trim(),
        status: "confirmed",
      };

      const { error: insertError } = await supabase
        .from("reservations")
        .insert(insertData);

      if (insertError) {
        throw new Error(
          `予約の登録に失敗しました: ${insertError.message}`
        );
      }

      setSuccess("予約を登録しました。");

      setTimeout(() => {
        navigate("/admin/reservations");
      }, 1200);
    } catch (err) {
      console.error("NEW RESERVATION ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "予約の登録に失敗しました"
      );
    } finally {
      setSaving(false);
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
        セラピスト・コース・顧客情報を読み込み中...
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
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
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
              NEW RESERVATION
            </p>
            <h1 style={{ margin: "6px 0 0", fontSize: "28px" }}>
              新規予約登録
            </h1>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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

        {success && (
          <div
            style={{
              padding: "15px",
              marginBottom: "20px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              borderRadius: "8px",
            }}
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "12px",
            padding: "30px",
            display: "grid",
            gap: "20px",
          }}
        >
          {/* 顧客選択 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "7px",
              }}
            >
              お客様
            </label>

            <select
              value={form.customer_id}
              onChange={(e) => handleCustomerChange(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: "#fff",
              }}
            >
              <option value="">お客様を選択してください</option>
              {customers.map((customer) => (
                <option key={customer.id} value={String(customer.id)}>
                  {customer.name}
                  {customer.phone ? `（${customer.phone}）` : ""}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "12px 15px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#555",
                }}
              >
                顧客ID：{selectedCustomer.id}
              </div>
            )}
          </div>

          {/* お客様名 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "7px",
              }}
            >
              お客様名
            </label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
              placeholder="例：山田太郎"
              style={{
                width: "100%",
                padding: "12px",
                boxSizing: "border-box",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* 電話番号 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "7px",
              }}
            >
              電話番号
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="例：090-1234-5678"
              style={{
                width: "100%",
                padding: "12px",
                boxSizing: "border-box",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          </div>

          {/* 予約日・開始時間 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "bold",
                  marginBottom: "7px",
                }}
              >
                予約日
              </label>
              <input
                type="date"
                value={form.reservation_date}
                onChange={(e) =>
                  setForm({ ...form, reservation_date: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "bold",
                  marginBottom: "7px",
                }}
              >
                開始時間
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm({ ...form, start_time: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
          </div>

          {/* セラピスト */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "7px",
              }}
            >
              セラピスト
            </label>
            <select
              value={form.therapist_id}
              onChange={(e) =>
                setForm({ ...form, therapist_id: e.target.value })
              }
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                background: "#fff",
              }}
            >
              <option value="">セラピストを選択してください</option>
              {therapists.map((therapist) => (
                <option key={therapist.id} value={String(therapist.id)}>
                  {therapist.name}
                </option>
              ))}
            </select>
          </div>

          {/* コース */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "7px",
              }}
            >
              コース
            </label>
            <select
              value={form.course_id}
              onChange={(e) =>
                setForm({ ...form, course_id: e.target.value })
              }
              style={{
                width: "100%",
                padding: "12px",
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

            {selectedCourse && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "15px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "#666", fontSize: "13px" }}>
                    所要時間
                  </span>
                  <strong>{selectedCourse.minutes}分</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#666", fontSize: "13px" }}>
                    料金
                  </span>
                  <strong>
                    {selectedCourse.price != null
                      ? selectedCourse.price.toLocaleString()
                      : "-"}
                    円
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* 備考 */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "7px",
              }}
            >
              備考・ご要望
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={5}
              placeholder="ご要望などがあれば入力してください"
              style={{
                width: "100%",
                padding: "12px",
                boxSizing: "border-box",
                border: "1px solid #ccc",
                borderRadius: "6px",
                resize: "vertical",
              }}
            />
          </div>

          {/* 登録ボタン */}
          <div
            style={{
              marginTop: "10px",
              paddingTop: "20px",
              borderTop: "1px solid #eee",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                padding: "15px",
                background: saving ? "#9ca3af" : "#111",
                color: "#fff",
                border: "none",
                borderRadius: "7px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              {saving ? "登録中..." : "予約を登録する"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}