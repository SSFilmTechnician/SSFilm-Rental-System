import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editingId: Id<"equipment"> | null;
}

export default function EquipmentModal({ isOpen, onClose, editingId }: Props) {
  const categories = useQuery(api.equipment.getCategories);
  const equipment = useQuery(
    api.equipment.getById,
    editingId ? { id: editingId } : "skip",
  );
  const createEquipment = useMutation(api.equipment.create);
  const updateEquipment = useMutation(api.equipment.update);

  const [name, setName] = useState("");
  // ★ [수정] 대분류와 최종 카테고리 ID를 분리해서 관리
  const [parentCategoryId, setParentCategoryId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [totalQuantity, setTotalQuantity] = useState(1);
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(999);
  const [isGroupPrint, setIsGroupPrint] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // ★ [추가] 부모 카테고리 목록만 필터링 (parentId가 없는 것들)
  const parentCategories = useMemo(() => {
    return categories?.filter((c) => !c.parentId) || [];
  }, [categories]);

  // ★ [추가] 선택된 부모에 속한 자식 카테고리만 필터링
  const childCategories = useMemo(() => {
    return categories?.filter((c) => c.parentId === parentCategoryId) || [];
  }, [categories, parentCategoryId]);

  useEffect(() => {
    if (editingId && equipment && categories) {
      setName(equipment.name);
      setTotalQuantity(equipment.totalQuantity);
      setDescription(equipment.description || "");
      setSortOrder(equipment.sortOrder || 999);
      setIsGroupPrint(equipment.isGroupPrint || false);
      setIsVisible(equipment.isVisible ?? true);

      // ★ [핵심 로직] 저장된 카테고리가 대분류인지 소분류인지 판별하여 드롭다운 세팅
      const savedCatId = equipment.categoryId;
      const targetCat = categories.find((c) => c._id === savedCatId);

      if (targetCat?.parentId) {
        // 소분류인 경우: 대분류는 부모로, 최종 ID는 소분류로
        setParentCategoryId(targetCat.parentId);
        setCategoryId(savedCatId);
      } else {
        // 대분류인 경우: 둘 다 해당 ID로 설정
        setParentCategoryId(savedCatId);
        setCategoryId(savedCatId);
      }
    } else if (!editingId) {
      setName("");
      setParentCategoryId("");
      setCategoryId("");
      setTotalQuantity(1);
      setDescription("");
      setSortOrder(999);
      setIsGroupPrint(false);
      setIsVisible(true);
    }
  }, [editingId, equipment, categories]);

  // ★ [추가] 대분류 변경 핸들러
  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setParentCategoryId(pid);
    setCategoryId(pid); // 대분류를 바꾸면 일단 최종 ID도 대분류로 초기화
  };

  // ★ [추가] 소분류 변경 핸들러
  const handleChildChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    if (cid) {
      setCategoryId(cid); // 소분류를 선택하면 최종 ID는 소분류
    } else {
      setCategoryId(parentCategoryId); // '선택안함'이면 대분류 ID로 복귀
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      alert("장비명과 카테고리를 입력해주세요.");
      return;
    }

    try {
      if (editingId) {
        await updateEquipment({
          id: editingId,
          name: name.trim(),
          categoryId: categoryId as Id<"categories">,
          totalQuantity,
          description: description.trim() || undefined,
          sortOrder,
          isGroupPrint,
          isVisible,
        });
      } else {
        await createEquipment({
          name: name.trim(),
          categoryId: categoryId as Id<"categories">,
          totalQuantity,
          description: description.trim() || undefined,
          sortOrder,
          isGroupPrint,
          isVisible,
        });
      }
      onClose();
    } catch (err) {
      const error = err as Error;
      alert("저장 실패: " + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">
            {editingId ? "장비 수정" : "새 장비 추가"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">장비명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="예: ALEXA Mini LF"
            />
          </div>

          {/* ★ [수정] 2단계 카테고리 선택 영역 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1">대분류 *</label>
              <select
                value={parentCategoryId}
                onChange={handleParentChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">대분류 선택...</option>
                {parentCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">
                소분류 (선택사항)
              </label>
              <select
                value={categoryId === parentCategoryId ? "" : categoryId}
                onChange={handleChildChange}
                disabled={!parentCategoryId || childCategories.length === 0}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">기본 (소분류 없음)</option>
                {childCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">총 재고 수량</label>
            <input
              type="number"
              min={1}
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(parseInt(e.target.value) || 1)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black resize-none h-20"
              placeholder="장비 설명 (선택사항)"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">정렬 순서</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 999)}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-xs text-gray-500 mt-1">
              숫자가 작을수록 위에 표시됩니다
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isGroupPrint"
              checked={isGroupPrint}
              onChange={(e) => setIsGroupPrint(e.target.checked)}
              className="w-4 h-4 text-black focus:ring-black rounded"
            />
            <label htmlFor="isGroupPrint" className="text-sm cursor-pointer">
              그룹 인쇄 (개별 번호 표시 안함)
            </label>
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <input
              type="checkbox"
              id="isVisible"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-black border-gray-300 focus:ring-black rounded cursor-pointer"
            />
            <div>
              <label
                htmlFor="isVisible"
                className="text-sm font-bold cursor-pointer"
              >
                학생 대여 목록에 노출
              </label>
              <p className="text-xs text-gray-500 mt-1">
                체크 해제 시 관리자 목록에만 보입니다. (예: 믹스프리 본체, 라인
                등 세트 부속품)
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              {editingId ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
