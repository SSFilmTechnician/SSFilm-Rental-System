import { Outlet } from "react-router-dom";
import Header from "./Header";
// AI 위자드 - 교수님 AI 모델 적용 후 활성화 예정
// import AIWizardButton from "../ai-wizard/AIWizardButton";
// AI 챗봇 - 테스트 완료 후 활성화 예정
// import ChatbotButton from "@/components/chatbot/ChatbotButton";
// import ChatbotWindow from "@/components/chatbot/ChatbotWindow";

const FOOTER_LOGO_URL =
  "https://res.cloudinary.com/dd8pp8ngj/image/upload/v1769400548/SSFilm_Logo_Black_lzx6nw.png";

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
          {/* 로고 PNG 이미지 */}
          <img
            src={FOOTER_LOGO_URL}
            alt="SSFILM"
            className="h-8 md:h-9 w-auto mb-4 transition-all duration-300"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const span = document.createElement("span");
              span.innerText = "SSFILM";
              span.className = "text-xl font-bold text-gray-900 mb-4";
              e.currentTarget.parentElement?.appendChild(span);
            }}
          />

          {/* ✅ [수정됨] 저작권 문구: 9px, 자간 좁게(tight) */}
          <p className="text-[9px] text-gray-600 font-medium tracking-tight uppercase">
            ©COPYRIGHT 2014 SCHOOL OF FILM ART, SSU ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>

      {/* AI 위자드 - 교수님 AI 모델 적용 후 활성화 예정
      <AIWizardButton />
      */}

      {/* AI 장비 추천 챗봇 - 테스트 완료 후 활성화 예정
      <ChatbotButton />
      <ChatbotWindow />
      */}
    </div>
  );
}