import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { CATEGORY_MAP } from "@/lib/constants";
import { useMemo } from "react"; // ★ [추가] 필터링을 위한 useMemo

// 컴포넌트 불러오기
import HeroSlider from "@/components/common/HeroSlider";
import ServiceGuide from "@/components/home/ServiceGuide";

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 파라미터에서 카테고리 읽기
  const categoryRaw = searchParams.get("category");
  const category = categoryRaw ? categoryRaw.toUpperCase() : null;
  const subCategory = searchParams.get("subCategory");

  // ★ [추가] 모든 카테고리 정보를 가져와서 "진짜 ID"를 찾을 준비
  const categories = useQuery(api.equipment.getCategories);

  // 데이터 쿼리 (기존대로 가져오되, 아래에서 ID로 한 번 더 걸러냄)
  const rawEquipmentList = useQuery(
    api.equipment.getList,
    category ? { category, subCategory: subCategory || undefined } : "skip",
  );

  // ★ [핵심 수정] 이름(String)이 같아서 발생하는 오류를 고유 ID(Object ID)로 원천 차단
  const equipmentList = useMemo(() => {
    if (!rawEquipmentList || !categories || !category) return rawEquipmentList;

    // 카테고리명 정규화 함수 (TRIPOD/GRIP ↔ TRIPOD · GRIP 호환)
    const normalizeCategory = (name: string) =>
      name.toUpperCase().replace(/[·/\s]/g, "");

    // 1. 현재 선택된 대분류의 "진짜 ID" 찾기 (조건: 이름이 같고, 부모가 없어야 함 = 대분류)
    const exactParentCat = categories.find(
      (c) => normalizeCategory(c.name) === normalizeCategory(category) && !c.parentId,
    );

    if (!exactParentCat) return []; // 대분류를 못 찾으면 빈 배열

    // 2. 이 대분류 밑에 속한 진짜 자식(소분류)들의 ID 목록 수집
    const validChildIds = categories
      .filter((c) => c.parentId === exactParentCat._id)
      .map((c) => c._id);

    // 3. 가져온 장비 리스트에서 가짜(이름만 같은 다른 카테고리)를 걸러냄
    return rawEquipmentList.filter((item) => {
      if (subCategory) {
        // 소분류가 선택된 경우: 해당 대분류 밑에 있는 그 소분류 ID와 정확히 일치해야 함
        const exactSubCat = categories.find(
          (c) =>
            c.name.toUpperCase() === subCategory.toUpperCase() &&
            c.parentId === exactParentCat._id,
        );
        return exactSubCat ? item.categoryId === exactSubCat._id : false;
      } else {
        // 소분류가 없을 때(대분류만 클릭): 대분류 ID이거나, 그 대분류의 진짜 자식 ID여야 함
        // (즉, MONITOR 밑의 ACC ID를 가진 SDI/HDMI는 대분류 ACC 화면에서 자동 탈락됨)
        return (
          item.categoryId === exactParentCat._id ||
          validChildIds.includes(item.categoryId)
        );
      }
    });
  }, [rawEquipmentList, categories, category, subCategory]);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
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
