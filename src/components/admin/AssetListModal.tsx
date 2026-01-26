import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  X,
  Plus,
  Trash2,
  Edit,
  Check,
  AlertCircle,
  History,
  Package,
  Save,
} from "lucide-react";

interface AssetListModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentId: Id<"equipment">;
}

interface Asset {
  _id: Id<"assets">;
  equipmentId: Id<"equipment">;
  serialNumber?: string;
  managementCode?: string;
  status: string;
  note?: string;
}

// 1. 대분류 정렬 순서 고정
const CATEGORY_ORDER = [
  "CAMERA",
  "LENS",
  "TRIPOD·GRIP",
  "MONITOR",
  "ACC",
  "LIGHTING",
  "AUDIO",
  "OTHERS",
];

// ★ [추가] 2. 소분류(세부 카테고리) 정렬 순서 고정
// 여기에 원하시는 세부 카테고리 이름을 순서대로 대문자로 적어주시면 됩니다.
const SUBCATEGORY_ORDER = [
  "RECORDER SET", // 오디오 세트
  "MIC", // 단품 마이크
  "ACC", // 오디오 악세사리
  // 나중에 다른 소분류(예: ARRI, RED 등)가 생기면 여기에 추가하시면 됩니다.
];

export default function AssetListModal({
  isOpen,
  onClose,
  equipmentId,
}: AssetListModalProps) {
  // Data
  const equipment = useQuery(api.equipment.getById, { id: equipmentId });
  const assets = useQuery(api.assets.getByEquipmentId, { equipmentId });
  const categories = useQuery(api.equipment.getCategories);

  // Mutations
  const createAsset = useMutation(api.assets.create);
  const createBatch = useMutation(api.assets.createBatch);
  const updateAsset = useMutation(api.assets.update);
  const deleteAsset = useMutation(api.assets.remove);
  const updateEquipment = useMutation(api.equipment.update);

  // UI State
  const [isAddMode, setIsAddMode] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [editingId, setEditingId] = useState<Id<"assets"> | null>(null);
  const [historyAssetId, setHistoryAssetId] = useState<Id<"assets"> | null>(
    null,
  );

  // Form State (Asset)
  const [serialNumber, setSerialNumber] = useState("");
  const [managementCode, setManagementCode] = useState("");
  const [status, setStatus] = useState("available");
  const [note, setNote] = useState("");
  const [batchInput, setBatchInput] = useState("");

  // 장비 카테고리 수정용 State
  const [parentCategoryId, setParentCategoryId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isCategoryModified, setIsCategoryModified] = useState(false);

  // 대분류 정렬 로직
  const parentCategories = useMemo(() => {
    const parents = categories?.filter((c) => !c.parentId) || [];
    return parents.sort((a, b) => {
      const idxA = CATEGORY_ORDER.indexOf(a.name.toUpperCase());
      const idxB = CATEGORY_ORDER.indexOf(b.name.toUpperCase());
      const finalIdxA = idxA === -1 ? 999 : idxA;
      const finalIdxB = idxB === -1 ? 999 : idxB;
      return finalIdxA - finalIdxB;
    });
  }, [categories]);

  // ★ [수정] 소분류 정렬 로직 (SUBCATEGORY_ORDER 반영)
  const childCategories = useMemo(() => {
    const children =
      categories?.filter((c) => c.parentId === parentCategoryId) || [];
    return children.sort((a, b) => {
      const idxA = SUBCATEGORY_ORDER.indexOf(a.name.toUpperCase());
      const idxB = SUBCATEGORY_ORDER.indexOf(b.name.toUpperCase());
      const finalIdxA = idxA === -1 ? 999 : idxA;
      const finalIdxB = idxB === -1 ? 999 : idxB;
      return finalIdxA - finalIdxB;
    });
  }, [categories, parentCategoryId]);

  useEffect(() => {
    if (equipment && categories) {
      const savedCatId = equipment.categoryId;
      const targetCat = categories.find((c) => c._id === savedCatId);

      if (targetCat) {
        if (targetCat.parentId) {
          setParentCategoryId(targetCat.parentId);
          setCategoryId(savedCatId);
        } else {
          setParentCategoryId(savedCatId);
          setCategoryId(savedCatId);
        }
      }
      setIsCategoryModified(false);
    }
  }, [equipment, categories]);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setParentCategoryId(pid);
    setCategoryId(pid);
    setIsCategoryModified(true);
  };

  const handleChildChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setCategoryId(cid || parentCategoryId);
    setIsCategoryModified(true);
  };

  const handleSaveCategory = async () => {
    if (!equipment) return;
    try {
      await updateEquipment({
        id: equipment._id,
        name: equipment.name,
        categoryId: categoryId as Id<"categories">,
        totalQuantity: equipment.totalQuantity,
        description: equipment.description,
        sortOrder: equipment.sortOrder,
        isGroupPrint: equipment.isGroupPrint,
        isVisible: equipment.isVisible,
      });
      setIsCategoryModified(false);
      alert("카테고리가 성공적으로 변경되었습니다.");
    } catch (e: any) {
      alert("카테고리 변경 실패: " + e.message);
    }
  };

  const resetForm = () => {
    setSerialNumber("");
    setManagementCode("");
    setStatus("available");
    setNote("");
    setBatchInput("");
    setIsAddMode(false);
    setIsBatchMode(false);
    setEditingId(null);
  };

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async () => {
    if (!serialNumber.trim()) {
      alert("시리얼 번호를 입력해주세요.");
      return;
    }
    try {
      await createAsset({
        equipmentId,
        serialNumber: serialNumber.trim(),
        managementCode: managementCode.trim() || undefined,
        status,
        note: note.trim() || undefined,
      });
      resetForm();
    } catch (e: any) {
      alert("추가 실패: " + e.message);
    }
  };

  const handleBatchAdd = async () => {
    const numbers = batchInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s);
    if (numbers.length === 0) {
      alert("번호를 입력해주세요.");
      return;
    }
    try {
      await createBatch({ equipmentId, serialNumbers: numbers });
      resetForm();
    } catch (e: any) {
      alert("일괄 추가 실패: " + e.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateAsset({
        id: editingId,
        serialNumber: serialNumber.trim() || undefined,
        managementCode: managementCode.trim() || undefined,
        status,
        note: note.trim(),
      });
      resetForm();
    } catch (e: any) {
      alert("수정 실패: " + e.message);
    }
  };

  const handleDelete = async (id: Id<"assets">) => {
    if (!confirm("정말 삭제하시겠습니까? 이력도 함께 삭제됩니다.")) return;
    try {
      await deleteAsset({ id });
    } catch (e: any) {
      alert("삭제 실패: " + e.message);
    }
  };

  const startEdit = (asset: Asset) => {
    setEditingId(asset._id);
    setSerialNumber(asset.serialNumber || "");
    setManagementCode(asset.managementCode || "");
    setStatus(asset.status);
    setNote(asset.note || "");
    setIsAddMode(false);
    setIsBatchMode(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold whitespace-nowrap">
            사용가능
          </span>
        );
      case "rented":
        return (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold whitespace-nowrap">
            대여중
          </span>
        );
      case "maintenance":
        return (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold whitespace-nowrap">
            수리중
          </span>
        );
      case "lost":
        return (
          <span className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded font-bold whitespace-nowrap">
            분실
          </span>
        );
      case "broken":
        return (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold whitespace-nowrap">
            파손
          </span>
        );
      default:
        return (
          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  if (historyAssetId) {
    return (
      <AssetHistoryModal
        assetId={historyAssetId}
        onClose={() => setHistoryAssetId(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[65vh]">
        {/* 1. Header */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
          <div className="flex-1">
            <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900">
              <Package className="w-5 h-5" />
              {equipment?.name || "Loading..."}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 2. Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:justify-between items-center gap-4 bg-white flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap bg-gray-50 px-3 py-1.5 rounded-lg border">
            <span className="text-xs font-bold text-gray-600">카테고리:</span>
            <select
              value={parentCategoryId}
              onChange={handleParentChange}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-black min-w-[100px]"
            >
              <option value="">대분류 선택</option>
              {parentCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <span className="text-gray-300">/</span>
            <select
              value={categoryId === parentCategoryId ? "" : categoryId}
              onChange={handleChildChange}
              disabled={!parentCategoryId || childCategories.length === 0}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-400 min-w-[100px]"
            >
              <option value="">소분류 없음</option>
              {childCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {isCategoryModified && (
              <button
                onClick={handleSaveCategory}
                className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded hover:bg-blue-700 shadow-sm transition-colors animate-in fade-in"
              >
                <Save className="w-3 h-3" /> 적용
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setIsAddMode(true);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${isAddMode ? "bg-black text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              <Plus className="w-4 h-4" /> 개별 추가
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsBatchMode(true);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-all ${isBatchMode ? "bg-green-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              <Plus className="w-4 h-4" /> 일괄 추가 (S/N)
            </button>
          </div>
        </div>

        {/* 3. 본문 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto bg-white min-h-0">
          {/* Add/Edit Form */}
          {(isAddMode || editingId) && (
            <div className="p-5 border-b bg-blue-50/50 animate-in slide-in-from-top-2 flex-shrink-0">
              <h4 className="font-bold text-sm mb-4 flex items-center gap-2 text-blue-900">
                {editingId ? (
                  <Edit className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingId ? "장비 정보 수정" : "새 장비 등록"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-600">
                    시리얼 번호 (S/N) *
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
                    placeholder="예: SN-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-600">
                    관리 코드 (선택)
                  </label>
                  <input
                    type="text"
                    value={managementCode}
                    onChange={(e) => setManagementCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
                    placeholder="예: CAM-A-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-600">
                    현재 상태
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
                  >
                    <option value="available">사용가능</option>
                    <option value="rented">대여중</option>
                    <option value="maintenance">수리중</option>
                    <option value="lost">분실</option>
                    <option value="broken">파손</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-600">
                    메모 (특이사항)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white shadow-sm"
                    placeholder="예: 렌즈 캡 분실"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white bg-gray-50 text-gray-700"
                >
                  취소
                </button>
                <button
                  onClick={editingId ? handleUpdate : handleAdd}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />{" "}
                  {editingId ? "수정 완료" : "등록 완료"}
                </button>
              </div>
            </div>
          )}

          {/* Batch Add Form */}
          {isBatchMode && (
            <div className="p-5 border-b bg-green-50/50 animate-in slide-in-from-top-2 flex-shrink-0">
              <h4 className="font-bold text-sm mb-2 text-green-900">
                시리얼 번호 일괄 등록
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                여러 개의 시리얼 번호를 복사해서 붙여넣으세요. (엔터, 쉼표,
                띄어쓰기로 구분)
              </p>
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none h-32 bg-white font-mono"
                placeholder="SN001&#10;SN002&#10;SN003"
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white bg-gray-50 text-gray-700"
                >
                  취소
                </button>
                <button
                  onClick={handleBatchAdd}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" /> 일괄 등록
                </button>
              </div>
            </div>
          )}

          {/* Asset List Table */}
          {!assets || assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">
                등록된 장비가 없습니다.
              </p>
              <p className="text-sm">상단의 추가 버튼을 눌러 등록해주세요.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <tr>
                  <th className="py-3 px-4 font-bold text-gray-500 w-[140px] whitespace-nowrap">
                    시리얼 번호
                  </th>
                  <th className="py-3 px-4 font-bold text-gray-500 w-[120px] whitespace-nowrap">
                    관리코드
                  </th>
                  <th className="py-3 px-4 font-bold text-gray-500 text-center w-[100px] whitespace-nowrap">
                    상태
                  </th>
                  <th className="py-3 px-4 font-bold text-gray-500 w-auto whitespace-nowrap">
                    메모
                  </th>
                  <th className="py-3 px-4 font-bold text-gray-500 text-center w-[120px] whitespace-nowrap">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map((asset) => (
                  <tr
                    key={asset._id}
                    className="hover:bg-gray-50 group transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-gray-700 truncate">
                      {asset.serialNumber || (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500 truncate">
                      {asset.managementCode || (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(asset.status)}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 truncate max-w-[200px]">
                      {asset.note ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span className="truncate" title={asset.note}>
                            {asset.note}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setHistoryAssetId(asset._id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          title="이력"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(asset)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset._id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
          <div className="text-xs text-gray-500 flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
              사용가능
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 대여중
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>{" "}
              수리/파손
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 text-gray-700 shadow-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// 이력 조회 서브 모달 (기존 코드 유지)
function AssetHistoryModal({
  assetId,
  onClose,
}: {
  assetId: Id<"assets">;
  onClose: () => void;
}) {
  const asset = useQuery(api.assets.getById, { id: assetId });
  const history = useQuery(api.assets.getHistory, { assetId });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <History className="w-5 h-5" /> 대여/반납 이력
            </h3>
            <p className="text-sm text-gray-500">
              {asset?.equipmentName} ({asset?.serialNumber})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {!history || history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>기록된 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pl-6 py-2">
              {history.map((h) => (
                <div key={h._id} className="relative">
                  <span
                    className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                      h.action === "rented"
                        ? "bg-blue-500"
                        : h.action === "returned"
                          ? "bg-green-500"
                          : "bg-gray-400"
                    }`}
                  ></span>
                  <div className="bg-white p-3 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-sm font-bold ${
                          h.action === "rented"
                            ? "text-blue-600"
                            : h.action === "returned"
                              ? "text-green-600"
                              : "text-gray-600"
                        }`}
                      >
                        {h.action === "rented"
                          ? "대여"
                          : h.action === "returned"
                            ? "반납"
                            : h.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(h.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{h.userName}</p>
                    {h.returnNotes && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                        {h.returnNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
