import { useState } from "react";
import { Sparkles } from "lucide-react";
import AIWizardPopup from "./AIWizardPopup";
import { AIWizardProvider } from "./AIWizardProvider";

export default function AIWizardButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 group"
        title="장비 리스트 추천"
      >
        <div className="relative">
          <Sparkles className="w-6 h-6" />
          {/* 반짝이는 애니메이션 */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
        </div>
        {/* 툴팁 */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          장비 리스트 추천
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-gray-900"></div>
        </div>
      </button>

      {/* 팝업 */}
      {isOpen && (
        <AIWizardProvider>
          <AIWizardPopup onClose={() => setIsOpen(false)} />
        </AIWizardProvider>
      )}
    </>
  );
}
