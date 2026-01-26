import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
// ★ [수정] Eye 아이콘 추가 임포트
import {
  Plus,
  Trash2,
  Edit,
  Search,
  ChevronRight,
  EyeOff,
  Eye,
} from "lucide-react";
import EquipmentModal from "../../components/admin/EquipmentModal";
import AssetListModal from "../../components/admin/AssetListModal";

const ORDERED_CATEGORIES = [
  "Camera",
  "Lens",
  "Tripod·Grip",
  "Monitor",
  "ACC",
  "Lighting",
  "Audio",
  "Others",
];

export default function AssetManagement() {
  const allEquipment = useQuery(api.equipment.getAll);
  const allCategories = useQuery(api.equipment.getCategories);
  const deleteEquipment = useMutation(api.equipment.remove);

  // ★ [추가] 노출 상태 토글을 위한 뮤테이션
  const toggleVisibility = useMutation(api.equipment.toggleVisibility);

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"equipment"> | null>(null);
  const [assetListModalOpen, setAssetListModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] =
    useState<Id<"equipment"> | null>(null);

  const processedEquipment = useMemo(() => {
    if (!allEquipment) return [];

    const catMap = new Map<
      string,
      { _id: string; name: string; parentId?: string }
    >();
    if (allCategories) {
      allCategories.forEach((c) => catMap.set(c._id, c as any));
    }

    const getFinalCategoryName = (categoryId: string): string => {
      const category = catMap.get(categoryId);
      if (!category) return "Others";

      let rawName = category.name;
      if (category.parentId) {
        const parent = catMap.get(category.parentId);
        if (parent) rawName = parent.name;
      }

      const upperName = rawName.toUpperCase();

      if (upperName.includes("TRIPOD") || upperName.includes("GRIP"))
        return "Tripod·Grip";
      if (upperName === "CAMERA") return "Camera";
      if (upperName === "LENS") return "Lens";
      if (upperName === "MONITOR") return "Monitor";
      if (upperName === "ACC") return "ACC";
      if (upperName === "LIGHTING") return "Lighting";
      if (upperName === "AUDIO") return "Audio";

      return "Others";
    };

    return allEquipment.map((eq) => ({
      ...eq,
      category: getFinalCategoryName(eq.categoryId),
    }));
  }, [allEquipment, allCategories]);

  if (!allEquipment || !allCategories) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const sortedEquipmentList = [...processedEquipment].sort((a, b) => {
    const idxA = ORDERED_CATEGORIES.indexOf(a.category);
    const idxB = ORDERED_CATEGORIES.indexOf(b.category);

    if (idxA !== idxB) return idxA - idxB;
    return a.name.localeCompare(b.name);
  });

  const filteredEquipment = sortedEquipmentList.filter((item) => {
    const matchesCategory =
      activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const displayCategories = ["All", ...ORDERED_CATEGORIES];

  const handleDelete = async (id: Id<"equipment">) => {
    if (
      confirm(
        "정말 이 장비를 삭제하시겠습니까? 연결된 개별 장비 정보도 모두 삭제됩니다.",
      )
    ) {
      try {
        await deleteEquipment({ id });
      } catch (e: any) {
        alert("삭제 실패: " + e.message);
      }
    }
  };

  const openAssetList = (id: Id<"equipment">) => {
    setSelectedEquipmentId(id);
    setAssetListModalOpen(true);
  };

  // ★ [추가] 상태 변경 핸들러 함수
  const handleToggleVisibility = async (
    id: Id<"equipment">,
    currentIsVisible: boolean | undefined,
  ) => {
    try {
      // currentIsVisible이 undefined인 경우 기본값인 true로 간주하고 false로 변경
      const targetState = currentIsVisible === false ? true : false;
      await toggleVisibility({ id, isVisible: targetState });
    } catch (e: any) {
      alert("상태 변경 실패: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 툴바 */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {/* 카테고리 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x">
          {displayCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border ${
                activeCategory === cat
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-black"
              }`}
            >
              {cat === "All" ? "All" : cat}
            </button>
          ))}
        </div>

        {/* 검색 및 추가 버튼 */}
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-3 py-2 text-base md:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50 focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold whitespace-nowrap hover:bg-black transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add New
          </button>
        </div>
      </div>

      {/* 리스트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <p className="text-gray-400 text-lg">No equipment found.</p>
          </div>
        ) : (
          filteredEquipment.map((item) => (
            <div
              key={item._id}
              className={`rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group ${
                item.isVisible === false ? "bg-gray-50/80" : "bg-white"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-1.5 items-center flex-wrap">
                    {/* 카테고리 태그 */}
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
                      {item.category}
                    </span>

                    {/* ★ [수정] 단순 뱃지를 클릭 가능한 토글 버튼으로 변경 */}
                    <button
                      onClick={() =>
                        handleToggleVisibility(item._id, item.isVisible)
                      }
                      className={`text-[11px] font-bold px-2 py-1 rounded border flex items-center gap-1 shadow-sm transition-all active:scale-95 ${
                        item.isVisible === false
                          ? "text-red-600 bg-red-50 border-red-100 hover:bg-red-100"
                          : "text-green-700 bg-green-50 border-green-100 hover:bg-green-100"
                      }`}
                      title="클릭하여 노출 상태 변경"
                    >
                      {item.isVisible === false ? (
                        <>
                          <EyeOff className="w-3 h-3" /> 장비 숨김
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> 장비 노출
                        </>
                      )}
                    </button>
                  </div>

                  {/* 수정/삭제 버튼 */}
                  <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(item._id);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-900 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3
                  className={`font-bold text-lg mb-1 line-clamp-2 ${item.isVisible === false ? "text-gray-600" : "text-gray-900"}`}
                >
                  {item.name}
                </h3>
              </div>

              <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-4">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wider">
                    Total
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {item.totalQuantity}
                  </p>
                </div>
                {/* 개별 관리 버튼 */}
                <button
                  onClick={() => openAssetList(item._id)}
                  className="text-sm font-bold text-gray-700 hover:text-black flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                >
                  Manage <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && (
        <EquipmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editingId={editingId}
        />
      )}

      {selectedEquipmentId && (
        <AssetListModal
          isOpen={assetListModalOpen}
          onClose={() => setAssetListModalOpen(false)}
          equipmentId={selectedEquipmentId}
        />
      )}
    </div>
  );
}
