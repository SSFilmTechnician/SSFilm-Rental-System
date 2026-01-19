import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { CATEGORY_MAP } from "@/lib/constants";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. URL 파라미터 가져오기
  // 대분류는 대문자로 통일 (CAMERA, LENS 등)
  const categoryRaw = searchParams.get("category");
  const category = categoryRaw ? categoryRaw.toUpperCase() : null;

  // ✅ [수정] 소분류는 대문자로 강제 변환하지 않고 그대로 사용
  // (이유: 'Adapter' 처럼 소문자가 섞인 카테고리도 인식하기 위함)
  const subCategory = searchParams.get("subCategory");

  // 2. Convex 데이터 쿼리
  const equipmentList = useQuery(
    api.equipment.getList,
    category ? { category, subCategory: subCategory || undefined } : "skip"
  );

  // ✅ 토글 핸들러: 이미 선택된 버튼을 누르면 전체보기로 돌아감
  const handleSubClick = (sub: string) => {
    if (!category) return;

    if (subCategory === sub) {
      // 이미 선택된 걸 누르면 -> 필터 해제 (전체보기 상태로)
      setSearchParams({ category });
    } else {
      // 선택 안 된 걸 누르면 -> 해당 소분류 필터링
      setSearchParams({ category, subCategory: sub });
    }
  };

  // [화면 1] 카테고리 없음
  if (!category) {
    return (
      <div className="w-full min-h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-gray-50">
        <div className="max-w-4xl w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center shadow-sm">
          <span className="text-gray-400 text-lg">메인 배너 이미지 영역</span>
        </div>
      </div>
    );
  }

  // [화면 2] 카테고리 선택됨
  const subCategories = CATEGORY_MAP[category] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 대분류 제목 */}
      <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900 mb-6">
        {category}
      </h1>

      {/* ✅ 소분류 탭 버튼 (ALL 버튼 없음) */}
      {subCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
          {subCategories.map((sub) => (
            <button
              key={sub}
              onClick={() => handleSubClick(sub)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                // 버튼 이름(Adapter)과 현재 선택된 값(Adapter)이 정확히 같을 때만 검은색
                subCategory === sub
                  ? "bg-black text-white border-black shadow-md" // 선택됨
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-black" // 선택 안됨
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* 장비 리스트 영역 */}
      {equipmentList === undefined ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : equipmentList.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl">
          <p className="text-gray-500">
            등록된 장비가 없습니다.
            <br />
            <span className="text-xs text-gray-400">
              (DB 데이터와 카테고리 이름이 일치하는지 확인해주세요)
            </span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {equipmentList.map((item) => (
            <EquipmentCard
              key={item._id}
              id={item._id}
              name={item.name}
              manufacturer={item.manufacturer || null}
              imageUrl={item.imageUrl || null}
              // 뱃지도 대소문자 그대로 전달
              subCategory={subCategory || undefined}
              availableQuantity={item.totalQuantity}
              totalQuantity={item.totalQuantity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
