import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 페이지 컴포넌트
import SignInPage from "./pages/SignIn";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home"; // ✅ 우리가 만든 메인 페이지 (경로 확인 필요!)
import EquipmentDetail from "./pages/EquipmentDetail";
import CartPage from "./pages/student/CartPage";
import MyPage from "./pages/student/MyPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCalendar from "./pages/admin/AdminCalendar";
import ReservationPrint from "./pages/print/ReservationPrint";

// 보안 컴포넌트
import StoreUser from "./components/auth/StoreUser";
import AuthWrapper from "./components/auth/AuthWrapper";

function App() {
  return (
    <BrowserRouter>
      {/* 1. 로딩 화면 (Convex가 로그인 여부 확인하는 동안 표시) */}
      <AuthLoading>
        <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
          <div className="font-bold text-lg text-gray-600">
          
          </div>
        </div>
      </AuthLoading>

      {/* 2. 라우팅 설정 */}
      {/* Authenticated/Unauthenticated를 최상위에서 빼고, 필요한 곳에만 감쌉니다. */}

      {/* ✅ 로그인 시 사용자 정보 동기화 (화면엔 안 보임) */}
      <Authenticated>
        <StoreUser />
      </Authenticated>

      <Routes>
        {/* 모든 페이지는 헤더/푸터가 있는 Layout 안에 들어감 */}
        <Route path="/" element={<Layout />}>
          {/* [전체 공개] 로그인 없이 볼 수 있는 페이지 */}
          <Route index element={<Home />} />{" "}
          {/* ✅ 기존 EquipmentList 대신 Home 연결 */}
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          {/* [로그인 전용] 로그인 안 하면 로그인 페이지로 튕김 */}
          <Route
            path="login"
            element={
              <Unauthenticated>
                <SignInPage />
              </Unauthenticated>
            }
          />
          {/* [회원 전용] 로그인 + 승인된 사용자만 접근 가능 */}
          <Route
            path="cart"
            element={
              <Authenticated>
                <AuthWrapper>
                  <CartPage />
                </AuthWrapper>
              </Authenticated>
            }
          />
          <Route
            path="mypage"
            element={
              <Authenticated>
                <AuthWrapper>
                  <MyPage />
                </AuthWrapper>
              </Authenticated>
            }
          />
          {/* [관리자 전용] */}
          <Route
            path="admin"
            element={
              <Authenticated>
                <AuthWrapper>
                  <AdminDashboard />
                </AuthWrapper>
              </Authenticated>
            }
          />
        </Route>

        {/* [관리자 전용] 캘린더 - Layout 없이 풀스크린 */}
        <Route
          path="admin/calendar"
          element={
            <Authenticated>
              <AuthWrapper>
                <AdminCalendar />
              </AuthWrapper>
            </Authenticated>
          }
        />

        {/* [인쇄 페이지] 예약 장비리스트 & 반출리스트 - Layout 없이 풀스크린 */}
        <Route
          path="print/reservation/:id"
          element={
            <Authenticated>
              <AuthWrapper>
                <ReservationPrint />
              </AuthWrapper>
            </Authenticated>
          }
        />

        {/* 그 외 잘못된 접근은 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
