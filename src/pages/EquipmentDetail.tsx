import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useConvexAuth } from "convex/react";
import { ArrowLeft, ShoppingCart, Info, CalendarDays } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCartStore } from "@/stores/useCartStore";
import EquipmentAvailabilityCalendar from "@/components/equipment/EquipmentAvailabilityCalendar";

type Tab = "info" | "inventory";

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { isAuthenticated } = useConvexAuth();
  const addItem = useCartStore((state) => state.addItem);

  const equipment = useQuery(
    api.equipment.getById,
    id ? { id: id as Id<"equipment"> } : "skip"
  );

  const handleAddToCart = () => {
    if (!equipment) return;
    addItem({
      equipmentId: equipment._id,
      name: equipment.name,
      category: equipment.categoryName,
      quantity: quantity,
      imageUrl: equipment.imageUrl,
    });
    alert("장비리스트에 담았습니다.");
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
              {equipment.categoryName}
            </div>
          </div>
        </div>

        {/* 오른쪽: 상세 정보 및 조작 */}
        <div className="w-full md:w-1/2 space-y-5">
          {/* 장비 기본 정보 */}
          <div>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3">
              {equipment.categoryName}
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {equipment.name}
            </h1>
            {equipment.manufacturer && (
              <p className="text-sm text-gray-400">
                제조사: {equipment.manufacturer}
              </p>
            )}
          </div>

          {/* 탭 UI */}
          <div className="border-b border-gray-200">
            <div className="flex gap-0">
              {[
                { key: "info" as Tab, label: "장비 정보", icon: Info },
                {
                  key: "inventory" as Tab,
                  label: "재고 현황",
                  icon: CalendarDays,
                },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={[
                    "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
                    activeTab === key
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-400 hover:text-gray-600",
                  ].join(" ")}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="min-h-[180px]">
            {activeTab === "info" && (
              <div className="animate-fadeIn">
                {equipment.description ? (
                  <p className="text-gray-500 text-base leading-relaxed">
                    {equipment.description}
                  </p>
                ) : (
                  <p className="text-gray-300 text-sm italic">
                    상세 설명이 없습니다.
                  </p>
                )}
              </div>
            )}

            {activeTab === "inventory" && (
              <div className="animate-fadeIn">
                <EquipmentAvailabilityCalendar
                  equipmentId={equipment._id}
                  compact
                />
              </div>
            )}
          </div>

          {/* 장비리스트 담기 (로그인 시에만) */}
          {isAuthenticated && (
            <div className="border-t border-gray-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-700">
                  대여 수량
                </span>

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
                    onClick={() =>
                      setQuantity(
                        Math.min(equipment.totalQuantity, quantity + 1)
                      )
                    }
                    disabled={quantity >= equipment.totalQuantity}
                    className={`px-4 py-2 font-bold transition-colors border-l ${
                      quantity >= equipment.totalQuantity
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 최대 수량 안내 */}
              <div className="text-right mb-5">
                <span className="text-xs text-gray-500">
                  최대 보유 수량: {equipment.totalQuantity}개
                  {quantity >= equipment.totalQuantity && (
                    <span className="text-orange-600 font-bold ml-2">
                      (최대)
                    </span>
                  )}
                </span>
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
                  {equipment.totalQuantity === 0 ? "품절" : "장비리스트 담기"}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400 mt-4">
                * 장비리스트에 담은 후 예약 페이지에서 날짜를 선택합니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
