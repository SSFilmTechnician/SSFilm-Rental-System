// src/stores/useChatbotStore.ts
import { create } from "zustand";
import type {
  ChatbotState,
  ChatMessage,
  ConversationStep,
  UserSelections,
} from "@/lib/chatbot/types";
import {
  BOT_RESPONSES,
  TEAM_SIZE_OPTIONS,
} from "@/lib/chatbot/prompts";

// Generate unique message ID
const generateId = () =>
  `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Initial state values (제작유형 제거됨)
const initialSelections: UserSelections = {
  teamSize: null,
  mainCategory: null,
  selectedCategories: [],
};

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  isOpen: false,
  messages: [],
  currentStep: "welcome",
  selections: initialSelections,
  isLoading: false,

  // Open chat window
  openChat: () => {
    const state = get();
    if (state.messages.length === 0) {
      // Initialize with welcome message - 바로 인원수 선택부터 시작
      set({
        isOpen: true,
        messages: [
          {
            id: generateId(),
            sender: "bot",
            content: BOT_RESPONSES.welcome,
            timestamp: Date.now(),
            options: TEAM_SIZE_OPTIONS,
          },
        ],
        currentStep: "team_size",
      });
    } else {
      set({ isOpen: true });
    }
  },

  // Close chat window
  closeChat: () => set({ isOpen: false }),

  // Toggle chat window
  toggleChat: () => {
    const state = get();
    if (state.isOpen) {
      state.closeChat();
    } else {
      state.openChat();
    }
  },

  // Reset chat to initial state
  resetChat: () =>
    set({
      messages: [
        {
          id: generateId(),
          sender: "bot",
          content: BOT_RESPONSES.welcome,
          timestamp: Date.now(),
          options: TEAM_SIZE_OPTIONS,
        },
      ],
      currentStep: "team_size",
      selections: initialSelections,
      isLoading: false,
    }),

  // Add a new message
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        },
      ],
    })),

  // Set conversation step
  setStep: (step: ConversationStep) => set({ currentStep: step }),

  // Set user selection (for string values)
  setSelection: (key: keyof UserSelections, value: string) =>
    set((state) => ({
      selections: { ...state.selections, [key]: value },
    })),

  // Add a category to the selected categories list
  addSelectedCategory: (category: string) =>
    set((state) => ({
      selections: {
        ...state.selections,
        selectedCategories: [
          ...state.selections.selectedCategories,
          category,
        ],
      },
    })),

  // Set loading state
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
