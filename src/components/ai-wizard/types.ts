import type { Id } from "../../../convex/_generated/dataModel";

// 위자드 스텝 타입
export type WizardStep =
  | "basic_info"
  | "camera"
  | "lens"
  | "tripod_grip"
  | "monitor"
  | "lighting"
  | "stand"
  | "accessory"
  | "summary";

// 장비 선택 정보
export interface EquipmentSelection {
  equipmentId: Id<"equipment">;
  equipmentName: string;
  quantity: number;
  reason: string; // AI 추천 이유
  isAIRecommended: boolean; // AI 추천인지 학생이 직접 변경한 것인지
}

// AI 추천 응답 타입 (Gemini API 원본 응답)
export interface AIRecommendationRaw {
  step: string;
  recommendations: Array<{
    equipment_name: string;
    quantity: number;
    reason: string;
    alternatives?: Array<{
      equipment_name: string;
      reason: string;
    }>;
  }>;
  step_summary: string;
}

// AI 추천 UI용 타입 (프론트엔드에서 사용)
export interface AIRecommendation {
  step: string;
  recommended: Array<{
    equipmentId: string;
    equipmentName: string;
    quantity: number;
    reason: string;
    isAIRecommended: boolean;
    availableQuantity: number;
  }>;
  alternatives: Array<{
    equipmentId: string;
    equipmentName: string;
    reason: string;
    availableQuantity: number;
  }>;
  summary: string;
}

// 위자드 전체 상태
export interface WizardState {
  // 현재 스텝
  currentStep: WizardStep;

  // 기본 정보
  basicInfo: {
    pickupDate: string; // YYYY-MM-DDTHH:mm (대여 시작 날짜/시간)
    returnDate: string; // YYYY-MM-DDTHH:mm (반납 예정 날짜/시간)
    crewSize: number; // 인원 수
  };

  // 각 스텝별 선택된 장비
  selections: {
    camera: EquipmentSelection[];
    lens: EquipmentSelection[];
    tripodGrip: EquipmentSelection[];
    monitor: EquipmentSelection[];
    lighting: EquipmentSelection[];
    stand: EquipmentSelection[];
    accessory: EquipmentSelection[];
  };

  // AI 추천 결과 캐시 (스텝별)
  recommendations: Record<string, AIRecommendation>;

  // 로딩 상태
  isLoading: boolean;

  // 에러 상태
  error: string | null;
}

// 위자드 액션 타입
export type WizardAction =
  | { type: "SET_BASIC_INFO"; payload: { pickupDate: string; returnDate: string; crewSize: number } }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: WizardStep }
  | { type: "ADD_SELECTION"; payload: { step: keyof WizardState["selections"]; equipment: EquipmentSelection } }
  | { type: "REMOVE_SELECTION"; payload: { step: keyof WizardState["selections"]; equipmentId: Id<"equipment"> } }
  | { type: "UPDATE_QUANTITY"; payload: { step: keyof WizardState["selections"]; equipmentId: Id<"equipment">; quantity: number } }
  | { type: "SET_RECOMMENDATION"; payload: { step: string; recommendation: AIRecommendation } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };
