import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Check, AlertCircle, RefreshCw } from "lucide-react";

interface ReservationItem {
  equipmentId: Id<"equipment">;
  name: string;
  quantity: number;
  checkedOut: boolean;
  returned: boolean;
  assignedAssets?: Id<"assets">[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reservationId: Id<"reservations">;
  items: ReservationItem[];
  onEditComplete: () => void;
}

interface AssetData {
  _id: Id<"assets">;
  equipmentId: Id<"equipment">;
  serialNumber?: string;
  managementCode?: string;
  status: string;
  note?: string;
}

export default function AssetEditModal({
  isOpen,
  onClose,
  reservationId,
  items,
  onEditComplete,
}: Props) {
  const updateAssignment = useMutation(api.assets.updateAssignment);

  // 각 장비 종류별로 선택된 개별 장비 ID 관리
  const [selections, setSelections] = useState<{
    [equipmentId: string]: Id<"assets">[];
  }>({});

  // 원래 배정된 장비 ID (변경 감지용)
  const [originalSelections, setOriginalSelections] = useState<{
    [equipmentId: string]: Id<"assets">[];
  }>({});

  // 모든 개별 장비 데이터 가져오기
  const allAssets = useQuery(api.assets.getAll);

  // 다른 활성 예약(approved/rented)에 이미 배정된 asset ID 목록 (실시간)
  const occupiedAssetIds = useQuery(api.assets.getOccupiedAssetIds, {
    excludeReservationId: reservationId,
  });

  // 모달이 열릴 때 기존 배정 정보로 초기화
  useEffect(() => {
    if (isOpen && items) {
      const initial: { [key: string]: Id<"assets">[] } = {};
      items.forEach((item) => {
        initial[item.equipmentId] = item.assignedAssets || [];
      });
      setSelections(initial);
      setOriginalSelections(initial);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  // 장비별로 선택 가능한 개별 장비 필터링
  // - repair/retired 상태 제외
  // - 다른 활성 예약에 배정된 장비 제외
  // - 단, 현재 이 예약에 배정된 장비는 선택 가능하도록 포함
  const getSelectableAssets = (equipmentId: Id<"equipment">): AssetData[] => {
    if (!allAssets) return [];

    const currentAssigned = originalSelections[equipmentId] || [];
    const occupiedSet = new Set(occupiedAssetIds || []);

    return allAssets
      .filter(
        (a) =>
          a.equipmentId === equipmentId &&
          a.status !== "repair" &&
          a.status !== "retired" &&
          (!occupiedSet.has(a._id) || currentAssigned.includes(a._id)),
      )
      .sort((a, b) => {
        const aNum = parseInt(a.serialNumber || "");
        const bNum = parseInt(b.serialNumber || "");
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return (a.serialNumber || "").localeCompare(b.serialNumber || "");
      });
  };

  // 개별 장비 선택/해제 토글
  const toggleAsset = (equipmentId: Id<"equipment">, assetId: Id<"assets">) => {
    const current = selections[equipmentId] || [];
    const item = items.find((i) => i.equipmentId === equipmentId);
    const maxQuantity = item?.quantity || 1;

    if (current.includes(assetId)) {
      // 이미 선택된 경우 해제
      setSelections((prev) => ({
        ...prev,
        [equipmentId]: current.filter((id) => id !== assetId),
      }));
    } else {
      // 선택 (최대 수량 체크)
      if (current.length >= maxQuantity) {
        alert(`이 장비는 최대 ${maxQuantity}개까지만 선택할 수 있습니다.`);
        return;
      }
      setSelections((prev) => ({
        ...prev,
        [equipmentId]: [...current, assetId],
      }));
    }
  };

  // 변경사항이 있는지 확인
  const hasChanges = () => {
    for (const equipmentId of Object.keys(selections)) {
      const current = selections[equipmentId] || [];
      const original = originalSelections[equipmentId] || [];

      if (current.length !== original.length) return true;
      if (!current.every((id) => original.includes(id))) return true;
    }
    return false;
  };

  // 배정 변경 처리
  const handleSave = async () => {
    if (!hasChanges()) {
      alert("변경사항이 없습니다.");
      return;
    }

    try {
      // 변경된 장비에 대해서만 업데이트
      for (const [equipmentId, newAssetIds] of Object.entries(selections)) {
        const oldAssetIds = originalSelections[equipmentId] || [];

        // 변경이 있는 경우에만 API 호출
        const hasChanged =
          newAssetIds.length !== oldAssetIds.length ||
          !newAssetIds.every((id) => oldAssetIds.includes(id));

        if (hasChanged) {
          await updateAssignment({
            reservationId,
            equipmentId: equipmentId as Id<"equipment">,
            oldAssetIds,
            newAssetIds,
          });
        }
      }

      alert("배정이 변경되었습니다.");
      onEditComplete();
      onClose();
    } catch (e) {
      alert("변경 실패: " + e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b bg-orange-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 text-orange-800">
              <RefreshCw className="w-5 h-5" /> 배정 장비 변경
            </h3>
            <p className="text-sm text-orange-600">
              현장에서 변경된 장비 번호를 수정하세요
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {items.map((item) => {
            const selectableAssets = getSelectableAssets(item.equipmentId);
            const selected = selections[item.equipmentId] || [];
            const original = originalSelections[item.equipmentId] || [];

            return (
              <div key={item.equipmentId} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="font-bold">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      필요: {item.quantity}개 / 선택됨:{" "}
                      <span
                        className={
                          selected.length === item.quantity
                            ? "text-green-600 font-bold"
                            : "text-orange-600 font-bold"
                        }
                      >
                        {selected.length}개
                      </span>
                    </p>
                  </div>
                  {selected.length === item.quantity && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> 완료
                    </span>
                  )}
                </div>

                {selectableAssets.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    등록된 개별 장비가 없거나 모두 다른 예약에 배정되어
                    있습니다.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectableAssets.map((asset) => {
                      const isSelected = selected.includes(asset._id);
                      const wasOriginal = original.includes(asset._id);
                      const isChanged = isSelected !== wasOriginal;

                      return (
                        <button
                          key={asset._id}
                          onClick={() =>
                            toggleAsset(item.equipmentId, asset._id)
                          }
                          className={`px-3 py-2 rounded-lg border text-sm font-mono transition-all relative ${
                            isSelected
                              ? isChanged
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-black text-white border-black"
                              : isChanged
                                ? "bg-red-50 text-red-600 border-red-300 line-through"
                                : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {asset.managementCode ||
                            asset.serialNumber ||
                            "번호없음"}
                          {isChanged && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {hasChanges() ? (
              <span className="text-orange-600 font-bold">
                변경사항이 있습니다
              </span>
            ) : (
              "변경사항 없음"
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges()}
              className={`px-4 py-2 rounded text-sm font-bold ${
                hasChanges()
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              변경 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
