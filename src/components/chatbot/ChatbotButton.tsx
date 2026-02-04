// src/components/chatbot/ChatbotButton.tsx
import { MessageCircle, X } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useChatbotStore } from "@/stores/useChatbotStore";

export default function ChatbotButton() {
  const { isAuthenticated } = useConvexAuth();
  const { isOpen, toggleChat } = useChatbotStore();

  // 로그인하지 않은 경우 챗봇 버튼 숨김
  if (!isAuthenticated) return null;

  return (
    <button
      onClick={toggleChat}
      className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center active:scale-95 ${
        isOpen
          ? "bg-gray-800 hover:bg-gray-900"
          : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:scale-105"
      }`}
      aria-label={isOpen ? "챗봇 닫기" : "장비 추천받기"}
    >
      {isOpen ? (
        <X className="w-6 h-6 text-white" />
      ) : (
        <MessageCircle className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
