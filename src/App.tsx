import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 1. 공용 페이지
import SignInPage from "./pages/SignIn";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import EquipmentDetail from "./pages/EquipmentDetail";
import RulesPage from "./pages/RulesPage";

// 2. 학생용 페이지
import CartPage from "./pages/student/CartPage";
import MyPage from "./pages/student/MyPage";
import InventoryCalendar from "./pages/InventoryCalendar";

// 3. 관리자용 페이지
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCalendar from "./pages/admin/AdminCalendar";
import EquipmentLog from "./pages/admin/EquipmentLog";

// 4. 인쇄/유틸리티 페이지
import ReservationPrint from "./pages/print/ReservationPrint";

// 5. 인증 및 데이터 동기화 컴포넌트
import StoreUser from "./components/auth/StoreUser";
import AuthWrapper from "./components/auth/AuthWrapper";

function App() {
  return (
    <BrowserRouter>
      {/* 🔹 로딩 화면: Convex 인증 상태 확인 중일 때 표시 */}
      <AuthLoading>
        <div className="flex flex-col h-screen items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mb-4"></div>
          <p className="font-bold text-lg text-gray-600">Loading...</p>
        </div>
      </AuthLoading>

      {/* 🔹 사용자 동기화: 로그인 상태일 때만 백그라운드 실행 (DB에 유저 정보 저장/갱신) */}
      <Authenticated>
        <StoreUser />
      </Authenticated>

      {/* 🔹 라우팅 설정 */}
      <Routes>
        {/* === 기본 레이아웃 (헤더/푸터 포함) === */}
        <Route path="/" element={<Layout />}>
          {/* [전체 공개] */}
          <Route index element={<Home />} />
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          <Route path="rules" element={<RulesPage />} />
          <Route
            path="inventory"
            element={
              <Authenticated>
                <AuthWrapper>
                  <InventoryCalendar />
                </AuthWrapper>
              </Authenticated>
            }
          />

          {/* [비로그인 전용] 로그인 상태면 홈으로 튕김 (Unauthenticated 처리) */}
          <Route
            path="login"
            element={
              <Unauthenticated>
                <SignInPage />
              </Unauthenticated>
            }
          />

          {/* [회원 전용] 로그인 + 승인 여부 체크 (AuthWrapper) */}
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

          {/* [관리자 전용] AuthWrapper 내부에서 admin 권한 체크 */}
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

        {/* === 풀스크린 레이아웃 (헤더/푸터 없음) === */}

        {/* 관리자 캘린더 */}
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

        {/* 장비 변경 로그 */}
        <Route
          path="admin/equipment-log"
          element={
            <Authenticated>
              <AuthWrapper>
                <EquipmentLog />
              </AuthWrapper>
            </Authenticated>
          }
        />

        {/* 예약/반출증 인쇄 페이지 */}
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

        {/* 잘못된 경로는 홈으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
