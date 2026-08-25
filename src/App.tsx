import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { supabase } from "./lib/supabase";

import Admin from "./pages/Admin";

import Login from "./pages/admin/Login";

import ReservationCalender from "./pages/admin/ReservationCalender";
import NewReservation from "./pages/admin/NewReservation";
import TherapistReservationList from "./pages/admin/TherapistReservationList";
import Customers from "./pages/admin/Customers";
import TherapistManagement from "./pages/admin/TherapistManagement";
import StaffManagement from "./pages/admin/StaffManagement";

import Therapists from "./pages/Therapists";
import TherapistDetail from "./pages/TherapistDetail";
import ReservationPage from "./pages/Reservation";

/* =====================================================
   管理画面ログイン保護
===================================================== */

function ProtectedAdmin() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setIsLoggedIn(!!session);
      setLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setIsLoggedIn(!!session);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* 認証確認中 */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f8",
        }}
      >
        <div>認証確認中...</div>
      </div>
    );
  }

  /* 未ログイン */
  if (!isLoggedIn) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  /* ログイン済み */
  return <Outlet />;
}

/* =====================================================
   App
===================================================== */

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =================================================
            公開サイト
        ================================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to="/therapists"
              replace
            />
          }
        />

        {/* セラピスト */}
        <Route
          path="/therapists"
          element={<Therapists />}
        />

        <Route
          path="/therapists/:therapistId"
          element={<TherapistDetail />}
        />

        {/* 予約 */}
        <Route
          path="/reservation/:therapistId"
          element={<ReservationPage />}
        />

        {/* =================================================
            管理画面ログイン
        ================================================= */}

        <Route
          path="/admin/login"
          element={<Login />}
        />

        {/* =================================================
            管理画面
            ※ここから下はログイン必須
        ================================================= */}

        <Route element={<ProtectedAdmin />}>

          {/* 管理トップ */}
          <Route
            path="/admin"
            element={<Admin />}
          />

          {/* 管理：予約 */}
          <Route
            path="/admin/reservations"
            element={<ReservationCalender />}
          />

          <Route
            path="/admin/reservations/new"
            element={<NewReservation />}
          />

          <Route
            path="/admin/reservations/therapists"
            element={<TherapistReservationList />}
          />

          {/* 管理：顧客 */}
          <Route
            path="/admin/customers"
            element={<Customers />}
          />

          {/* 管理：セラピスト */}
          <Route
            path="/admin/therapists"
            element={<TherapistManagement />}
          />

          {/* 管理：スタッフ */}
          <Route
            path="/admin/staff"
            element={<StaffManagement />}
          />

          {/* 既存ルート */}
          <Route
            path="/reservation-calender"
            element={<ReservationCalender />}
          />

        </Route>

        {/* =================================================
            不明なURL
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/therapists"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;