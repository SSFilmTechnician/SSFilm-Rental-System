import { useState, useCallback, useRef } from "react";
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
  loadingMessage: string | null;
  fetchRecommendation: (step: WizardStep) => Promise<void>;
}

export function useAIRecommendation(): UseAIRecommendationResult {
  const { state, dispatch } = useAIWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setLoadingMessage(null);

      // 기존 카운트다운 인터벌 정리
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

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
        const availableEquipmentMap: Record<string, number> = result.availableEquipmentMap || {};
        console.log("🔹 AI 원본 응답:", rawRecommendation);
        console.log("🔹 날짜별 재고 맵:", availableEquipmentMap);

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

        // 장비별 재고 조회 (날짜별 실시간 재고 사용)
        const getAvailableQuantity = (equipmentName: string): number => {
          // 서버에서 받은 날짜별 재고 사용
          const available = availableEquipmentMap[equipmentName];
          if (available !== undefined) {
            return available;
          }
          // fallback: allEquipment에서 찾기
          const equipment = allEquipment.find((eq) => eq.name === equipmentName);
          console.warn(`⚠️ 재고 맵에서 찾을 수 없음: "${equipmentName}", fallback 사용`);
          return equipment?.totalQuantity || 0;
        };

        // UI용 형식으로 변환
        const recommendedItems = rawRecommendation.recommendations
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
              availableQuantity: getAvailableQuantity(rec.equipment_name),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);

        // 추천된 장비 ID 목록 (중복 방지용)
        const recommendedIds = new Set(recommendedItems.map(item => item.equipmentId));

        const transformedRecommendation: AIRecommendation = {
          step: rawRecommendation.step,
          recommended: recommendedItems,
          alternatives: rawRecommendation.recommendations
            .flatMap((rec) =>
              (rec.alternatives || [])
                .map((alt) => {
                  const equipmentId = findEquipmentId(alt.equipment_name);
                  if (!equipmentId) {
                    console.warn(`대안 장비를 찾을 수 없습니다: ${alt.equipment_name}`);
                    return null;
                  }
                  // 이미 추천에 포함된 장비는 대안에서 제외
                  if (recommendedIds.has(equipmentId)) {
                    console.warn(`⚠️ 중복 제거: ${alt.equipment_name}은(는) 이미 추천에 포함됨`);
                    return null;
                  }
                  return {
                    equipmentId,
                    equipmentName: alt.equipment_name,
                    reason: alt.reason,
                    availableQuantity: getAvailableQuantity(alt.equipment_name),
                  };
                })
                .filter((item): item is NonNullable<typeof item> => item !== null)
            ),
          summary: rawRecommendation.step_summary,
        };

        console.log("✅ 변환된 추천 데이터:", transformedRecommendation);
        console.log("📊 추천 장비 수:", transformedRecommendation.recommended.length);
        console.log("📊 대안 장비 수:", transformedRecommendation.alternatives.length);

        // 재고 0인 장비 확인
        const outOfStockItems = transformedRecommendation.recommended.filter(item => item.availableQuantity === 0);
        if (outOfStockItems.length > 0) {
          console.log("🚨 재고 0인 추천 장비:", outOfStockItems);
        } else {
          console.warn("⚠️ 재고 0인 추천 장비가 없습니다. AI가 재고 0인 장비를 추천하지 않았거나, 모든 장비에 재고가 있습니다.");
        }

        // 추천 결과 저장
        dispatch({
          type: "SET_RECOMMENDATION",
          payload: { step, recommendation: transformedRecommendation },
        });

        setIsLoading(false);
        dispatch({ type: "SET_LOADING", payload: false });
      } catch (err: any) {
        const errorMessage = err.message || "AI 추천을 불러오는데 실패했습니다.";
        console.error("❌ AI 추천 에러:", errorMessage);
        console.error("❌ 에러 전체 내용:", err);

        // Rate limit 에러면 자동 재시도 (다양한 형식 지원)
        const isRateLimitError =
          errorMessage.includes("초 후 자동으로 재시도됩니다") ||
          errorMessage.includes("AI 서비스 요청이 너무 많습니다") ||
          errorMessage.includes("Rate Limit") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("429");

        if (isRateLimitError) {
          const waitTimeMatch = errorMessage.match(/(\d+)초 후/);
          const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 30;

          console.log(`⏳ Rate Limit 감지! ${waitTime}초 후 자동 재시도...`);

          // 로딩 상태 유지하면서 카운트다운 표시 (error가 아닌 loadingMessage 사용)
          let remainingTime = waitTime;
          setLoadingMessage(`⏳ AI 요청이 너무 많습니다. ${remainingTime}초 후 자동 재시도...`);

          // 기존 인터벌 정리
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }

          // 1초마다 카운트다운 업데이트
          countdownIntervalRef.current = setInterval(() => {
            remainingTime--;
            if (remainingTime > 0) {
              setLoadingMessage(`⏳ AI 요청이 너무 많습니다. ${remainingTime}초 후 자동 재시도...`);
            } else {
              setLoadingMessage("🔄 재시도 중...");
            }
          }, 1000);

          // 대기 후 자동 재시도
          setTimeout(() => {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            console.log("🔄 자동 재시도 시작");
            setLoadingMessage(null);
            fetchRecommendation(step);
          }, (waitTime + 1) * 1000); // 1초 여유

          // Rate limit 에러는 로딩 유지 (자동 재시도 중이므로)
          // setIsLoading(false)를 호출하지 않음
        } else {
          setError(errorMessage);
          dispatch({ type: "SET_ERROR", payload: errorMessage });
          setIsLoading(false);
        }
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
    loadingMessage,
    fetchRecommendation,
  };
}
