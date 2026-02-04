// src/components/chatbot/ChatOptionButtons.tsx
import type { ChatOption } from "@/lib/chatbot/types";

interface ChatOptionButtonsProps {
  options: ChatOption[];
  onSelect: (option: ChatOption) => void;
  disabled?: boolean;
}

export default function ChatOptionButtons({
  options,
  onSelect,
  disabled = false,
}: ChatOptionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
              : "bg-white text-gray-700 border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 active:scale-[0.98]"
          }`}
        >
          {option.icon && <span className="text-base">{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
