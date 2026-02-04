// src/components/chatbot/ChatMessage.tsx
import { AlertTriangle } from "lucide-react";
import type { ChatMessage as ChatMessageType, ChatOption } from "@/lib/chatbot/types";
import ChatOptionButtons from "./ChatOptionButtons";
import RecommendationCard from "./RecommendationCard";

interface ChatMessageProps {
  message: ChatMessageType;
  onOptionSelect?: (option: ChatOption) => void;
  isLatest: boolean;
}

export default function ChatMessage({
  message,
  onOptionSelect,
  isLatest,
}: ChatMessageProps) {
  const isBot = message.sender === "bot";

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`max-w-[85%] ${
          isBot
            ? "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-md"
            : "bg-blue-600 text-white rounded-2xl rounded-tr-md"
        } px-4 py-3`}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Option buttons (only show for latest bot message with options) */}
        {isBot && message.options && isLatest && onOptionSelect && (
          <ChatOptionButtons
            options={message.options}
            onSelect={onOptionSelect}
          />
        )}

        {/* Recommendations */}
        {isBot && message.recommendations && message.recommendations.length > 0 && (
          <div className="mt-4 space-y-3">
            {message.recommendations.map((rec, idx) => (
              <RecommendationCard key={idx} recommendation={rec} />
            ))}
          </div>
        )}

        {/* Warnings */}
        {isBot && message.warnings && message.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-600 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">연관 장비 확인</span>
            </div>
            {message.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs"
              >
                <div className="font-bold text-amber-800">
                  {warning.mainEquipment} 선택 시
                </div>
                <div className="text-amber-700 mt-1">
                  <span className="font-medium">{warning.missingEquipment}</span>
                  이(가) 필요할 수 있습니다.
                </div>
                <div className="text-amber-600 mt-1 text-[11px]">
                  {warning.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
