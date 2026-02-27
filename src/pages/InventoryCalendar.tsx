import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Search, PackageSearch } from "lucide-react";
import { CATEGORY_ORDER } from "@/lib/constants";
import EquipmentAvailabilityCalendar from "@/components/equipment/EquipmentAvailabilityCalendar";

// DB 카테고리명과 CATEGORY_ORDER 키를 매칭하기 위한 정규화
function normalize(str: string) {
  return str.toLowerCase().trim().replace(/[\s·\-·]+/g, "");
}

export default function InventoryCalendar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedEquipmentId, setSelectedEquipmentId] =
    useState<Id<"equipment"> | null>(null);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState("");

  // 모든 장비 목록 불러오기 (categoryName 포함)
  const equipmentList = useQuery(api.equipment.getList, {});

  // 검색 + 카테고리 필터링
  const filtered = useMemo(() => {
    if (!equipmentList) return [];
    return equipmentList.filter((eq) => {
      const matchesSearch =
        !searchQuery ||
        eq.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        normalize(eq.categoryName) === normalize(selectedCategory) ||
        normalize(eq.parentCategoryName) === normalize(selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [equipmentList, searchQuery, selectedCategory]);

  const handleSelectEquipment = (id: Id<"equipment">, name: string) => {
    setSelectedEquipmentId(id);
    setSelectedEquipmentName(name);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 페이지 타이틀 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">실시간 장비 현황</h1>
        <p className="text-sm text-gray-500 mt-1">
          장비를 선택하면 날짜별 잔여 재고를 확인할 수 있습니다.
        </p>
      </div>

      {/* 검색 + 카테고리 필터 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 space-y-3 shadow-sm">
        {/* 검색창 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="장비명으로 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow"
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-nowrap sm:flex-wrap gap-2 overflow-x-auto pb-2 -mb-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !selectedCategory
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? "" : cat)
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCategory === cat
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 콘텐츠: 장비 목록 + 캘린더 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 장비 목록 (왼쪽) - 모바일: 가로 스크롤, 데스크톱: 세로 리스트 */}
        <div className="lg:col-span-2">
          {/* 모바일: 가로 스크롤 칩 리스트 */}
          <div className="lg:hidden">
            {equipmentList === undefined && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-40 bg-gray-100 rounded-xl animate-pulse flex-shrink-0"
                  />
                ))}
              </div>
            )}

            {equipmentList !== undefined && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <PackageSearch className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">검색 결과가 없습니다.</p>
                {(searchQuery || selectedCategory) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("");
                    }}
                    className="mt-2 text-xs text-blue-500 hover:underline"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}

            {equipmentList !== undefined && filtered.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                {filtered.map((eq) => {
                  const isSelected = selectedEquipmentId === eq._id;
                  return (
                    <button
                      key={eq._id}
                      onClick={() => handleSelectEquipment(eq._id, eq.name)}
                      className={[
                        "flex-shrink-0 px-4 py-3 rounded-xl border transition-all duration-150 min-w-[160px]",
                        isSelected
                          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm",
                      ].join(" ")}
                    >
                      <p
                        className={`font-semibold text-sm truncate ${
                          isSelected ? "text-blue-800" : "text-gray-900"
                        }`}
                      >
                        {eq.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        총 {eq.totalQuantity}대
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 데스크톱: 세로 리스트 */}
          <div className="hidden lg:block space-y-2">
            {equipmentList === undefined && (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[60px] bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {equipmentList !== undefined && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                <PackageSearch className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">검색 결과가 없습니다.</p>
                {(searchQuery || selectedCategory) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("");
                    }}
                    className="mt-2 text-xs text-blue-500 hover:underline"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}

            {filtered.map((eq) => {
              const isSelected = selectedEquipmentId === eq._id;
              return (
                <button
                  key={eq._id}
                  onClick={() => handleSelectEquipment(eq._id, eq.name)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-xl border transition-all duration-150",
                    isSelected
                      ? "border-blue-400 bg-blue-50 ring-2 ring-blue-200 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-sm truncate ${
                          isSelected ? "text-blue-800" : "text-gray-900"
                        }`}
                      >
                        {eq.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {eq.parentCategoryName
                          ? `${eq.parentCategoryName} · ${eq.categoryName}`
                          : eq.categoryName}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      총 {eq.totalQuantity}대
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 캘린더 (오른쪽) - 데스크톱: 우측 표시, 모바일: 바텀시트 */}
        <div className="lg:col-span-3">
          {selectedEquipmentId ? (
            <>
              {/* 데스크톱 캘린더 (lg 이상에서만 표시) */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 p-5 shadow-sm sticky top-24">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      {selectedEquipmentName}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      날짜를 클릭하면 예약 현황을 확인할 수 있습니다.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEquipmentId(null);
                      setSelectedEquipmentName("");
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    닫기
                  </button>
                </div>
                <EquipmentAvailabilityCalendar
                  equipmentId={selectedEquipmentId}
                />
              </div>

              {/* 모바일 바텀시트 (lg 미만에서만 표시) */}
              <div className="lg:hidden fixed inset-0 bg-black/50 z-50 flex items-end animate-fadeIn">
                <div className="bg-white rounded-t-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-slideUp">
                  {/* 헤더 */}
                  <div className="flex-shrink-0 p-5 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-gray-900 text-lg truncate">
                          {selectedEquipmentName}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">
                          날짜를 클릭하면 예약 현황을 확인할 수 있습니다.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedEquipmentId(null);
                          setSelectedEquipmentName("");
                        }}
                        className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                  {/* 캘린더 콘텐츠 */}
                  <div className="flex-1 overflow-y-auto p-4">
                    <EquipmentAvailabilityCalendar
                      equipmentId={selectedEquipmentId}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden lg:flex bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 flex-col items-center justify-center text-center min-h-[320px]">
              <PackageSearch className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-400">
                왼쪽에서 장비를 선택하면
                <br />
                날짜별 재고 현황을 확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
