import { useEffect, useState } from "react";
import { useAIWizard } from "../AIWizardProvider";
import { useAIRecommendation } from "../hooks/useAIRecommendation";
import { ChevronRight, ChevronLeft, Plus, Minus, Sparkles, AlertCircle, LucideIcon } from "lucide-react";
import type { EquipmentSelection, WizardStep } from "../types";

interface StepTemplateProps {
  step: WizardStep;
  title: string;
  icon: LucideIcon;
  infoMessage: string | React.ReactNode;
}

export default function StepTemplate({ step, title, icon: Icon, infoMessage }: StepTemplateProps) {
  const { state, dispatch } = useAIWizard();
  const { recommendation, isLoading, error, fetchRecommendation } = useAIRecommendation();

  const selectionKey = step as keyof typeof state.selections;
  const [localSelections, setLocalSelections] = useState<EquipmentSelection[]>(
    state.selections[selectionKey] || []
  );

  // 컴포넌트 마운트 시 AI 추천 요청
  useEffect(() => {
    // 이미 추천이 있거나 에러가 있으면 스킵
    if (recommendation || error) return;

    // 로딩 중이 아닐 때만 요청
    if (!isLoading) {
      fetchRecommendation(step);
    }
  }, [isLoading, recommendation, error, fetchRecommendation, step]);

  const handleQuantityChange = (equipmentId: string, delta: number) => {
    setLocalSelections((prev) =>
      prev.map((item) =>
        item.equipmentId === equipmentId
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      )
    );
  };

  const handleAddEquipment = (equipment: EquipmentSelection) => {
    setLocalSelections((prev) => {
      const existing = prev.find((item) => item.equipmentId === equipment.equipmentId);
      if (existing) {
        return prev.map((item) =>
          item.equipmentId === equipment.equipmentId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...equipment, quantity: 1 }];
    });
  };

  const handleNext = () => {
    // 선택한 장비들을 상태에 저장
    localSelections.forEach((selection) => {
      const existing = state.selections[selectionKey].find(
        (item) => item.equipmentId === selection.equipmentId
      );

      if (!existing && selection.quantity > 0) {
        dispatch({
          type: "ADD_SELECTION",
          payload: { step: selectionKey, equipment: selection },
        });
      } else if (existing) {
        dispatch({
          type: "UPDATE_QUANTITY",
          payload: {
            step: selectionKey,
            equipmentId: selection.equipmentId,
            quantity: selection.quantity,
          },
        });
      }
    });

    // 수량이 0인 항목 제거
    state.selections[selectionKey].forEach((item) => {
      const local = localSelections.find((s) => s.equipmentId === item.equipmentId);
      if (!local || local.quantity === 0) {
        dispatch({
          type: "REMOVE_SELECTION",
          payload: { step: selectionKey, equipmentId: item.equipmentId },
        });
      }
    });

    dispatch({ type: "NEXT_STEP" });
  };

  const handlePrev = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const getSelectedQuantity = (equipmentId: string): number => {
    const item = localSelections.find((s) => s.equipmentId === equipmentId);
    return item?.quantity || 0;
  };

  const hasSelections = localSelections.some((item) => item.quantity > 0);

  return (
    <div className="p-6 space-y-6">
      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          <Icon className="w-4 h-4 inline mr-1" />
          {infoMessage}
        </p>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">AI가 최적의 {title}을(를) 분석중입니다...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-900 font-medium">추천 실패</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
            <button
              onClick={() => fetchRecommendation(step)}
              className="mt-2 text-xs text-red-600 underline hover:text-red-800"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* AI 추천 장비 */}
      {recommendation && !isLoading && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI 추천 {title}
          </h3>

          {recommendation.recommended.map((item) => {
            const quantity = getSelectedQuantity(item.equipmentId);
            const isSelected = quantity > 0;

            return (
              <div
                key={item.equipmentId}
                className={`border rounded-xl p-4 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-gray-900">{item.equipmentName}</h4>
                      {item.isAIRecommended && (
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                          AI 추천
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.reason}</p>
                  </div>
                </div>

                {/* 수량 조절 */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    재고: <strong className="text-gray-700">{item.availableQuantity}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {quantity === 0 ? (
                      <button
                        onClick={() =>
                          handleAddEquipment({
                            equipmentId: item.equipmentId as any,
                            equipmentName: item.equipmentName,
                            quantity: 1,
                            reason: item.reason,
                            isAIRecommended: item.isAIRecommended,
                          })
                        }
                        disabled={item.availableQuantity === 0}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        선택
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.equipmentId, -1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.equipmentId, 1)}
                          disabled={quantity >= item.availableQuantity}
                          className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 대안 장비 */}
      {recommendation && recommendation.alternatives.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-700">대안 장비</h3>

          {recommendation.alternatives.map((item) => {
            const quantity = getSelectedQuantity(item.equipmentId);
            const isSelected = quantity > 0;

            return (
              <div
                key={item.equipmentId}
                className={`border rounded-xl p-4 transition-all ${
                  isSelected
                    ? "border-gray-400 bg-gray-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{item.equipmentName}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.reason}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    재고: <strong className="text-gray-700">{item.availableQuantity}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {quantity === 0 ? (
                      <button
                        onClick={() =>
                          handleAddEquipment({
                            equipmentId: item.equipmentId as any,
                            equipmentName: item.equipmentName,
                            quantity: 1,
                            reason: item.reason,
                            isAIRecommended: false,
                          })
                        }
                        disabled={item.availableQuantity === 0}
                        className="bg-gray-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                      >
                        선택
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.equipmentId, -1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors active:scale-95"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.equipmentId, 1)}
                          disabled={quantity >= item.availableQuantity}
                          className="w-7 h-7 rounded-lg bg-gray-600 hover:bg-gray-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 네비게이션 버튼 */}
      <div className="flex gap-2 pt-4">
        <button
          onClick={handlePrev}
          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={!hasSelections}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          다음
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
