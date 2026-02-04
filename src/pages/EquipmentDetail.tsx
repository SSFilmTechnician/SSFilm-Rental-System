import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useConvexAuth } from "convex/react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
// 경로가 맞는지 확인 필요 (보통 ../../stores/useCartStore 일 수도 있음)
import { useCartStore } from "@/stores/useCartStore";

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const { isAuthenticated } = useConvexAuth();
  const addItem = useCartStore((state) => state.addItem);

  // 1. Convex로 장비 데이터 불러오기
  const equipment = useQuery(
    api.equipment.getById,
    id ? { id: id as Id<"equipment"> } : "skip"
  );

  // 2. 장바구니 담기 핸들러
  const handleAddToCart = () => {
    if (!equipment) return;

    addItem({
      equipmentId: equipment._id,
      name: equipment.name,
      // ✅ 수정: DB에 없는 .category 대신 백엔드가 만들어준 .categoryName 사용
      category: equipment.categoryName,
      quantity: quantity,
      imageUrl: equipment.imageUrl,
    });

    alert("장바구니에 담았습니다.");
  };

  if (equipment === undefined)
    return <div className="p-20 text-center animate-pulse">로딩 중...</div>;
  if (equipment === null)
    return (
      <div className="p-20 text-center">장비 정보를 찾을 수 없습니다.</div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        목록으로 돌아가기
      </button>

      <div className="flex flex-col md:flex-row gap-10">
        {/* 왼쪽: 이미지 영역 */}
        <div className="w-full md:w-1/2">
          <div className="w-full h-[300px] md:h-[400px] bg-white rounded-2xl border border-gray-200 flex items-center justify-center p-6 overflow-hidden relative shadow-sm">
            {equipment.imageUrl ? (
              <img
                src={equipment.imageUrl}
                alt={equipment.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-gray-300 font-bold text-lg">No Image</div>
            )}

            <div className="absolute top-4 left-4 bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">
              {/* ✅ 수정: category -> categoryName */}
              {equipment.categoryName}
            </div>
          </div>
        </div>

        {/* 오른쪽: 상세 정보 및 조작 */}
        <div className="w-full md:w-1/2 space-y-6">
          <div>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
              {/* ✅ 수정: category -> categoryName */}
              {equipment.categoryName}
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {equipment.name}
            </h1>
            {equipment.description && (
              <p className="text-gray-500 text-lg leading-relaxed">
                {equipment.description}
              </p>
            )}

            {equipment.manufacturer && (
              <p className="text-sm text-gray-400 mt-2">
                제조사: {equipment.manufacturer}
              </p>
            )}
          </div>

          {/* 로그인한 경우에만 장바구니 담기 섹션 표시 */}
          {isAuthenticated && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-bold text-gray-700">대여 수량</span>

                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition-colors border-r"
                  >
                    -
                  </button>
                  <div className="px-6 py-2 font-bold text-gray-900 bg-white min-w-[3rem] text-center">
                    {quantity}
                  </div>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold transition-colors border-l"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={equipment.totalQuantity === 0}
                  className={`w-full text-white text-lg py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg ${
                    equipment.totalQuantity === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-black"
                  }`}
                >
                  <ShoppingCart className="w-6 h-6" />
                  {equipment.totalQuantity === 0 ? "품절" : "장바구니 담기"}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                * 장바구니에 담은 후 예약 페이지에서 날짜를 선택합니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
