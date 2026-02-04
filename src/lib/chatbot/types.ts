// src/lib/chatbot/types.ts

// Chat message sender type
export type MessageSender = "bot" | "user";

// Conversation flow steps (순차적 흐름)
export type ConversationStep =
  | "welcome" // Initial greeting
  | "team_size" // 인원수 선택
  | "recommendations" // AI 추천 결과 표시 중
  | "flow_control" // 다음/건너뛰기/완료 선택
  | "completed"; // 완료

// Button option for user selection
export interface ChatOption {
  id: string;
  label: string;
  value: string;
  icon?: string; // Optional emoji/icon
}

// Equipment recommendation from AI
export interface EquipmentRecommendation {
  equipmentId: string;
  name: string;
  category: string;
  quantity: number;
  reason: string; // AI explanation for recommendation
  imageUrl?: string;
  priority: "essential" | "recommended" | "optional";
}

// Related equipment warning
export interface RelatedEquipmentWarning {
  mainEquipment: string; // e.g., "삼각대"
  missingEquipment: string; // e.g., "하이햇"
  reason: string; // Why it's needed
  equipmentId?: string; // For quick add
}

// Single chat message
export interface ChatMessage {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: number;
  options?: ChatOption[]; // Button options for user selection
  recommendations?: EquipmentRecommendation[];
  warnings?: RelatedEquipmentWarning[];
}

// User selections during conversation (제작유형 제거됨)
export interface UserSelections {
  teamSize: string | null; // 1-2명, 3-5명, etc.
  mainCategory: string | null; // 현재 선택한 카테고리
  selectedCategories: string[]; // 이미 살펴본 카테고리들
}

// Chatbot store state
export interface ChatbotState {
  isOpen: boolean;
  messages: ChatMessage[];
  currentStep: ConversationStep;
  selections: UserSelections;
  isLoading: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  resetChat: () => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setStep: (step: ConversationStep) => void;
  setSelection: (key: keyof UserSelections, value: string) => void;
  addSelectedCategory: (category: string) => void;
  setLoading: (loading: boolean) => void;
}

// AI response structure
export interface AIRecommendationResponse {
  recommendations: EquipmentRecommendation[];
  warnings: RelatedEquipmentWarning[];
}
