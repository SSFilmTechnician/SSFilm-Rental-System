import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Check, Package, AlertCircle } from "lucide-react";

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
  onAssignComplete: () => void;
}

interface AssetData {
  _id: Id<"assets">;
  equipmentId: Id<"equipment">;
  serialNumber?: string;
  managementCode?: string;
  status: string;
  note?: string;
}

type AssetDisplayState =
  | "selectable"      // 선택 가능 (available)
  | "occupied"        // 다른 활성 예약에 배정됨 (approved/rented)
  | "unavailable";    // repair/maintenance/broken/lost/retired

export default function AssetAssignmentModal({
  isOpen,
  onClose,
  reservationId,
  items,
  onAssignComplete,
}: Props) {
  const assignAssets = useMutation(api.assets.assignToReservation);

  // 각 장비 종류별로 선택된 개별 장비 ID 관리
  const [selections, setSelections] = useState<{
    [equipmentId: string]: Id<"assets">[];
  }>({});

  // 모든 개별 장비 데이터 가져오기
  const allAssets = useQuery(api.assets.getAll);

  // 다른 활성 예약에 배정된 asset 상세 정보 (실시간)
  const occupiedAssetsWithInfo = useQuery(api.assets.getOccupiedAssetsWithInfo, {
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
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  // asset의 표시 상태 판단
  const getAssetDisplayState = (asset: AssetData): AssetDisplayState => {
    // 수리/고장/분실/폐기 상태
    if (
      asset.status === "repair" ||
      asset.status === "maintenance" ||
      asset.status === "broken" ||
      asset.status === "lost" ||
      asset.status === "retired"
    ) {
      return "unavailable";
    }
    // 다른 예약에 배정됨
    if (occupiedAssetsWithInfo && occupiedAssetsWithInfo[asset._id]) {
      return "occupied";
    }
    return "selectable";
  };

  // 장비별로 모든 개별 장비 반환 (필터링 없이 모두 표시)
  const getAllAssetsForEquipment = (equipmentId: Id<"equipment">): AssetData[] => {
    if (!allAssets) return [];
    return allAssets
      .filter((a) => a.equipmentId === equipmentId)
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
      setSelections((prev) => ({
        ...prev,
        [equipmentId]: current.filter((id) => id !== assetId),
      }));
    } else {
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

  // 배정 완료 처리
  const handleAssign = async () => {
    const incomplete = items.filter((item) => {
      const selected = selections[item.equipmentId] || [];
      return selected.length < item.quantity;
    });

    if (incomplete.length > 0) {
      const names = incomplete.map((i) => i.name).join(", ");
      if (
        !confirm(
          `다음 장비의 배정이 완료되지 않았습니다:\n${names}\n\n그래도 진행하시겠습니까?`,
        )
      ) {
        return;
      }
    }

    try {
      const assignments = Object.entries(selections)
        .filter(([, assetIds]) => assetIds.length > 0)
        .map(([equipmentId, assetIds]) => ({
          equipmentId: equipmentId as Id<"equipment">,
          assetIds,
        }));

      if (assignments.length > 0) {
        await assignAssets({
          reservationId,
          assignments,
        });
      }

      onAssignComplete();
      onClose();
    } catch (e) {
      alert("배정 실패: " + e);
    }
  };

  // 상태별 버튼 스타일
  const getAssetButtonStyle = (
    _asset: AssetData,
    isSelected: boolean,
    displayState: AssetDisplayState,
  ): string => {
    if (displayState === "unavailable") {
      return "px-3 py-2 rounded-lg border text-sm font-mono cursor-not-allowed opacity-60 bg-red-50 text-red-400 border-red-200";
    }
    if (displayState === "occupied") {
      return "px-3 py-2 rounded-lg border text-sm font-mono cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200";
    }
    if (isSelected) {
      return "px-3 py-2 rounded-lg border text-sm font-mono transition-all bg-black text-white border-black hover:bg-gray-800";
    }
    return "px-3 py-2 rounded-lg border text-sm font-mono transition-all bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:bg-gray-50";
  };

  // 상태 레이블 텍스트
  const getStatusLabel = (asset: AssetData, displayState: AssetDisplayState): string => {
    if (displayState === "unavailable") {
      const labels: Record<string, string> = {
        repair: "수리중",
        maintenance: "점검중",
        broken: "파손",
        lost: "분실",
        retired: "폐기",
      };
      return labels[asset.status] || asset.status;
    }
    if (displayState === "occupied" && occupiedAssetsWithInfo) {
      const info = occupiedAssetsWithInfo[asset._id];
      if (info) {
        const statusLabel = info.reservationStatus === "rented" ? "대여중" : "예약중";
        return `${statusLabel} · ${info.startDate}~${info.endDate} · ${info.leaderName}`;
      }
    }
    return "";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5" /> 개별 장비 배정
            </h3>
            <p className="text-sm text-gray-500">
              각 장비 종류별로 배정할 개별 장비를 선택하세요
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* 범례 */}
        <div className="px-4 pt-3 pb-1 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-black"></span> 선택됨
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded border border-gray-300 bg-white"></span> 선택 가능
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-gray-200"></span> 예약중/대여중
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-200"></span> 수리/파손/폐기
          </span>
        </div>

        {/* 본문 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {items.map((item) => {
            const allItemAssets = getAllAssetsForEquipment(item.equipmentId);
            const selected = selections[item.equipmentId] || [];
            const selectableCount = allItemAssets.filter(
              (a) => getAssetDisplayState(a) === "selectable",
            ).length;

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

                {allItemAssets.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    등록된 개별 장비가 없습니다.
                  </div>
                ) : (
                  <>
                    {selectableCount === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        배정 가능한 장비가 없습니다. 모두 대여 중이거나 수리 중입니다.
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {allItemAssets.map((asset) => {
                        const displayState = getAssetDisplayState(asset);
                        const isSelected = selected.includes(asset._id);
                        const isDisabled = displayState !== "selectable";
                        const statusLabel = getStatusLabel(asset, displayState);
                        const displayCode =
                          asset.managementCode || asset.serialNumber || "번호없음";

                        return (
                          <div key={asset._id} className="flex flex-col items-center gap-0.5">
                            <button
                              onClick={() =>
                                !isDisabled && toggleAsset(item.equipmentId, asset._id)
                              }
                              disabled={isDisabled}
                              title={statusLabel || displayCode}
                              className={getAssetButtonStyle(asset, isSelected, displayState)}
                            >
                              {displayCode}
                            </button>
                            {statusLabel && (
                              <span className="text-xs text-gray-400 max-w-[120px] text-center leading-tight">
                                {statusLabel}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            선택하지 않고 승인해도 나중에 배정할 수 있습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
            >
              취소
            </button>
            <button
              onClick={handleAssign}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700"
            >
              배정 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
