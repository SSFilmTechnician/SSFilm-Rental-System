import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { EquipmentCard } from "../../components/equipment/EquipmentCard";

interface Equipment {
  id: string;
  name: string;
  manufacturer: string | null;
  image_url: string | null;
  available_quantity: number;
  total_quantity: number;
  status: string;
  category_id: string;
}

export default function StudentHome() {
  const [selectedManufacturer, setSelectedManufacturer] =
    useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 장비 목록 가져오기
  const {
    data: equipment,
    isLoading,
    error,
  } = useQuery<Equipment[]>({
    queryKey: ["equipment", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("equipment_masters") // ← equipment_masters (복수형)
        .select("*")
        .eq("status", "available")
        .order("name");

      // 카테고리 필터
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase 에러:", error);
        throw error;
      }

      console.log("가져온 데이터:", data); // 디버깅용
      return (data || []) as Equipment[];
    },
  });

  // 제조사 목록 추출
  const manufacturers = equipment
    ? Array.from(
        new Set(
          equipment
            .map((e) => e.manufacturer)
            .filter((m): m is string => m !== null)
        )
      )
    : [];

  // 카테고리 목록 (하드코딩)
  const categories = [
    { id: "all", name: "전체" },
    { id: "camera", name: "카메라" },
    { id: "lens", name: "렌즈" },
    { id: "lighting", name: "조명" },
    { id: "sound", name: "사운드" },
    { id: "grip", name: "그립" },
    { id: "battery", name: "배터리" },
    { id: "accessory", name: "액세서리" },
    { id: "monitor", name: "모니터" },
    { id: "wireless", name: "무선" },
    { id: "etc", name: "기타" },
  ];

  // 필터링된 장비
  const filteredEquipment =
    equipment?.filter(
      (item) =>
        selectedManufacturer === "all" ||
        item.manufacturer === selectedManufacturer
    ) || [];

  // 에러 표시
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-900 font-semibold mb-2">데이터 로딩 오류</h3>
          <p className="text-red-700 text-sm">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 카테고리 필터 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">카테고리</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 제조사 필터 */}
        {manufacturers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">제조사</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedManufacturer("all")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedManufacturer === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                전체
              </button>
              {manufacturers.map((mfr) => (
                <button
                  key={mfr}
                  onClick={() => setSelectedManufacturer(mfr)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedManufacturer === mfr
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {mfr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 정렬 옵션 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            총{" "}
            <span className="font-semibold text-gray-900">
              {filteredEquipment.length}
            </span>
            개 장비
          </p>
        </div>

        {/* 장비 그리드 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">장비 목록을 불러오는 중...</p>
            </div>
          </div>
        ) : filteredEquipment.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredEquipment.map((item) => (
              <EquipmentCard
                key={item.id}
                id={item.id}
                name={item.name}
                manufacturer={item.manufacturer}
                imageUrl={item.image_url}
                availableQuantity={item.available_quantity}
                totalQuantity={item.total_quantity}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-lg mb-2">
              선택한 조건의 장비가 없습니다.
            </p>
            <p className="text-gray-400 text-sm">
              다른 카테고리나 제조사를 선택해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
