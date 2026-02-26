import { useAIWizard } from "../AIWizardProvider";
import { ChevronLeft, CheckCircle2, ShoppingCart, Calendar, Users, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EquipmentSelection } from "../types";

export default function StepSummary() {
  const { state, dispatch } = useAIWizard();
  const navigate = useNavigate();

  // 모든 선택된 장비 수집
  const allSelections: Array<{ category: string; items: EquipmentSelection[] }> = [
    { category: "카메라", items: state.selections.camera.filter((item) => item.quantity > 0) },
    { category: "렌즈", items: state.selections.lens.filter((item) => item.quantity > 0) },
    { category: "트라이포드/그립", items: state.selections.tripodGrip.filter((item) => item.quantity > 0) },
    { category: "모니터/무선", items: state.selections.monitor.filter((item) => item.quantity > 0) },
    { category: "조명", items: state.selections.lighting.filter((item) => item.quantity > 0) },
    { category: "스탠드", items: state.selections.stand.filter((item) => item.quantity > 0) },
    { category: "악세서리", items: state.selections.accessory.filter((item) => item.quantity > 0) },
  ].filter((category) => category.items.length > 0);

  // 총 장비 수
  const totalItems = allSelections.reduce(
    (sum, category) => sum + category.items.reduce((catSum, item) => catSum + item.quantity, 0),
    0
  );

  // AI 추천 장비 수
  const aiRecommendedCount = allSelections.reduce(
    (sum, category) =>
      sum + category.items.filter((item) => item.isAIRecommended).reduce((catSum, item) => catSum + item.quantity, 0),
    0
  );

  const handlePrev = () => {
    dispatch({ type: "PREV_STEP" });
  };

  const handleAddToCart = () => {
    // TODO: 실제 장바구니 연동
    // 여기서는 일단 로컬스토리지나 전역 상태에 저장하고
    // 예약 페이지로 이동하는 로직 구현

    // 임시: 콘솔에 출력
    console.log("장바구니에 담을 장비:", {
      date: state.basicInfo.date,
      crewSize: state.basicInfo.crewSize,
      selections: allSelections,
    });

    alert("장비가 장바구니에 담겼습니다!");

    // 위자드 닫기 및 예약 페이지로 이동
    dispatch({ type: "RESET" });
    navigate("/reservation");
  };

  const handleReset = () => {
    if (confirm("선택한 모든 장비를 초기화하시겠습니까?")) {
      dispatch({ type: "RESET" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 성공 메시지 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-green-900 mb-1">장비 추천 완료!</h3>
            <p className="text-sm text-green-800 leading-relaxed">
              AI가 추천한 <strong>{aiRecommendedCount}개</strong>를 포함해 총{" "}
              <strong>{totalItems}개</strong>의 장비를 선택하셨습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 기본 정보 요약 */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="font-medium">예약 날짜:</span>
          <span className="font-bold">{state.basicInfo.date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="font-medium">촬영조명팀 인원:</span>
          <span className="font-bold">{state.basicInfo.crewSize}명</span>
        </div>
      </div>

      {/* 선택된 장비 목록 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-700">선택한 장비</h3>

        {allSelections.map((category) => (
          <div key={category.category} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* 카테고리 헤더 */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-900">{category.category}</h4>
            </div>

            {/* 장비 목록 */}
            <div className="divide-y divide-gray-100">
              {category.items.map((item) => (
                <div key={item.equipmentId} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{item.equipmentName}</span>
                        {item.isAIRecommended && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                            <Sparkles className="w-3 h-3" />
                            AI 추천
                          </span>
                        )}
                      </div>
                      {item.reason && (
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{item.reason}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 bg-blue-100 text-blue-900 text-sm font-bold rounded-lg">
                        ×{item.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 총계 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">총 장비 수량</span>
          <span className="text-2xl font-bold text-blue-900">{totalItems}개</span>
        </div>
      </div>

      {/* 네비게이션 버튼 */}
      <div className="space-y-2 pt-4">
        {/* 장바구니에 담기 */}
        <button
          onClick={handleAddToCart}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95"
        >
          <ShoppingCart className="w-5 h-5" />
          장바구니에 담기
        </button>

        {/* 하단 버튼들 */}
        <div className="flex gap-2">
          <button
            onClick={handlePrev}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
            이전
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-white text-gray-600 py-3 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
          >
            처음부터
          </button>
        </div>
      </div>
    </div>
  );
}
