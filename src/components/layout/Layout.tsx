import { Outlet } from "react-router-dom";
import Header from "./Header"; // ✅ 우리가 방금 만든 Header 컴포넌트 불러오기

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 1. 헤더 (Header.tsx에서 모든 메뉴와 로그인, 장바구니 처리) */}
      <Header />

      {/* 2. 메인 컨텐츠 (각 페이지가 여기에 들어옴) */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 3. 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-900 font-bold mb-2">SSFILM RENTAL SYSTEM</p>
          <p className="text-gray-500 text-sm">
            © 2026 Department of Film & Video. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
