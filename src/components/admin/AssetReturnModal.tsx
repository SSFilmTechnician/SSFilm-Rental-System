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

type ReturnCondition = "normal" | "damaged" | "missing_parts";

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
  const returnAssets = useMutation(api.assets.returnAssets);
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

  // 자산 ID로 자산 정보 찾기
  const getAssetInfo = (assetId: Id<"assets">): AssetData | undefined => {
    return allAssets.find((a) => a._id === assetId);
  };

  // 상태 변경 핸들러
  const handleConditionChange = (
    assetId: Id<"assets">,
    condition: ReturnCondition
  ) => {
    setReturnInfos((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        condition,
      },
    }));
  };

  // 메모 변경 핸들러
  const handleNotesChange = (assetId: Id<"assets">, notes: string) => {
    setReturnInfos((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        notes,
      },
    }));
  };

  // 반납 처리
  const handleReturn = async () => {
    const returns = Object.values(returnInfos).map((info) => ({
      assetId: info.assetId,
      condition: info.condition,
      notes: info.notes || undefined,
    }));

    // 파손이나 부품 누락이 있는지 확인
    const hasIssues = returns.some((r) => r.condition !== "normal");

    if (hasIssues) {
      const issueCount = returns.filter((r) => r.condition !== "normal").length;
      if (
        !confirm(
          `${issueCount}개의 장비에 문제가 있습니다. 반납 처리하시겠습니까?\n\n문제가 있는 장비는 자동으로 '수리중' 상태가 됩니다.`
        )
      ) {
        return;
      }
    }

    try {
      if (returns.length > 0) {
        await returnAssets({
          reservationId,
          returns,
        });
      }

      onReturnComplete();
      onClose();
    } catch (e) {
      alert("반납 처리 실패: " + e);
    }
  };

  // 배정된 장비가 있는지 확인
  const hasAssignedAssets = items.some(
    (item) => item.assignedAssets && item.assignedAssets.length > 0
  );

  const getConditionBadge = (condition: ReturnCondition) => {
    switch (condition) {
      case "normal":
        return (
          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold">
            정상
          </span>
        );
      case "damaged":
        return (
          <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold">
            파손
          </span>
        );
      case "missing_parts":
        return (
          <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-bold">
            부품 누락
          </span>
        );
    }
  };

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
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
              <p>배정된 개별 장비가 없습니다.</p>
              <p className="text-sm mt-1">
                장비 배정 없이 반납 처리를 진행합니다.
              </p>
            </div>
          ) : (
            items.map((item) => {
              if (!item.assignedAssets || item.assignedAssets.length === 0) {
                return null;
              }

              return (
                <div key={item.equipmentId} className="border rounded-lg p-4">
                  <h4 className="font-bold mb-3">{item.name}</h4>

                  <div className="space-y-3">
                    {item.assignedAssets.map((assetId) => {
                      const asset = getAssetInfo(assetId);
                      const info = returnInfos[assetId];

                      if (!info) return null;

                      return (
                        <div
                          key={assetId}
                          className={`p-3 rounded-lg border ${
                            info.condition === "normal"
                              ? "bg-gray-50 border-gray-200"
                              : info.condition === "damaged"
                                ? "bg-red-50 border-red-200"
                                : "bg-orange-50 border-orange-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold">
                                {asset?.serialNumber || "번호없음"}
                              </span>
                              {getConditionBadge(info.condition)}
                            </div>
                          </div>

                          {/* 상태 선택 버튼 */}
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() =>
                                handleConditionChange(assetId, "normal")
                              }
                              className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                                info.condition === "normal"
                                  ? "bg-green-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-700 hover:border-green-400"
                              }`}
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              정상
                            </button>
                            <button
                              onClick={() =>
                                handleConditionChange(assetId, "damaged")
                              }
                              className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                                info.condition === "damaged"
                                  ? "bg-red-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-700 hover:border-red-400"
                              }`}
                            >
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              파손
                            </button>
                            <button
                              onClick={() =>
                                handleConditionChange(assetId, "missing_parts")
                              }
                              className={`flex-1 py-2 rounded text-sm font-medium transition-all ${
                                info.condition === "missing_parts"
                                  ? "bg-orange-600 text-white"
                                  : "bg-white border border-gray-300 text-gray-700 hover:border-orange-400"
                              }`}
                            >
                              <Package className="w-4 h-4 inline mr-1" />
                              부품 누락
                            </button>
                          </div>

                          {/* 메모 입력 (문제가 있을 경우) */}
                          {info.condition !== "normal" && (
                            <input
                              type="text"
                              placeholder="상세 내용을 입력하세요..."
                              className="w-full border rounded px-3 py-2 text-sm"
                              value={info.notes}
                              onChange={(e) =>
                                handleNotesChange(assetId, e.target.value)
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
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
            className="px-4 py-2 bg-gray-800 text-white rounded text-sm font-bold hover:bg-gray-900"
          >
            반납 완료
          </button>
        </div>
      </div>
    </div>
  );
}
