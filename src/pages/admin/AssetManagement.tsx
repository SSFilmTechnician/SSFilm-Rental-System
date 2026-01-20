import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Plus,
  Save,
  Trash2,
  Edit,
  X,
  ChevronDown,
  ChevronRight,
  History,
  Package,
  Wrench,
  CheckCircle,
} from "lucide-react";

interface AssetData {
  _id: Id<"assets">;
  equipmentId: Id<"equipment">;
  serialNumber?: string;
  managementCode?: string;
  status: string;
  note?: string;
  equipmentName?: string;
}

interface EquipmentWithAssets {
  _id: Id<"equipment">;
  name: string;
  totalQuantity: number;
  assets: AssetData[];
}

export default function AssetManagement() {
  const allEquipment = useQuery(api.equipment.getAll);
  const allAssets = useQuery(api.assets.getAll);

  const createAsset = useMutation(api.assets.create);
  const createBatchAssets = useMutation(api.assets.createBatch);
  const updateAsset = useMutation(api.assets.update);
  const removeAsset = useMutation(api.assets.remove);

  // UI 상태
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(
    new Set()
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] =
    useState<Id<"equipment"> | null>(null);
  const [batchSerialNumbers, setBatchSerialNumbers] = useState("");
  const [editingAssetId, setEditingAssetId] = useState<Id<"assets"> | null>(
    null
  );
  const [editingNote, setEditingNote] = useState("");
  const [editingSerialNumber, setEditingSerialNumber] = useState("");
  const [historyAssetId, setHistoryAssetId] = useState<Id<"assets"> | null>(
    null
  );

  // 이력 조회
  const assetHistory = useQuery(
    api.assets.getHistory,
    historyAssetId ? { assetId: historyAssetId } : "skip"
  );

  if (!allEquipment || !allAssets) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // 장비별로 개별 자산 그룹핑
  const equipmentWithAssets: EquipmentWithAssets[] = allEquipment.map((eq) => ({
    ...eq,
    assets: allAssets.filter((a) => a.equipmentId === eq._id),
  }));

  const toggleExpand = (eqId: string) => {
    setExpandedEquipment((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eqId)) {
        newSet.delete(eqId);
      } else {
        newSet.add(eqId);
      }
      return newSet;
    });
  };

  const handleOpenAddModal = (equipmentId: Id<"equipment">) => {
    setSelectedEquipmentId(equipmentId);
    setBatchSerialNumbers("");
    setIsAddModalOpen(true);
  };

  const handleBatchCreate = async () => {
    if (!selectedEquipmentId || !batchSerialNumbers.trim()) return;

    const numbers = batchSerialNumbers
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (numbers.length === 0) {
      alert("시리얼 번호를 입력해주세요.");
      return;
    }

    try {
      await createBatchAssets({
        equipmentId: selectedEquipmentId,
        serialNumbers: numbers,
      });
      setIsAddModalOpen(false);
      setBatchSerialNumbers("");
      alert(`${numbers.length}개의 개별 장비가 등록되었습니다.`);
    } catch (e) {
      alert("등록 실패: " + e);
    }
  };

  const handleUpdateAsset = async (assetId: Id<"assets">) => {
    try {
      await updateAsset({
        id: assetId,
        serialNumber: editingSerialNumber || undefined,
        note: editingNote || undefined,
      });
      setEditingAssetId(null);
    } catch (e) {
      alert("수정 실패: " + e);
    }
  };

  const handleStatusChange = async (
    assetId: Id<"assets">,
    newStatus: string
  ) => {
    try {
      await updateAsset({
        id: assetId,
        status: newStatus,
      });
    } catch (e) {
      alert("상태 변경 실패: " + e);
    }
  };

  const handleDeleteAsset = async (assetId: Id<"assets">) => {
    if (!confirm("이 개별 장비를 삭제하시겠습니까?")) return;

    try {
      await removeAsset({ id: assetId });
    } catch (e) {
      alert("삭제 실패: " + e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">
            <CheckCircle className="w-3 h-3" /> 사용가능
          </span>
        );
      case "rented":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
            <Package className="w-3 h-3" /> 대여중
          </span>
        );
      case "maintenance":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold">
            <Wrench className="w-3 h-3" /> 수리중
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
            {status}
          </span>
        );
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">개별 장비 관리</h3>
        <p className="text-sm text-gray-500">
          총 {allAssets.length}개의 개별 장비 등록됨
        </p>
      </div>

      {/* 장비 목록 */}
      <div className="space-y-2">
        {equipmentWithAssets.map((eq) => (
          <div
            key={eq._id}
            className="border rounded-lg bg-white overflow-hidden"
          >
            {/* 장비 헤더 */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(eq._id)}
            >
              <div className="flex items-center gap-3">
                {expandedEquipment.has(eq._id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-bold">{eq.name}</span>
                <span className="text-sm text-gray-500">
                  ({eq.assets.length}개 등록 / 총 {eq.totalQuantity}개)
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddModal(eq._id);
                }}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50"
              >
                <Plus className="w-4 h-4" /> 번호 추가
              </button>
            </div>

            {/* 개별 장비 목록 */}
            {expandedEquipment.has(eq._id) && (
              <div className="border-t bg-gray-50 p-4">
                {eq.assets.length === 0 ? (
                  <p className="text-center text-gray-400 py-4">
                    등록된 개별 장비가 없습니다.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 font-medium">시리얼 번호</th>
                        <th className="pb-2 font-medium">상태</th>
                        <th className="pb-2 font-medium">메모</th>
                        <th className="pb-2 font-medium text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eq.assets.map((asset) => (
                        <tr key={asset._id} className="border-b last:border-0">
                          <td className="py-3">
                            {editingAssetId === asset._id ? (
                              <input
                                type="text"
                                value={editingSerialNumber}
                                onChange={(e) =>
                                  setEditingSerialNumber(e.target.value)
                                }
                                className="border rounded px-2 py-1 text-sm w-24"
                              />
                            ) : (
                              <span className="font-mono font-bold">
                                {asset.serialNumber || "-"}
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <select
                              value={asset.status}
                              onChange={(e) =>
                                handleStatusChange(asset._id, e.target.value)
                              }
                              className="border rounded px-2 py-1 text-xs bg-white cursor-pointer"
                            >
                              <option value="available">사용가능</option>
                              <option value="rented">대여중</option>
                              <option value="maintenance">수리중</option>
                            </select>
                          </td>
                          <td className="py-3">
                            {editingAssetId === asset._id ? (
                              <input
                                type="text"
                                value={editingNote}
                                onChange={(e) => setEditingNote(e.target.value)}
                                className="border rounded px-2 py-1 text-sm w-full"
                                placeholder="메모 입력..."
                              />
                            ) : (
                              <span className="text-gray-600">
                                {asset.note || "-"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {editingAssetId === asset._id ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleUpdateAsset(asset._id)
                                    }
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingAssetId(null)}
                                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      setHistoryAssetId(asset._id)
                                    }
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="이력 보기"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAssetId(asset._id);
                                      setEditingSerialNumber(
                                        asset.serialNumber || ""
                                      );
                                      setEditingNote(asset.note || "");
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                    title="수정"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAsset(asset._id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 일괄 등록 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg">개별 장비 번호 등록</h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시리얼 번호 입력
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  쉼표(,) 또는 줄바꿈으로 구분하여 여러 개 입력 가능
                </p>
                <textarea
                  className="w-full border rounded-lg p-3 text-sm h-32 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="예: A, B, C, D&#10;또는&#10;1&#10;2&#10;3"
                  value={batchSerialNumbers}
                  onChange={(e) => setBatchSerialNumbers(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-600">
                입력된 번호:{" "}
                {
                  batchSerialNumbers
                    .split(/[,\n]/)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0).length
                }
                개
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
              >
                취소
              </button>
              <button
                onClick={handleBatchCreate}
                className="px-4 py-2 bg-black text-white rounded text-sm font-bold hover:bg-gray-800"
              >
                일괄 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이력 조회 모달 */}
      {historyAssetId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <History className="w-5 h-5" /> 대여/반납 이력
              </h3>
              <button onClick={() => setHistoryAssetId(null)}>
                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {assetHistory === undefined ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                </div>
              ) : assetHistory.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  이력이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {assetHistory.map((h) => (
                    <div
                      key={h._id}
                      className={`p-3 rounded-lg border ${
                        h.action === "rented"
                          ? "bg-blue-50 border-blue-200"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-xs font-bold ${h.action === "rented" ? "text-blue-600" : "text-green-600"}`}
                        >
                          {h.action === "rented" ? "대여" : "반납"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(h.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {h.userName} ({h.reservationNumber})
                      </p>
                      {h.returnCondition && (
                        <p className="text-xs mt-1">
                          상태:{" "}
                          {h.returnCondition === "normal"
                            ? "정상"
                            : h.returnCondition === "damaged"
                              ? "파손"
                              : "부품 누락"}
                        </p>
                      )}
                      {h.returnNotes && (
                        <p className="text-xs text-gray-600 mt-1">
                          메모: {h.returnNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setHistoryAssetId(null)}
                className="w-full px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
