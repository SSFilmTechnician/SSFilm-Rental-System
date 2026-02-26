import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { WizardState, WizardAction, WizardStep } from "./types";

// 초기 상태
const initialState: WizardState = {
  currentStep: "basic_info",
  basicInfo: {
    pickupDate: "", // 대여 시작 날짜/시간
    returnDate: "", // 반납 예정 날짜/시간
    crewSize: 3, // 기본 3명
  },
  selections: {
    camera: [],
    lens: [],
    tripodGrip: [],
    monitor: [],
    lighting: [],
    stand: [],
    accessory: [],
  },
  recommendations: {},
  isLoading: false,
  error: null,
};

// 리듀서
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_BASIC_INFO":
      return {
        ...state,
        basicInfo: action.payload,
      };

    case "NEXT_STEP": {
      const steps: WizardStep[] = [
        "basic_info",
        "camera",
        "lens",
        "tripod_grip",
        "monitor",
        "lighting",
        "stand",
        "accessory",
        "summary",
      ];
      const currentIndex = steps.indexOf(state.currentStep);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
      return {
        ...state,
        currentStep: steps[nextIndex],
      };
    }

    case "PREV_STEP": {
      const steps: WizardStep[] = [
        "basic_info",
        "camera",
        "lens",
        "tripod_grip",
        "monitor",
        "lighting",
        "stand",
        "accessory",
        "summary",
      ];
      const currentIndex = steps.indexOf(state.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return {
        ...state,
        currentStep: steps[prevIndex],
      };
    }

    case "GO_TO_STEP":
      return {
        ...state,
        currentStep: action.payload,
      };

    case "ADD_SELECTION": {
      const { step, equipment } = action.payload;
      return {
        ...state,
        selections: {
          ...state.selections,
          [step]: [...state.selections[step], equipment],
        },
      };
    }

    case "REMOVE_SELECTION": {
      const { step, equipmentId } = action.payload;
      return {
        ...state,
        selections: {
          ...state.selections,
          [step]: state.selections[step].filter(
            (item) => item.equipmentId !== equipmentId
          ),
        },
      };
    }

    case "UPDATE_QUANTITY": {
      const { step, equipmentId, quantity } = action.payload;
      return {
        ...state,
        selections: {
          ...state.selections,
          [step]: state.selections[step].map((item) =>
            item.equipmentId === equipmentId ? { ...item, quantity } : item
          ),
        },
      };
    }

    case "SET_RECOMMENDATION":
      return {
        ...state,
        recommendations: {
          ...state.recommendations,
          [action.payload.step]: action.payload.recommendation,
        },
      };

    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// Context 타입
interface WizardContextType {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

// Context 생성
const AIWizardContext = createContext<WizardContextType | null>(null);

// Provider 컴포넌트
export function AIWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  return (
    <AIWizardContext.Provider value={{ state, dispatch }}>
      {children}
    </AIWizardContext.Provider>
  );
}

// Hook
export function useAIWizard() {
  const context = useContext(AIWizardContext);
  if (!context) {
    throw new Error("useAIWizard must be used within AIWizardProvider");
  }
  return context;
}
