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

  // 장비별로 사용 가능한 개별 장비 필터링 (현재 예약에 배정된 장비도 포함)
  const getAvailableAssets = (equipmentId: Id<"equipment">): AssetData[] => {
    if (!allAssets) return [];

    // 현재 이 예약에 자동 배정된 장비 ID
    const currentAssigned =
      items.find((i) => i.equipmentId === equipmentId)?.assignedAssets || [];

    return allAssets
      .filter(
        (a) =>
          a.equipmentId === equipmentId &&
          (a.status === "available" || currentAssigned.includes(a._id)),
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
    setSelections((prev) => {
      const current = prev[equipmentId] || [];
      const item = items.find((i) => i.equipmentId === equipmentId);
      const maxQuantity = item?.quantity || 1;

      if (current.includes(assetId)) {
        // 이미 선택된 경우 해제
        return {
          ...prev,
          [equipmentId]: current.filter((id) => id !== assetId),
        };
      } else {
        // 선택 (최대 수량 체크)
        if (current.length >= maxQuantity) {
          alert(`이 장비는 최대 ${maxQuantity}개까지만 선택할 수 있습니다.`);
          return prev;
        }
        return {
          ...prev,
          [equipmentId]: [...current, assetId],
        };
      }
    });
  };

  // 배정 완료 처리
  const handleAssign = async () => {
    // 모든 장비에 대해 필요한 수량만큼 선택되었는지 확인
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

        {/* 본문 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {items.map((item) => {
            const availableAssets = getAvailableAssets(item.equipmentId);
            const selected = selections[item.equipmentId] || [];

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

                {availableAssets.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    등록된 개별 장비가 없거나 모두 대여 중입니다.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableAssets.map((asset) => (
                      <button
                        key={asset._id}
                        onClick={() => toggleAsset(item.equipmentId, asset._id)}
                        className={`px-3 py-2 rounded-lg border text-sm font-mono transition-all ${
                          selected.includes(asset._id)
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {asset.managementCode ||
                          asset.serialNumber ||
                          "번호없음"}
                      </button>
                    ))}
                  </div>
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
