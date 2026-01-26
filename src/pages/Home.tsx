import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { CATEGORY_MAP } from "@/lib/constants";

// 컴포넌트 불러오기
import HeroSlider from "@/components/common/HeroSlider";
import ServiceGuide from "@/components/home/ServiceGuide";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 파라미터에서 카테고리 읽기
  const categoryRaw = searchParams.get("category");
  const category = categoryRaw ? categoryRaw.toUpperCase() : null;
  const subCategory = searchParams.get("subCategory");

  // 데이터 쿼리
  const equipmentList = useQuery(
    api.equipment.getList,
    category ? { category, subCategory: subCategory || undefined } : "skip",
  );

  // 소분류(SubCategory) 필터링 핸들러
  const handleSubClick = (sub: string) => {
    if (!category) return;
    if (subCategory === sub) {
      setSearchParams({ category });
    } else {
      setSearchParams({ category, subCategory: sub });
    }
  };

  // ------------------------------------------------------------------
  // 1. [메인 화면] 카테고리가 선택되지 않았을 때
  // ------------------------------------------------------------------
  if (!category) {
    return (
      <div className="min-h-screen pb-20 flex flex-col">
        {/* 메인 슬라이더 */}
        <HeroSlider />
        {/* 이용 안내 가이드 */}
        <ServiceGuide />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 2. [로딩 화면] 카테고리는 선택됐는데, 데이터가 아직 도착하지 않았을 때
  //    ✅ 여기서 미리 return을 해버려서 제목이나 버튼이 아예 안 보이게 합니다.
  // ------------------------------------------------------------------
  if (equipmentList === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-4"></div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // 3. [데이터 로드 완료] 장비 리스트 화면
  //    (이제 equipmentList가 확실히 있는 상태에서만 화면을 그립니다)
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn flex-grow w-full">
        {/* 대분류 제목 */}
        <div className="flex justify-between items-end mb-6 border-b pb-4 border-gray-200">
          <h1 className="text-3xl font-black uppercase tracking-tight text-gray-900">
            {category === "TRIPOD/GRIP" ? "TRIPOD · GRIP" : category}
          </h1>
          <span className="text-sm text-gray-500 font-medium">
            Total {equipmentList.length} items
          </span>
        </div>

        {/* 소분류(Sub Category) 탭 */}
        {CATEGORY_MAP[category] && CATEGORY_MAP[category].length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORY_MAP[category].map((sub) => (
              <button
                key={sub}
                onClick={() => handleSubClick(sub)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  subCategory === sub
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-black"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* 장비 리스트 그리드 */}
        {equipmentList.length === 0 ? (
          <div className="text-center py-32 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 font-bold text-lg">
              등록된 장비가 없습니다.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              다른 카테고리를 선택해주세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {equipmentList.map((item) => (
              <EquipmentCard
                key={item._id}
                id={item._id}
                name={item.name}
                manufacturer={item.manufacturer || null}
                imageUrl={item.imageUrl || null}
                subCategory={subCategory || undefined}
                availableQuantity={item.totalQuantity}
                totalQuantity={item.totalQuantity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
