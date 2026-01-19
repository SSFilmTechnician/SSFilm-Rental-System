import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";

interface EquipmentCardProps {
  id: string;
  name: string;
  manufacturer: string | null;
  subCategory?: string;
  imageUrl: string | null;
  availableQuantity: number;
  totalQuantity: number;
}

export function EquipmentCard({
  id,
  name,
  manufacturer,
  subCategory,
  imageUrl,
  availableQuantity,
}: EquipmentCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/equipment/${id}`)}
      className="group relative flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300 h-full"
    >
      {/* 1. 이미지 영역 (높이 h-64 고정) */}
      <div className="relative w-full h-64 bg-white border-b border-gray-50 flex items-center justify-center p-6">
        {/* 왼쪽 상단 뱃지 */}
        {subCategory && (
          <span className="absolute top-3 left-3 z-10 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wide rounded-sm shadow-sm">
            {subCategory}
          </span>
        )}

        {/* 품절 뱃지 */}
        {availableQuantity === 0 && (
          <div className="absolute top-3 right-3 z-10">
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase">
              Sold Out
            </span>
          </div>
        )}

        {/* 이미지 */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className={`max-w-full max-h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${
              availableQuantity === 0 ? "opacity-50 grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-300">
            <Camera className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xs font-bold">No Image</span>
          </div>
        )}
      </div>

      {/* 2. 텍스트 정보 영역 */}
      <div className="p-5 flex flex-col justify-between flex-grow bg-white">
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2 mb-1">
            {name}
          </h3>

          {/* ✅ [수정] 제조사가 없어도 공간 차지 (투명 처리) */}
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              manufacturer ? "text-gray-400" : "invisible"
            }`}
          >
            {/* 데이터가 없으면 공백 문자(\u00A0)를 넣어 높이를 유지시킴 */}
            {manufacturer || "\u00A0"}
          </p>
        </div>
      </div>
    </div>
  );
}
