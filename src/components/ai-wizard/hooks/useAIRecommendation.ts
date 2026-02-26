import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAIWizard } from "../AIWizardProvider";
import type { AIRecommendation, AIRecommendationRaw, WizardStep } from "../types";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_URL?.replace(
  ".cloud",
  ".site"
);

// 개발 중 URL 확인
if (!CONVEX_SITE_URL) {
  console.error("❌ VITE_CONVEX_URL이 설정되지 않았습니다!");
} else {
  console.log("✅ Convex Site URL:", CONVEX_SITE_URL);
}

interface UseAIRecommendationResult {
  recommendation: AIRecommendation | null;
  isLoading: boolean;
  error: string | null;
  fetchRecommendation: (step: WizardStep) => Promise<void>;
}

export function useAIRecommendation(): UseAIRecommendationResult {
  const { state, dispatch } = useAIWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모든 장비 목록 조회 (이름 -> ID 매칭용)
  const allEquipment = useQuery(api.equipment.getAll);

  const fetchRecommendation = useCallback(
    async (step: WizardStep) => {
      if (step === "basic_info" || step === "summary") {
        return; // 이 스텝들은 추천이 필요 없음
      }

      if (!allEquipment) {
        // 장비 목록 로딩 중 - 조금 기다렸다가 다시 시도
        console.log("장비 목록 로딩 중...");
        return;
      }

      if (!CONVEX_SITE_URL) {
        const error = "Convex URL이 설정되지 않았습니다. .env.local 파일을 확인하세요.";
        setError(error);
        dispatch({ type: "SET_ERROR", payload: error });
        return;
      }

      setIsLoading(true);
      setError(null);
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        // 현재까지 선택된 장비 정보 수집
        const selectedEquipment = {
          camera: state.selections.camera,
          lens: state.selections.lens,
          tripodGrip: state.selections.tripodGrip,
          monitor: state.selections.monitor,
          lighting: state.selections.lighting,
          stand: state.selections.stand,
          accessory: state.selections.accessory,
        };

        const requestBody = {
          step,
          crewSize: state.basicInfo.crewSize,
          pickupDate: state.basicInfo.pickupDate,
          returnDate: state.basicInfo.returnDate,
          selectedEquipment,
          userId: "student123", // TODO: 실제 사용자 ID로 교체
        };

        const apiUrl = `${CONVEX_SITE_URL}/ai/getRecommendation`;

        console.log("🔹 AI 추천 요청:", {
          url: apiUrl,
          step,
          crewSize: state.basicInfo.crewSize,
          pickupDate: state.basicInfo.pickupDate,
          returnDate: state.basicInfo.returnDate,
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log("🔹 API 응답 상태:", response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("🔴 API 에러:", errorText);
          throw new Error(`AI 추천 요청 실패: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("🔹 API 응답 데이터:", result);

        // HTTP Action 응답 파싱
        if (!result.success) {
          throw new Error(result.error || "AI 추천에 실패했습니다.");
        }

        const rawRecommendation: AIRecommendationRaw = result.data;
        console.log("🔹 Gemini 원본 응답:", rawRecommendation);

        // 장비 이름 -> ID 매칭 헬퍼
        const findEquipmentId = (name: string): string | null => {
          const equipment = allEquipment.find(
            (eq) => eq.name.toLowerCase() === name.toLowerCase()
          );
          if (!equipment) {
            console.warn(`⚠️ 장비를 찾을 수 없음: "${name}"`);
            console.log("📋 사용 가능한 장비 목록:", allEquipment.map(e => e.name));
          }
          return equipment?._id || null;
        };

        // 장비별 재고 조회 (임시로 totalQuantity 사용, 추후 날짜별 재고 조회로 개선)
        const getAvailableQuantity = (equipmentId: string): number => {
          const equipment = allEquipment.find((eq) => eq._id === equipmentId);
          return equipment?.totalQuantity || 0;
        };

        // UI용 형식으로 변환
        const transformedRecommendation: AIRecommendation = {
          step: rawRecommendation.step,
          recommended: rawRecommendation.recommendations
            .map((rec) => {
              const equipmentId = findEquipmentId(rec.equipment_name);
              if (!equipmentId) {
                console.warn(`장비를 찾을 수 없습니다: ${rec.equipment_name}`);
                return null;
              }
              return {
                equipmentId,
                equipmentName: rec.equipment_name,
                quantity: rec.quantity,
                reason: rec.reason,
                isAIRecommended: true,
                availableQuantity: getAvailableQuantity(equipmentId),
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null),
          alternatives: rawRecommendation.recommendations
            .flatMap((rec) =>
              (rec.alternatives || [])
                .map((alt) => {
                  const equipmentId = findEquipmentId(alt.equipment_name);
                  if (!equipmentId) {
                    console.warn(`대안 장비를 찾을 수 없습니다: ${alt.equipment_name}`);
                    return null;
                  }
                  return {
                    equipmentId,
                    equipmentName: alt.equipment_name,
                    reason: alt.reason,
                    availableQuantity: getAvailableQuantity(equipmentId),
                  };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null)
            ),
          summary: rawRecommendation.step_summary,
        };

        console.log("✅ 변환된 추천 데이터:", transformedRecommendation);
        console.log("📊 추천 장비 수:", transformedRecommendation.recommended.length);
        console.log("📊 대안 장비 수:", transformedRecommendation.alternatives.length);

        // 추천 결과 저장
        dispatch({
          type: "SET_RECOMMENDATION",
          payload: { step, recommendation: transformedRecommendation },
        });

        setIsLoading(false);
        dispatch({ type: "SET_LOADING", payload: false });
      } catch (err: any) {
        const errorMessage = err.message || "AI 추천을 불러오는데 실패했습니다.";
        setError(errorMessage);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        setIsLoading(false);
      }
    },
    [state.basicInfo, state.selections, dispatch, allEquipment]
  );

  const currentStep = state.currentStep;
  const recommendation = state.recommendations[currentStep] || null;

  // allEquipment 로딩 중이거나 AI 추천 로딩 중일 때
  const isEquipmentLoading = allEquipment === undefined;
  const finalIsLoading = isLoading || isEquipmentLoading;

  return {
    recommendation,
    isLoading: finalIsLoading,
    error,
    fetchRecommendation,
  };
}
