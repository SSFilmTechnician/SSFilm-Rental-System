import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 1. 헤더 */}
      <Header />

      {/* 2. 메인 컨텐츠 */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 3. 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center text-center">
          
          {/* 로고 PNG 이미지 (컬러) */}
          <img 
            src="https://oxxtmvcfhfmpobjcjugw.supabase.co/storage/v1/object/public/banners/SSFilm_Logo_Black.png" 
            alt="SSFILM" 
            className="h-8 md:h-9 w-auto mb-4 transition-all duration-300"
          />

          {/* ✅ [수정됨] 저작권 문구: 9px, 자간 좁게(tight) */}
          <p className="text-[9px] text-gray-600 font-medium tracking-tight uppercase">
            ©COPYRIGHT 2014 SCHOOL OF FILM ART, SSU ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}