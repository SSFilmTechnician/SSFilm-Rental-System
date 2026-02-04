// src/lib/chatbot/equipmentRules.ts

// Equipment dependency mapping
// When user selects X, suggest Y if not already selected
export interface EquipmentDependency {
  mainEquipment: string[]; // Equipment names/categories that trigger this rule
  relatedEquipment: string[]; // Equipment that should be suggested
  reason: string; // Explanation in Korean
}

export const EQUIPMENT_DEPENDENCIES: EquipmentDependency[] = [
  {
    mainEquipment: ["삼각대", "TRIPOD", "Tripod"],
    relatedEquipment: ["하이햇", "Hi-Hat", "베이비 하이햇"],
    reason: "로우앵글 촬영을 위해 하이햇이 필요할 수 있습니다",
  },
  {
    mainEquipment: ["조명", "LIGHTING", "LIGHT", "Light"],
    relatedEquipment: ["라이트 스탠드", "C-Stand", "샌드백", "Sandbag"],
    reason: "조명 고정을 위해 스탠드와 샌드백이 필수입니다",
  },
  {
    mainEquipment: ["붐폴", "BOOM", "Boom Pole"],
    relatedEquipment: ["붐홀더", "Boom Holder"],
    reason: "장시간 촬영 시 붐홀더가 피로도를 줄여줍니다",
  },
  {
    mainEquipment: ["ARRI", "ALEXA", "Alexa Mini"],
    relatedEquipment: ["V마운트 배터리", "V-Mount", "CFast 카드"],
    reason: "ARRI 카메라는 전용 배터리와 미디어가 필요합니다",
  },
  {
    mainEquipment: ["무선 비디오", "Wireless Video", "Teradek"],
    relatedEquipment: ["모니터", "Monitor"],
    reason: "무선 비디오 수신을 위한 모니터가 필요합니다",
  },
  {
    mainEquipment: ["ND 필터", "Filter", "필터"],
    relatedEquipment: ["매트박스", "Matte Box"],
    reason: "필터 장착을 위해 매트박스가 필요합니다",
  },
  {
    mainEquipment: ["슬라이더", "Slider", "달리", "Dolly"],
    relatedEquipment: ["트랙", "Track", "레일"],
    reason: "부드러운 이동 촬영을 위해 트랙/레일이 필요할 수 있습니다",
  },
  {
    mainEquipment: ["무선 마이크", "Wireless Mic", "핀 마이크"],
    relatedEquipment: ["리시버", "Receiver", "레코더"],
    reason: "무선 마이크 사용을 위해 리시버와 레코더가 필요합니다",
  },
];

// Team size to quantity scaling multiplier
export const TEAM_SIZE_SCALE: Record<string, number> = {
  "1-2명": 1.0,
  "3-5명": 1.0,
  "6-10명": 1.5,
  "10명+": 2.0,
};

// Production type to recommended categories priority
export const PRODUCTION_TYPE_RECOMMENDATIONS: Record<string, string[]> = {
  단편영화: ["CAMERA", "LENS", "LIGHTING", "AUDIO", "TRIPOD · GRIP"],
  다큐멘터리: ["CAMERA", "AUDIO", "TRIPOD · GRIP", "MONITOR"],
  "광고/뮤비": ["CAMERA", "LENS", "LIGHTING", "TRIPOD · GRIP", "MONITOR"],
  졸업작품: ["CAMERA", "LENS", "LIGHTING", "AUDIO", "TRIPOD · GRIP"],
};

// Category display names (for recommendations)
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  CAMERA: "카메라",
  LENS: "렌즈",
  "TRIPOD · GRIP": "삼각대/그립",
  MONITOR: "모니터",
  ACC: "악세서리",
  LIGHTING: "조명",
  AUDIO: "오디오",
};

// Priority display labels (추천만 사용)
export const PRIORITY_LABELS: Record<string, { label: string; color: string }> =
  {
    recommended: { label: "추천", color: "bg-blue-100 text-blue-700" },
  };
