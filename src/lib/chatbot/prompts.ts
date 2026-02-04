// src/lib/chatbot/prompts.ts
import type { ChatOption } from "./types";

// Step 1: Team Size Options (제작유형 제거 - 바로 인원수부터 시작)
export const TEAM_SIZE_OPTIONS: ChatOption[] = [
  { id: "tiny", label: "1-2명", value: "1-2명", icon: "👤" },
  { id: "small", label: "3-5명", value: "3-5명", icon: "👥" },
  { id: "medium", label: "6-10명", value: "6-10명", icon: "👨‍👩‍👧‍👦" },
  { id: "large", label: "10명+", value: "10명+", icon: "🎭" },
];

// Sequential category flow order (순차적 흐름)
// 카메라 → 렌즈 → 삼각대 → 모니터 → 조명 → 오디오 → 악세서리
export const CATEGORY_FLOW_ORDER: ChatOption[] = [
  { id: "camera", label: "카메라", value: "CAMERA", icon: "📷" },
  { id: "lens", label: "렌즈", value: "LENS", icon: "🔍" },
  { id: "tripod_grip", label: "삼각대/그립", value: "TRIPOD · GRIP", icon: "🎥" },
  { id: "monitor", label: "모니터", value: "MONITOR", icon: "🖥️" },
  { id: "lighting", label: "조명", value: "LIGHTING", icon: "💡" },
  { id: "audio", label: "오디오", value: "AUDIO", icon: "🎤" },
  { id: "acc", label: "악세서리", value: "ACC", icon: "🔧" },
];

// Alias for backwards compatibility
export const ALL_CATEGORY_OPTIONS = CATEGORY_FLOW_ORDER;

// Get the next category in the sequential flow
export const getNextCategoryInFlow = (
  currentCategory: string
): ChatOption | null => {
  const currentIndex = CATEGORY_FLOW_ORDER.findIndex(
    (cat) => cat.value === currentCategory
  );
  if (currentIndex === -1 || currentIndex === CATEGORY_FLOW_ORDER.length - 1) {
    return null; // No next category
  }
  return CATEGORY_FLOW_ORDER[currentIndex + 1];
};

// Get remaining category options (excluding already selected ones)
export const getNextCategoryOptions = (
  selectedCategories: string[]
): ChatOption[] => {
  const remaining = CATEGORY_FLOW_ORDER.filter(
    (cat) => !selectedCategories.includes(cat.value)
  );
  return remaining;
};

// Flow control options (다음 카테고리로 진행 또는 완료)
export const getFlowOptions = (nextCategory: ChatOption | null): ChatOption[] => {
  if (nextCategory) {
    return [
      {
        id: "next",
        label: `다음: ${nextCategory.label}`,
        value: nextCategory.value,
        icon: "➡️",
      },
      { id: "skip", label: "건너뛰기", value: "skip", icon: "⏭️" },
      { id: "finish", label: "완료", value: "finish", icon: "✅" },
    ];
  }
  return [{ id: "finish", label: "장바구니 확인", value: "finish", icon: "🛒" }];
};

// Bot response templates
export const BOT_RESPONSES = {
  welcome:
    "안녕하세요! SSFILM 장비 추천 도우미입니다. 촬영팀 인원은 몇 명인가요?",

  afterTeamSize: (size: string) =>
    `${size} 규모의 팀이시네요. 카메라부터 순서대로 장비를 추천해드릴게요!`,

  beforeRecommendation: (category: string) =>
    `${category} 장비를 찾아볼게요...`,

  recommendationIntro: (category: string) =>
    `${category} 추천 장비입니다. 필요한 장비를 담아주세요:`,

  warningIntro: () => "아래 연관 장비도 함께 확인해주세요:",

  afterRecommendation: (nextCategory: string | null) =>
    nextCategory
      ? `다음은 ${nextCategory} 장비입니다. 진행할까요?`
      : "모든 카테고리를 살펴봤어요!",

  skipCategory: (skippedCategory: string, nextCategory: string | null) =>
    nextCategory
      ? `${skippedCategory}을(를) 건너뛰었어요. 다음은 ${nextCategory}입니다.`
      : "모든 카테고리를 살펴봤어요!",

  completed: () =>
    "장비 추천이 완료되었습니다! 장바구니에서 선택한 장비를 확인하세요. 추가 추천이 필요하면 '다시 시작'을 눌러주세요.",

  error: () =>
    "죄송합니다. 추천을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

