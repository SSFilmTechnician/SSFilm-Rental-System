import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, CheckCircle, AlertTriangle, Package } from "lucide-react";

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
  onReturnComplete: () => void;
}

interface AssetData {
  _id: Id<"assets">;
  equipmentId: Id<"equipment">;
  serialNumber?: string;
  status: string;
  note?: string;
}

// 스키마와 일치하는 상태 값들 (normal, damaged, lost)
// missing_parts는 스키마엔 없으므로 damaged로 통합하거나 별도 처리 가능하지만,
// 여기서는 UI 편의상 damaged/lost로 매핑하여 처리하겠습니다.
type ReturnCondition = "normal" | "damaged" | "lost";

interface ReturnInfo {
  assetId: Id<"assets">;
  condition: ReturnCondition;
  notes: string;
}

export default function AssetReturnModal({
  isOpen,
  onClose,
  reservationId,
  items,
  onReturnComplete,
}: Props) {
  // [변경] 기존 assets.returnAssets 대신 admin.processReturn 사용
  const processReturn = useMutation(api.admin.processReturn);
  const allAssets = useQuery(api.assets.getAll);

  // 각 배정된 장비의 반납 상태 관리
  const [returnInfos, setReturnInfos] = useState<{
    [assetId: string]: ReturnInfo;
  }>({});

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen && items) {
      const initial: { [key: string]: ReturnInfo } = {};

      items.forEach((item) => {
        if (item.assignedAssets) {
          item.assignedAssets.forEach((assetId) => {
            initial[assetId] = {
              assetId,
              condition: "normal",
              notes: "",
            };
          });
        }
      });

      setReturnInfos(initial);
    }
  }, [isOpen, items]);

  if (!isOpen || !allAssets) return null;

  const getAssetInfo = (assetId: Id<"assets">): AssetData | undefined => {
    return allAssets.find((a) => a._id === assetId);
  };

  const handleConditionChange = (
    assetId: Id<"assets">,
    condition: ReturnCondition,
  ) => {
    setReturnInfos((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        condition,
      },
    }));
  };

  const handleNotesChange = (assetId: Id<"assets">, notes: string) => {
    setReturnInfos((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        notes,
      },
    }));
  };

  const handleReturn = async () => {
    const returnItems = Object.values(returnInfos).map((info) => ({
      assetId: info.assetId,
      condition: info.condition,
      note: info.notes || undefined,
    }));

    const hasIssues = returnItems.some((r) => r.condition !== "normal");

    // 파손/분실 선택 시 메모 입력 여부 체크
    if (hasIssues) {
      const missingNotes = returnItems.some(
        (r) => r.condition !== "normal" && !r.note,
      );
      if (missingNotes) {
        alert("파손 또는 분실된 장비의 상세 내용을 입력해주세요.");
        return;
      }

      if (
        !confirm(
          `문제가 있는 장비가 포함되어 있습니다.\n반납 처리 시 자동으로 '수리 현황' 탭에 등록됩니다.\n계속하시겠습니까?`,
        )
      ) {
        return;
      }
    }

    try {
      // [변경] processReturn 호출
      await processReturn({
        reservationId,
        returnItems,
      });

      alert("반납 처리가 완료되었습니다.");
      onReturnComplete();
      onClose();
    } catch (e: any) {
      alert("반납 처리 실패: " + (e.message || e));
    }
  };

  const hasAssignedAssets = items.some(
    (item) => item.assignedAssets && item.assignedAssets.length > 0,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5" /> 반납 상태 기록
            </h3>
            <p className="text-sm text-gray-500">
              각 장비의 반납 상태를 선택하세요
            </p>
          </div>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {!hasAssignedAssets ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-yellow-500" />
              <p className="font-bold">배정된 개별 장비 정보가 없습니다.</p>
              <p className="text-xs mt-1">
                상세 기록 없이 일괄 반납 처리됩니다.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 p-3 rounded border border-blue-100 text-sm text-blue-800 mb-4">
                💡 <b>'파손'</b>이나 <b>'분실'</b>을 선택하면 자동으로 수리
                현황에 등록되며, 장비는 대여 불가 상태가 됩니다.
              </div>

              {items.map((item) => {
                if (!item.assignedAssets || item.assignedAssets.length === 0) {
                  return null;
                }

                return (
                  <div key={item.equipmentId} className="border rounded-lg p-4">
                    <h4 className="font-bold mb-3 text-lg">{item.name}</h4>

                    <div className="space-y-3">
                      {item.assignedAssets.map((assetId) => {
                        const asset = getAssetInfo(assetId);
                        const info = returnInfos[assetId];

                        if (!info) return null;

                        const isProblem = info.condition !== "normal";

                        return (
                          <div
                            key={assetId}
                            className={`p-3 rounded-lg border transition-all ${
                              isProblem
                                ? "bg-red-50 border-red-200 shadow-sm"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <span className="font-mono font-bold text-gray-700">
                                S/N: {asset?.serialNumber || "번호없음"}
                              </span>

                              {/* 상태 선택 버튼 그룹 */}
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    handleConditionChange(assetId, "normal")
                                  }
                                  className={`px-3 py-1.5 rounded text-xs font-bold border ${
                                    info.condition === "normal"
                                      ? "bg-green-600 text-white border-green-600"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  정상
                                </button>
                                <button
                                  onClick={() =>
                                    handleConditionChange(assetId, "damaged")
                                  }
                                  className={`px-3 py-1.5 rounded text-xs font-bold border ${
                                    info.condition === "damaged"
                                      ? "bg-red-600 text-white border-red-600"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  파손
                                </button>
                                <button
                                  onClick={() =>
                                    handleConditionChange(assetId, "lost")
                                  }
                                  className={`px-3 py-1.5 rounded text-xs font-bold border ${
                                    info.condition === "lost"
                                      ? "bg-orange-600 text-white border-orange-600"
                                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                  }`}
                                >
                                  분실
                                </button>
                              </div>
                            </div>

                            {/* 문제 발생 시 메모 입력 필드 (필수) */}
                            {isProblem && (
                              <div className="mt-2 animate-fadeIn">
                                <label className="text-xs font-bold text-red-600 mb-1 block">
                                  상세 내용 입력 (필수)
                                </label>
                                <input
                                  type="text"
                                  placeholder="예: 렌즈 스크래치, 배터리 분실 등"
                                  className="w-full border border-red-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                  value={info.notes}
                                  onChange={(e) =>
                                    handleNotesChange(assetId, e.target.value)
                                  }
                                  autoFocus
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100"
          >
            취소
          </button>
          <button
            onClick={handleReturn}
            className="px-6 py-2 bg-gray-900 text-white rounded text-sm font-bold hover:bg-black transition-colors"
          >
            반납 완료 처리
          </button>
        </div>
      </div>
    </div>
  );
}
