import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

/* =====================================================
   型定義
===================================================== */

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

type Expense = {
  id: number;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
};

type RankingItem = {
  name: string;
  sales: number;
  count: number;
};

/* =====================================================
   管理メニュー
===================================================== */

const menuSections = [
  {
    title: "予約管理",
    description: "予約の確認・登録・編集を行います。",
    items: [
      {
        title: "予約カレンダー",
        description: "予約状況をカレンダーで確認",
        path: "/admin/reservations",
      },
      {
        title: "新規予約",
        description: "新しい予約を登録",
        path: "/admin/reservations/new",
      },
      {
        title: "セラピスト別予約",
        description: "セラピストごとの予約を確認",
        path: "/admin/reservations/therapists",
      },
    ],
  },

  {
    title: "顧客管理",
    description: "顧客情報を管理します。",
    items: [
      {
        title: "顧客一覧",
        description: "登録されている顧客を確認",
        path: "/admin/customers",
      },
    ],
  },

  {
    title: "セラピスト管理",
    description: "セラピストと出勤スケジュールを管理します。",
    items: [
      {
        title: "セラピスト管理",
        description: "セラピスト情報を登録・編集",
        path: "/admin/therapists",
      },
      {
        title: "出勤スケジュール",
        description: "セラピストの出勤予定を管理",
        path: "/admin/therapist-schedules",
      },
    ],
  },

  {
    title: "スタッフ管理",
    description: "店舗スタッフの情報を管理します。",
    items: [
      {
        title: "スタッフ管理",
        description: "スタッフの登録・編集・削除・在籍状況を管理",
        path: "/admin/staff",
      },
    ],
  },

  {
    title: "店舗・サイト管理",
    description: "店舗情報とサイト全体の設定を管理します。",
    items: [
      {
        title: "店舗管理",
        description: "店舗情報を管理",
        path: "/admin/stores",
      },
      {
        title: "サイト設定",
        description: "サイト名・ロゴ・電話番号などを管理",
        path: "/admin/site-settings",
      },
    ],
  },

  {
    title: "コンテンツ管理",
    description: "公開サイトに表示する情報を管理します。",
    items: [
      {
        title: "お知らせ管理",
        description: "お知らせの登録・編集・公開",
        path: "/admin/news",
      },
      {
        title: "求人・採用管理",
        description: "求人情報の登録・編集・公開",
        path: "/admin/recruitments",
      },
    ],
  },

  {
    title: "コース管理",
    description: "施術コース・料金・時間を管理します。",
    items: [
      {
        title: "コース管理",
        description: "コースの登録・編集・削除",
        path: "/admin/courses",
      },
    ],
  },

  {
    title: "売上管理",
    description: "売上情報を確認・分析します。",
    items: [
      {
        title: "売上管理",
        description: "売上・日別・セラピスト別・コース別分析",
        path: "/admin/sales",
      },
    ],
  },
];

/* =====================================================
   メイン
===================================================== */

export default function Admin() {
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /* -----------------------------------------------------
     今日の日付
  ----------------------------------------------------- */

  const today = useMemo(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  /* -----------------------------------------------------
     今月
  ----------------------------------------------------- */

  const currentMonth = useMemo(() => {
    return today.slice(0, 7);
  }, [today]);

  /* -----------------------------------------------------
     初回読み込み＆認証監視
  ----------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error("認証確認エラー:", error);

          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        if (!session) {
          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        setCheckingAuth(false);

        await loadDashboard();
      } catch (error) {
        console.error("認証初期化エラー:", error);

        if (mounted) {
          navigate("/admin/login", {
            replace: true,
          });
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        if (!session) {
          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        setCheckingAuth(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  /* =====================================================
     ログアウト処理
  ===================================================== */

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("ログアウトエラー:", error);
      alert("ログアウトに失敗しました。");
      return;
    }

    navigate("/admin/login", {
      replace: true,
    });
  }

  /* =====================================================
     データ取得
  ===================================================== */

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    const [
      reservationResult,
      therapistResult,
      courseResult,
      expenseResult,
    ] = await Promise.all([
      supabase
        .from("reservations")
        .select(
          `
          id,
          customer_name,
          reservation_date,
          reservation_time,
          therapist_id,
          course_id,
          status
        `
        )
        .order("reservation_date", {
          ascending: false,
        })
        .order("reservation_time", {
          ascending: true,
        }),

      supabase
        .from("therapists")
        .select("id, name")
        .eq("is_active", true)
        .order("id", {
          ascending: true,
        }),

      supabase
        .from("price_courses")
        .select("id, name, price")
        .order("id", {
          ascending: true,
        }),

      supabase
        .from("expenses")
        .select(
          "id, expense_date, category, amount, description"
        )
        .order("expense_date", {
          ascending: false,
        })
        .order("id", {
          ascending: false,
        }),
    ]);

    if (reservationResult.error) {
      console.error(
        "管理ダッシュボード予約取得エラー:",
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

    if (expenseResult.error) {
      console.error(
        "経費取得エラー:",
        expenseResult.error
      );
    }

    const fetchedReservations =
      reservationResult.data || [];

    setReservations(fetchedReservations);
    setTherapists(therapistResult.data || []);
    setCourses(courseResult.data || []);
    setExpenses(expenseResult.data || []);

    setLoading(false);
  }

  /* =====================================================
     補助関数
  ===================================================== */

  function getTherapistName(id: number | null) {
    if (!id) {
      return "-";
    }

    return (
      therapists.find(
        (therapist) => therapist.id === id
      )?.name || "-"
    );
  }

  function getCourse(id: number | null) {
    if (!id) {
      return null;
    }

    return (
      courses.find(
        (course) => course.id === id
      ) || null
    );
  }

  function getCourseName(id: number | null) {
    return getCourse(id)?.name || "-";
  }

  function getCoursePrice(id: number | null) {
    return getCourse(id)?.price || 0;
  }

  function formatMoney(value: number) {
    return `${value.toLocaleString("ja-JP")}円`;
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
          background: "#eff6ff",
          color: "#1d4ed8",
        };

      case "pending":
        return {
          background: "#fff7ed",
          color: "#c2410c",
        };

      case "arrived":
        return {
          background: "#ecfdf5",
          color: "#047857",
        };

      case "completed":
        return {
          background: "#f3e8ff",
          color: "#7e22ce",
        };

      case "cancelled":
        return {
          background: "#fef2f2",
          color: "#b91c1c",
        };

      default:
        return {
          background: "#f3f4f6",
          color: "#4b5563",
        };
    }
  }

  /* =====================================================
     今日の予約（すべての状態を含む）
  ===================================================== */

  const todayReservations = useMemo(() => {
    return reservations
      .filter((reservation) => {
        if (!reservation.reservation_date) {
          return false;
        }

        const reservationDate =
          reservation.reservation_date.slice(0, 10);

        return reservationDate === today;
      })
      .sort((a, b) => {
        return (
          (a.reservation_time || "").localeCompare(
            b.reservation_time || ""
          )
        );
      });
  }, [reservations, today]);

  /* =====================================================
     今日の完了予約
  ===================================================== */

  const todayCompletedReservations = useMemo(() => {
    return todayReservations.filter(
      (reservation) =>
        reservation.status === "completed"
    );
  }, [todayReservations]);

  /* =====================================================
     今日のキャンセル
  ===================================================== */

  const todayCancelledReservations = useMemo(() => {
    return todayReservations.filter(
      (reservation) =>
        reservation.status === "cancelled"
    );
  }, [todayReservations]);

  /* =====================================================
     今日の未完了予約
  ===================================================== */

  const todayPendingReservations = useMemo(() => {
    return todayReservations.filter(
      (reservation) =>
        reservation.status !== "completed" &&
        reservation.status !== "cancelled"
    );
  }, [todayReservations]);

  /* =====================================================
     今月の予約（すべての状態を含む）
  ===================================================== */

  const monthlyReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (!reservation.reservation_date) {
        return false;
      }

      const reservationDate =
        reservation.reservation_date.slice(0, 10);

      return reservationDate.startsWith(currentMonth);
    });
  }, [reservations, currentMonth]);

  /* =====================================================
     今月の完了予約
  ===================================================== */

  const monthlyCompletedReservations = useMemo(() => {
    return monthlyReservations.filter(
      (reservation) =>
        reservation.status === "completed"
    );
  }, [monthlyReservations]);

  /* =====================================================
     今月のキャンセル
  ===================================================== */

  const monthlyCancelledReservations = useMemo(() => {
    return monthlyReservations.filter(
      (reservation) =>
        reservation.status === "cancelled"
    );
  }, [monthlyReservations]);

  /* =====================================================
     今月の完了率
  ===================================================== */

  const monthlyCompletionRate = useMemo(() => {
    if (monthlyReservations.length === 0) {
      return 0;
    }

    return (
      (monthlyCompletedReservations.length /
        monthlyReservations.length) *
      100
    );
  }, [
    monthlyReservations,
    monthlyCompletedReservations,
  ]);

  /* =====================================================
     今日の売上
  ===================================================== */

  const todaySales = useMemo(() => {
    return todayCompletedReservations.reduce(
      (total, reservation) => {
        return (
          total +
          getCoursePrice(reservation.course_id)
        );
      },
      0
    );
  }, [
    todayCompletedReservations,
    courses,
  ]);

  /* =====================================================
     今月の売上
  ===================================================== */

  const monthlySales = useMemo(() => {
    return monthlyCompletedReservations.reduce(
      (total, reservation) => {
        return (
          total +
          getCoursePrice(reservation.course_id)
        );
      },
      0
    );
  }, [
    monthlyCompletedReservations,
    courses,
  ]);

  /* =====================================================
     今月の経費
  ===================================================== */

  const monthlyExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (!expense.expense_date) {
        return false;
      }

      return expense.expense_date
        .slice(0, 10)
        .startsWith(currentMonth);
    });
  }, [expenses, currentMonth]);

  /* =====================================================
     今月の経費合計
  ===================================================== */

  const monthlyExpenseTotal = useMemo(() => {
    return monthlyExpenses.reduce(
      (total, expense) => {
        return total + Number(expense.amount || 0);
      },
      0
    );
  }, [monthlyExpenses]);

  /* =====================================================
     今月の営業利益
  ===================================================== */

  const monthlyProfit = useMemo(() => {
    return monthlySales - monthlyExpenseTotal;
  }, [
    monthlySales,
    monthlyExpenseTotal,
  ]);

  /* =====================================================
     今月の利益率
  ===================================================== */

  const monthlyProfitMargin = useMemo(() => {
    if (monthlySales <= 0) {
      return 0;
    }

    return (
      (monthlyProfit / monthlySales) *
      100
    );
  }, [
    monthlySales,
    monthlyProfit,
  ]);

  /* =====================================================
     今月の平均客単価
  ===================================================== */

  const monthlyAverageCustomerSpend = useMemo(() => {
    if (monthlyCompletedReservations.length === 0) {
      return 0;
    }

    return (
      monthlySales /
      monthlyCompletedReservations.length
    );
  }, [
    monthlySales,
    monthlyCompletedReservations,
  ]);

  /* =====================================================
     セラピスト別売上
  ===================================================== */

  const therapistRanking = useMemo(() => {
    const map = new Map<
      number,
      RankingItem
    >();

    monthlyCompletedReservations.forEach(
      (reservation) => {
        if (!reservation.therapist_id) {
          return;
        }

        const therapistName =
          getTherapistName(
            reservation.therapist_id
          );

        const current =
          map.get(
            reservation.therapist_id
          ) || {
            name: therapistName,
            sales: 0,
            count: 0,
          };

        current.sales += getCoursePrice(
          reservation.course_id
        );

        current.count += 1;

        map.set(
          reservation.therapist_id,
          current
        );
      }
    );

    return Array.from(map.values())
      .sort(
        (a, b) => b.sales - a.sales
      )
      .slice(0, 5);
  }, [
    monthlyCompletedReservations,
    therapists,
    courses,
  ]);

  /* =====================================================
     コース別売上
  ===================================================== */

  const courseRanking = useMemo(() => {
    const map = new Map<
      number,
      RankingItem
    >();

    monthlyCompletedReservations.forEach(
      (reservation) => {
        if (!reservation.course_id) {
          return;
        }

        const course =
          getCourse(
            reservation.course_id
          );

        const current =
          map.get(
            reservation.course_id
          ) || {
            name:
              course?.name || "不明なコース",
            sales: 0,
            count: 0,
          };

        current.sales +=
          course?.price || 0;

        current.count += 1;

        map.set(
          reservation.course_id,
          current
        );
      }
    );

    return Array.from(map.values())
      .sort(
        (a, b) => b.sales - a.sales
      )
      .slice(0, 5);
  }, [
    monthlyCompletedReservations,
    courses,
  ]);

  /* =====================================================
     認証確認中
  ===================================================== */

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
          fontSize: "15px",
        }}
      >
        認証を確認しています...
      </main>
    );
  }

  /* =====================================================
     読み込み中
  ===================================================== */

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
          fontSize: "15px",
        }}
      >
        管理ダッシュボードを読み込んでいます...
      </main>
    );
  }

  /* =====================================================
     画面
  ===================================================== */

  return (
    <>
      <style>{mobileResponsiveStyle}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "#f5f6f8",
          padding: "30px 20px 70px",
          boxSizing: "border-box",
          color: "#111",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* =================================================
              ヘッダー
          ================================================= */}

          <header
            style={{
              background: "#111",
              color: "#fff",
              borderRadius: "14px",
              padding: "28px 30px",
              marginBottom: "20px",
              boxShadow:
                "0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    letterSpacing: "3px",
                    color: "#9ca3af",
                    marginBottom: "7px",
                  }}
                >
                  ADMIN DASHBOARD
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "30px",
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                  }}
                >
                  管理ダッシュボード
                </h1>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#d1d5db",
                    fontSize: "14px",
                  }}
                >
                  店舗の予約・売上・セラピスト状況を確認できます。
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={loadDashboard}
                  style={{
                    minHeight: "42px",
                    padding: "0 16px",
                    border: "1px solid #444",
                    background: "#222",
                    color: "#fff",
                    borderRadius: "7px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  再読み込み
                </button>

                <Link
                  to="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "42px",
                    padding: "0 16px",
                    background: "#fff",
                    color: "#111",
                    textDecoration: "none",
                    borderRadius: "7px",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  公開サイトを見る
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    minHeight: "42px",
                    padding: "0 16px",
                    border: "1px solid #555",
                    background: "#333",
                    color: "#fff",
                    borderRadius: "7px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  ログアウト
                </button>
              </div>
            </div>
          </header>

          {/* =================================================
              エラー
          ================================================= */}

          {errorMessage && (
            <div
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#be123c",
                padding: "15px",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* =================================================
              今日の状況
          ================================================= */}

          <section
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "22px",
              marginBottom: "20px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "2px",
                  color: "#999",
                }}
              >
                TODAY
              </div>

              <h2
                style={{
                  margin: "5px 0 0",
                  fontSize: "20px",
                }}
              >
                今日の店舗状況
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#777",
                  fontSize: "13px",
                }}
              >
                {formatJapaneseDate(today)}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "14px",
              }}
            >
              <DashboardStat
                label="今日の予約"
                value={`${todayReservations.length}件`}
              />

              <DashboardStat
                label="今日の完了"
                value={`${todayCompletedReservations.length}件`}
              />

              <DashboardStat
                label="今日の未完了"
                value={`${todayPendingReservations.length}件`}
              />

              <DashboardStat
                label="今日のキャンセル"
                value={`${todayCancelledReservations.length}件`}
              />

              <DashboardStat
                label="今日の売上"
                value={formatMoney(todaySales)}
              />
            </div>
          </section>

          {/* =================================================
              今月のKPI
          ================================================= */}

          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginBottom: "25px",
            }}
          >
            <DashboardStat
              label="今月の売上"
              value={formatMoney(monthlySales)}
              dark
            />

            <DashboardStat
              label="今月の経費"
              value={formatMoney(monthlyExpenseTotal)}
            />

            <DashboardStat
              label="今月の営業利益"
              value={formatMoney(monthlyProfit)}
              dark
            />

            <DashboardStat
              label="今月の利益率"
              value={`${monthlyProfitMargin.toFixed(1)}%`}
            />

            <DashboardStat
              label="今月の完了予約"
              value={`${monthlyCompletedReservations.length}件`}
            />

            <DashboardStat
              label="今月の予約"
              value={`${monthlyReservations.length}件`}
            />

            <DashboardStat
              label="今月のキャンセル"
              value={`${monthlyCancelledReservations.length}件`}
            />

            <DashboardStat
              label="今月の完了率"
              value={`${monthlyCompletionRate.toFixed(1)}%`}
            />

            <DashboardStat
              label="今月の平均客単価"
              value={formatMoney(
                Math.round(monthlyAverageCustomerSpend)
              )}
            />

            <DashboardStat
              label="登録セラピスト"
              value={`${therapists.length}名`}
            />
          </section>

          {/* =================================================
              今日の予約
          ================================================= */}

          <section
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "24px",
              marginBottom: "25px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <SectionHeader
              title="今日の予約"
              description="本日の予約状況を確認できます。"
              linkText="予約カレンダーを見る"
              linkPath="/admin/reservations"
            />

            {todayReservations.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#888",
                  background: "#fafafa",
                  borderRadius: "10px",
                }}
              >
                本日の予約はありません。
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
                    minWidth: "760px",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
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
                        料金
                      </th>

                      <th style={tableHeaderStyle}>
                        状態
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {todayReservations.map(
                      (reservation) => {
                        const statusStyle =
                          getStatusStyle(
                            reservation.status
                          );

                        return (
                          <tr
                            key={reservation.id}
                          >
                            <td style={tableCellStyle}>
                              {reservation.reservation_time
                                ? reservation.reservation_time.slice(
                                    0,
                                    5
                                  )
                                : "-"}
                            </td>

                            <td
                              style={{
                                ...tableCellStyle,
                                fontWeight: 600,
                              }}
                            >
                              {reservation.customer_name ||
                                "-"}
                            </td>

                            <td style={tableCellStyle}>
                              {getTherapistName(
                                reservation.therapist_id
                              )}
                            </td>

                            <td style={tableCellStyle}>
                              {getCourseName(
                                reservation.course_id
                              )}
                            </td>

                            <td
                              style={{
                                ...tableCellStyle,
                                textAlign: "right",
                              }}
                            >
                              {formatMoney(
                                getCoursePrice(
                                  reservation.course_id
                                )
                              )}
                            </td>

                            <td
                              style={{
                                ...tableCellStyle,
                              }}
                            >
                              <span
                                style={{
                                  display:
                                    "inline-block",
                                  padding:
                                    "5px 10px",
                                  borderRadius:
                                    "999px",
                                  fontSize:
                                    "12px",
                                  fontWeight: 600,
                                  background:
                                    statusStyle.background,
                                  color:
                                    statusStyle.color,
                                }}
                              >
                                {getStatusLabel(
                                  reservation.status
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* =================================================
              ランキング
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              marginBottom: "25px",
            }}
          >
            {/* セラピストランキング */}

            <RankingSection
              title="セラピスト別売上"
              description="今月の完了予約をもとに集計"
              items={therapistRanking}
            />

            {/* コースランキング */}

            <RankingSection
              title="コース別売上"
              description="今月の完了予約をもとに集計"
              items={courseRanking}
            />
          </div>

          {/* =================================================
              クイックアクセス
          ================================================= */}

          <section
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "22px",
              marginBottom: "25px",
              boxShadow:
                "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <SectionHeader
              title="クイックアクセス"
              description="よく使用する管理機能へすぐに移動できます。"
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <QuickLink
                title="予約カレンダー"
                path="/admin/reservations"
              />

              <QuickLink
                title="新規予約"
                path="/admin/reservations/new"
              />

              <QuickLink
                title="セラピスト別予約"
                path="/admin/reservations/therapists"
              />

              <QuickLink
                title="顧客管理"
                path="/admin/customers"
              />

              <QuickLink
                title="セラピスト管理"
                path="/admin/therapists"
              />

              <QuickLink
                title="売上管理"
                path="/admin/sales"
              />
            </div>
          </section>

          {/* =================================================
              全管理メニュー
          ================================================= */}

          <div
            style={{
              display: "grid",
              gap: "25px",
            }}
          >
            {menuSections.map(
              (section) => (
                <section
                  key={section.title}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "24px",
                    boxShadow:
                      "0 2px 10px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "18px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "21px",
                        color: "#222",
                      }}
                    >
                      {section.title}
                    </h2>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      {section.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {section.items.map(
                      (item) => (
                        <AdminMenuCard
                          key={item.path}
                          title={item.title}
                          description={
                            item.description
                          }
                          path={item.path}
                        />
                      )
                    )}
                  </div>
                </section>
              )
            )}
          </div>

          {/* =================================================
              フッター
          ================================================= */}

          <footer
            style={{
              textAlign: "center",
              marginTop: "35px",
              color: "#999",
              fontSize: "12px",
            }}
          >
            店舗管理システム
          </footer>
        </div>
      </main>
    </>
  );
}

/* =====================================================
   ダッシュボード統計カード
===================================================== */

function DashboardStat({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        background: dark
          ? "#111"
          : "#fff",
        color: dark
          ? "#fff"
          : "#111",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: dark
          ? "none"
          : "0 2px 10px rgba(0,0,0,0.05)",
        border: dark
          ? "none"
          : "1px solid #eee",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: dark
            ? "#aaa"
            : "#777",
          marginBottom: "9px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "25px",
          fontWeight: 700,
          letterSpacing: "-0.5px",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* =====================================================
   セクションヘッダー
===================================================== */

function SectionHeader({
  title,
  description,
  linkText,
  linkPath,
}: {
  title: string;
  description: string;
  linkText?: string;
  linkPath?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        alignItems: "center",
        gap: "15px",
        flexWrap: "wrap",
        marginBottom: "18px",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "21px",
            color: "#222",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            color: "#777",
            fontSize: "13px",
          }}
        >
          {description}
        </p>
      </div>

      {linkText && linkPath && (
        <Link
          to={linkPath}
          style={{
            color: "#111",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {linkText} →
        </Link>
      )}
    </div>
  );
}

/* =====================================================
   ランキング
===================================================== */

function RankingSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: RankingItem[];
}) {
  return (
    <section
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "24px",
        boxShadow:
          "0 2px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          marginBottom: "18px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: "13px",
            color: "#777",
          }}
        >
          {description}
        </p>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: "30px 10px",
            textAlign: "center",
            color: "#888",
            background: "#fafafa",
            borderRadius: "9px",
            fontSize: "13px",
          }}
        >
          データがありません。
        </div>
      ) : (
        <div>
          {items.map(
            (item, index) => (
              <div
                key={`${item.name}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding:
                    "13px 0",
                  borderBottom:
                    index ===
                    items.length - 1
                      ? "none"
                      : "1px solid #eee",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius:
                      "50%",
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    background:
                      index === 0
                        ? "#111"
                        : "#f1f1f1",
                    color:
                      index === 0
                        ? "#fff"
                        : "#555",
                    fontSize:
                      "12px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "14px",
                      fontWeight: 600,
                      color: "#222",
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {item.name}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "3px",
                      fontSize:
                        "12px",
                      color:
                        "#888",
                    }}
                  >
                    {item.count}
                    件
                  </div>
                </div>

                <div
                  style={{
                    fontSize:
                      "14px",
                    fontWeight: 700,
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {item.sales.toLocaleString(
                    "ja-JP"
                  )}
                  円
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

/* =====================================================
   クイックリンク
===================================================== */

function QuickLink({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  return (
    <Link
      to={path}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "48px",
        padding: "10px 14px",
        boxSizing: "border-box",
        background: "#111",
        color: "#fff",
        textDecoration: "none",
        borderRadius: "7px",
        fontSize: "14px",
        fontWeight: 600,
      }}
    >
      {title}
    </Link>
  );
}

/* =====================================================
   管理メニューカード
===================================================== */

function AdminMenuCard({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  return (
    <Link
      to={path}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "18px",
        background: "#fff",
        boxSizing: "border-box",
        transition:
          "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(
        event
      ) => {
        event.currentTarget.style.transform =
          "translateY(-2px)";

        event.currentTarget.style.boxShadow =
          "0 5px 15px rgba(0,0,0,0.08)";

        event.currentTarget.style.borderColor =
          "#d1d5db";
      }}
      onMouseLeave={(
        event
      ) => {
        event.currentTarget.style.transform =
          "translateY(0)";

        event.currentTarget.style.boxShadow =
          "none";

        event.currentTarget.style.borderColor =
          "#e5e7eb";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#222",
              marginBottom: "6px",
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: "13px",
              color: "#777",
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            fontSize: "20px",
            color: "#999",
            flexShrink: 0,
          }}
        >
          →
        </div>
      </div>
    </Link>
  );
}

/* =====================================================
   日付表示
===================================================== */

function formatJapaneseDate(
  date: string
) {
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
   テーブルスタイル
===================================================== */

const tableHeaderStyle: React.CSSProperties =
  {
    textAlign: "left",
    padding: "12px",
    borderBottom:
      "2px solid #eee",
    fontSize: "12px",
    color: "#666",
    whiteSpace: "nowrap",
  };

const tableCellStyle: React.CSSProperties =
  {
    padding: "14px 12px",
    borderBottom:
      "1px solid #eee",
    fontSize: "13px",
    color: "#333",
    whiteSpace: "nowrap",
  };

/* =====================================================
   スマホ最適化
===================================================== */

const mobileResponsiveStyle = `
  @media (max-width: 600px) {
    body {
      overflow-x: hidden;
    }

    * {
      box-sizing: border-box;
    }

    main {
      overflow-x: hidden;
    }

    button,
    a {
      -webkit-tap-highlight-color: transparent;
    }

    /* ================================
       管理画面全体
    ================================= */

    main {
      padding: 14px 10px 50px !important;
    }

    /* ================================
       ヘッダー
    ================================= */

    header {
      padding: 20px 18px !important;
      border-radius: 10px !important;
    }

    header h1 {
      font-size: 23px !important;
    }

    header p {
      font-size: 12px !important;
    }

    header > div {
      align-items: stretch !important;
    }

    header > div > div:last-child {
      width: 100%;
    }

    header button,
    header a {
      flex: 1;
      min-height: 46px !important;
      padding: 0 10px !important;
    }

    /* ================================
       セクション
    ================================= */

    section {
      border-radius: 10px !important;
    }

    /* ================================
       KPIカード
    ================================= */

    section > div {
      max-width: 100%;
    }

    /* ================================
       テーブル
    ================================= */

    table {
      font-size: 12px;
    }

    th,
    td {
      padding: 10px 8px !important;
    }

    /* ================================
       クイックアクセス
    ================================= */

    /* ================================
       管理メニュー
    ================================= */

    /* ================================
       タップ操作
    ================================= */

    button,
    a {
      touch-action: manipulation;
    }
  }
`;