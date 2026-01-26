import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  Wrench,
  Plus,
  User,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Loader2,
  FileText,
  CreditCard,
} from "lucide-react";

type RepairTab = "in_progress" | "completed";

interface RepairData {
  _id: Id<"repairs">;
  reservationId?: Id<"reservations">;
  reservationNumber?: string;
  equipmentName?: string;
  serialNumber?: string;
  studentName?: string;
  studentPhone?: string;
  leaderName?: string;

  stage: string;
  damageType: string;
  damageDescription: string;
  damageConfirmedAt: number;

  chargeType?: string;
  chargeDecidedAt?: number;

  estimateMemo?: string;
  estimateRequestedAt?: number;

  finalAmount?: number;
  paymentConfirmedAt?: number;

  repairResult?: string;
  completedAt?: number;
  adminMemo?: string;
  createdAt: number;
  isFixed: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  damage_confirmed: "파손 확인",
  charge_decided: "청구 결정",
  estimate_requested: "견적 요청",
  payment_confirmed: "입금 확인",
  completed: "수리 완료",
};

const DAMAGE_TYPE_LABELS: Record<string, string> = {
  damaged: "파손",
  lost: "분실",
  missing_parts: "부품 누락",
};

export default function RepairManagement() {
  const [activeTab, setActiveTab] = useState<RepairTab>("in_progress");
  const [selectedRepairId, setSelectedRepairId] =
    useState<Id<"repairs"> | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const repairs = useQuery(api.admin.getRepairs, { status: activeTab }) as
    | RepairData[]
    | undefined;
  const deleteRepair = useMutation(api.admin.deleteRepair);

  // 실시간 데이터에서 선택된 수리 정보 가져오기
  const selectedRepair =
    repairs?.find((r) => r._id === selectedRepairId) || null;

  const handleRowClick = (repair: RepairData) => {
    if (selectedRepairId === repair._id) {
      setSelectedRepairId(null);
    } else {
      setSelectedRepairId(repair._id);
    }
  };

  const handleDelete = async (id: Id<"repairs">) => {
    if (confirm("삭제하시겠습니까?")) {
      await deleteRepair({ id });
      setSelectedRepairId(null);
    }
  };

  const formatDate = (ts?: number) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleDateString("ko-KR");
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "damage_confirmed":
        return "bg-red-50 text-red-600 border-red-200";
      case "charge_decided":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "estimate_requested":
        return "bg-yellow-50 text-yellow-600 border-yellow-200";
      case "payment_confirmed":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "completed":
        return "bg-green-50 text-green-600 border-green-200";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        {/* ✅ [수정] flex-wrap 추가 및 버튼에 whitespace-nowrap 추가 */}
        <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("in_progress");
              setSelectedRepairId(null);
            }}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === "in_progress" ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-700"}`}
          >
            진행중인 수리
          </button>
          <button
            onClick={() => {
              setActiveTab("completed");
              setSelectedRepairId(null);
            }}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap ${activeTab === "completed" ? "bg-white shadow text-black" : "text-gray-500 hover:text-gray-700"}`}
          >
            완료된 건 (이력)
          </button>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> 수리 직접 등록
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        {/* Left: List */}
        <div
          className={`${selectedRepair ? "lg:col-span-4" : "lg:col-span-12"} transition-all`}
        >
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {repairs?.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>내역이 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {repairs?.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleRowClick(item)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${selectedRepairId === item._id ? "bg-blue-50 border-blue-500" : "border-transparent"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStageColor(item.stage)}`}
                      >
                        {STAGE_LABELS[item.stage] || item.stage}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">
                      {item.equipmentName || "장비명 미상"}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {item.damageDescription}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />{" "}
                      {item.leaderName || item.studentName || "사용자 미상"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        {selectedRepair && (
          <div className="lg:col-span-8">
            <RepairDetailPanel
              key={selectedRepair._id}
              repair={selectedRepair}
              onClose={() => setSelectedRepairId(null)}
              onDelete={() => handleDelete(selectedRepair._id)}
            />
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddRepairModal onClose={() => setIsAddModalOpen(false)} />
      )}
    </div>
  );
}

// 상세 패널 (5단계 워크플로우)
function RepairDetailPanel({
  repair,
  onClose,
  onDelete,
}: {
  repair: RepairData;
  onClose: () => void;
  onDelete: () => void;
}) {
  const updateCharge = useMutation(api.admin.updateRepairChargeDecision);
  const updateEstimate = useMutation(api.admin.updateRepairEstimate);
  const updatePayment = useMutation(api.admin.updateRepairPaymentConfirmed);
  const complete = useMutation(api.admin.completeRepair);
  const revert = useMutation(api.admin.revertRepairStage);

  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);

  // 폼 상태 - repair 변경 시 동기화
  const [chargeType, setChargeType] = useState(
    repair.chargeType || "student_charge",
  );
  const [estimateMemo, setEstimateMemo] = useState(repair.estimateMemo || "");
  const [finalAmount, setFinalAmount] = useState(repair.finalAmount || 0);
  const [repairResult, setRepairResult] = useState(
    repair.repairResult || "repaired",
  );
  const [memo, setMemo] = useState(repair.adminMemo || "");

  // repair 변경 시 상태 동기화
  useEffect(() => {
    setChargeType(repair.chargeType || "student_charge");
    setEstimateMemo(repair.estimateMemo || "");
    setFinalAmount(repair.finalAmount || 0);
    setRepairResult(repair.repairResult || "repaired");
    setMemo(repair.adminMemo || "");
  }, [repair]);

  const handleCharge = async () => {
    setIsLoading(true);
    try {
      await updateCharge({ id: repair._id, chargeType });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEstimate = async () => {
    if (!estimateMemo.trim()) {
      alert("견적서 내용을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      await updateEstimate({ id: repair._id, estimateMemo });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsLoading(true);
    try {
      await updatePayment({ id: repair._id, finalAmount });
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("수리 완료 처리하시겠습니까?")) return;
    setIsLoading(true);
    try {
      await complete({ id: repair._id, repairResult, adminMemo: memo });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = async (targetStage: string) => {
    if (!confirm("해당 단계로 되돌리시겠습니까?")) return;
    setIsLoading(true);
    try {
      await revert({ id: repair._id, targetStage });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    "damage_confirmed",
    "charge_decided",
    "estimate_requested",
    "payment_confirmed",
    "completed",
  ];
  const currentStepIdx = steps.indexOf(repair.stage);

  const formatDate = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden h-full flex flex-col">
      <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-gray-200 rounded"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h3 className="font-bold text-lg">수리 상세 정보</h3>
        </div>
        <button
          onClick={onDelete}
          className="text-red-500 hover:bg-red-50 p-2 rounded"
          disabled={isLoading}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        {/* 장비/사용자 정보 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500 mb-1">장비 정보</div>
            <div className="font-bold">{repair.equipmentName || "-"}</div>
            <div className="text-xs font-mono text-gray-600">
              {repair.serialNumber || "S/N 미상"}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded border">
            <div className="text-xs text-gray-500 mb-1">사용자 정보</div>
            <div className="font-bold">
              {repair.leaderName || repair.studentName || "-"}
            </div>
            <div className="text-xs text-gray-600">
              {repair.studentPhone || "-"}
            </div>
          </div>
        </div>

        {/* Step 1: 파손 확인 (항상 완료 상태) */}
        <div className="relative pl-8 border-l-2 border-gray-200 pb-4">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-red-500 border-4 border-white shadow-sm"></div>
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
            1단계: 파손 확인
            <span className="text-xs text-gray-400 font-normal">
              {formatDate(repair.damageConfirmedAt)}
            </span>
          </h4>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm">
            <span className="inline-block bg-white text-red-600 text-xs px-2 py-0.5 rounded border border-red-200 mb-2">
              {DAMAGE_TYPE_LABELS[repair.damageType]}
            </span>
            <p className="text-gray-800 whitespace-pre-wrap">
              {repair.damageDescription}
            </p>
          </div>
        </div>

        {/* Step 2: 청구 결정 */}
        <div
          className={`relative pl-8 border-l-2 pb-4 ${currentStepIdx >= 1 ? "border-gray-200" : "border-dashed border-gray-200"}`}
        >
          <div
            className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${currentStepIdx >= 1 ? "bg-orange-500" : "bg-gray-300"}`}
          ></div>
          <div className="flex justify-between mb-2">
            <h4
              className={`font-bold text-sm flex items-center gap-2 ${currentStepIdx < 1 && "text-gray-400"}`}
            >
              2단계: 청구 결정
              {currentStepIdx >= 1 && (
                <span className="text-xs text-gray-400 font-normal">
                  {formatDate(repair.chargeDecidedAt)}
                </span>
              )}
            </h4>
            {currentStepIdx > 1 && (
              <button
                onClick={() => handleRevert("damage_confirmed")}
                className="text-xs text-blue-500 hover:underline"
                disabled={isLoading}
              >
                수정
              </button>
            )}
          </div>
          {repair.stage === "damage_confirmed" ? (
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
              <p className="text-sm text-gray-600">
                수리비 부담 주체를 선택하세요.
              </p>
              <div className="flex gap-3">
                <label
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    chargeType === "student_charge"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={chargeType === "student_charge"}
                    onChange={() => setChargeType("student_charge")}
                  />
                  <div className="text-center">
                    <div className="font-bold text-sm">학생 부담</div>
                    <div className="text-xs text-gray-500 mt-1">
                      학생이 수리비 부담
                    </div>
                  </div>
                </label>
                <label
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    chargeType === "department_handle"
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={chargeType === "department_handle"}
                    onChange={() => setChargeType("department_handle")}
                  />
                  <div className="text-center">
                    <div className="font-bold text-sm">학과 처리</div>
                    <div className="text-xs text-gray-500 mt-1">
                      학과 예산으로 처리
                    </div>
                  </div>
                </label>
              </div>
              <button
                onClick={handleCharge}
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "결정 완료"
                )}
              </button>
            </div>
          ) : (
            currentStepIdx >= 1 && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 text-sm">
                <div className="font-bold text-orange-800">
                  {repair.chargeType === "student_charge"
                    ? "학생 부담"
                    : "학과 처리"}
                </div>
              </div>
            )
          )}
        </div>

        {/* Step 3: 수리 견적 요청 */}
        <div
          className={`relative pl-8 border-l-2 pb-4 ${currentStepIdx >= 2 ? "border-gray-200" : "border-dashed border-gray-200"}`}
        >
          <div
            className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${currentStepIdx >= 2 ? "bg-yellow-500" : "bg-gray-300"}`}
          ></div>
          <div className="flex justify-between mb-2">
            <h4
              className={`font-bold text-sm flex items-center gap-2 ${currentStepIdx < 2 && "text-gray-400"}`}
            >
              3단계: 수리 견적 요청
              {currentStepIdx >= 2 && (
                <span className="text-xs text-gray-400 font-normal">
                  {formatDate(repair.estimateRequestedAt)}
                </span>
              )}
            </h4>
            {currentStepIdx > 2 && (
              <button
                onClick={() => handleRevert("charge_decided")}
                className="text-xs text-blue-500 hover:underline"
                disabled={isLoading}
              >
                수정
              </button>
            )}
          </div>
          {repair.stage === "charge_decided" ? (
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                <FileText className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p>수리 센터에 입고 후 견적서를 받으면 내용을 입력하세요.</p>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  견적서 내용
                </label>
                <textarea
                  className="w-full border p-3 rounded-lg text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  value={estimateMemo}
                  onChange={(e) => setEstimateMemo(e.target.value)}
                  placeholder="견적서 내용을 입력하세요 (수리 항목, 예상 비용 등)"
                />
              </div>
              <button
                onClick={handleEstimate}
                disabled={isLoading}
                className="w-full bg-yellow-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "견적 등록 완료"
                )}
              </button>
            </div>
          ) : (
            currentStepIdx >= 2 && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm">
                <div className="font-bold text-yellow-800 mb-2">
                  견적서 내용
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {repair.estimateMemo || "-"}
                </p>
              </div>
            )
          )}
        </div>

        {/* Step 4: 금액 설정 + 입금 확인 */}
        <div
          className={`relative pl-8 border-l-2 pb-4 ${currentStepIdx >= 3 ? "border-gray-200" : "border-dashed border-gray-200"}`}
        >
          <div
            className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${currentStepIdx >= 3 ? "bg-blue-500" : "bg-gray-300"}`}
          ></div>
          <div className="flex justify-between mb-2">
            <h4
              className={`font-bold text-sm flex items-center gap-2 ${currentStepIdx < 3 && "text-gray-400"}`}
            >
              4단계: 금액 설정 + 입금 확인
              {currentStepIdx >= 3 && (
                <span className="text-xs text-gray-400 font-normal">
                  {formatDate(repair.paymentConfirmedAt)}
                </span>
              )}
            </h4>
            {currentStepIdx > 3 && (
              <button
                onClick={() => handleRevert("estimate_requested")}
                className="text-xs text-blue-500 hover:underline"
                disabled={isLoading}
              >
                수정
              </button>
            )}
          </div>
          {repair.stage === "estimate_requested" ? (
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <CreditCard className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p>
                  최종 금액을 입력하고 입금이 확인되면 완료 버튼을 누르세요.
                </p>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  최종 금액 (원)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border p-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right font-mono"
                    value={finalAmount ? finalAmount.toLocaleString() : ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setFinalAmount(value ? parseInt(value, 10) : 0);
                    }}
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    원
                  </span>
                </div>
              </div>
              <button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full bg-blue-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "입금 확인 완료"
                )}
              </button>
            </div>
          ) : (
            currentStepIdx >= 3 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
                <div className="font-bold text-blue-800">입금 확인됨</div>
                <div className="text-blue-700 font-mono">
                  금액: {repair.finalAmount?.toLocaleString() || 0}원
                </div>
              </div>
            )
          )}
        </div>

        {/* Step 5: 수리 완료 */}
        <div className="relative pl-8">
          <div
            className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${currentStepIdx >= 4 ? "bg-green-500" : "bg-gray-300"}`}
          ></div>
          <h4
            className={`font-bold text-sm mb-2 flex items-center gap-2 ${currentStepIdx < 4 && "text-gray-400"}`}
          >
            5단계: 수리 완료
            {currentStepIdx >= 4 && (
              <span className="text-xs text-gray-400 font-normal">
                {formatDate(repair.completedAt)}
              </span>
            )}
          </h4>
          {repair.stage === "payment_confirmed" ? (
            <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
              <div className="flex gap-3">
                <label
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    repairResult === "repaired"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={repairResult === "repaired"}
                    onChange={() => setRepairResult("repaired")}
                  />
                  <div className="text-center">
                    <div className="font-bold text-sm">수리 완료</div>
                    <div className="text-xs text-gray-500 mt-1">
                      정상 복구됨
                    </div>
                  </div>
                </label>
                <label
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    repairResult === "replaced"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={repairResult === "replaced"}
                    onChange={() => setRepairResult("replaced")}
                  />
                  <div className="text-center">
                    <div className="font-bold text-sm">교체</div>
                    <div className="text-xs text-gray-500 mt-1">
                      새 장비로 교체
                    </div>
                  </div>
                </label>
                <label
                  className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    repairResult === "disposed"
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={repairResult === "disposed"}
                    onChange={() => setRepairResult("disposed")}
                  />
                  <div className="text-center">
                    <div className="font-bold text-sm">폐기</div>
                    <div className="text-xs text-gray-500 mt-1">수리 불가</div>
                  </div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">
                  최종 메모 (선택)
                </label>
                <textarea
                  className="w-full border p-3 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="수리 결과에 대한 메모를 입력하세요"
                />
              </div>
              <button
                onClick={handleComplete}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "최종 완료 처리"
                )}
              </button>
            </div>
          ) : (
            currentStepIdx >= 4 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">
                    수리 완료 -{" "}
                    {repair.repairResult === "repaired"
                      ? "수리됨"
                      : repair.repairResult === "replaced"
                        ? "교체됨"
                        : "폐기됨"}
                  </span>
                </div>
                {repair.adminMemo && (
                  <p className="text-gray-700 text-xs mt-2 bg-white p-2 rounded">
                    {repair.adminMemo}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// 수동 등록 모달
function AddRepairModal({ onClose }: { onClose: () => void }) {
  const createRepair = useMutation(api.admin.createRepair);
  const allEquipment = useQuery(api.equipment.getAll);
  const assets = useQuery(api.assets.getAll);

  const [selectedEquipmentId, setSelectedEquipmentId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [damageType, setDamageType] = useState("damaged");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredEquipmentList = allEquipment?.filter((eq) =>
    eq.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const filteredAssets = assets?.filter(
    (a) => a.equipmentId === selectedEquipmentId,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipmentId || !description) {
      alert("필수 정보를 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      const eqName = allEquipment?.find(
        (e) => e._id === selectedEquipmentId,
      )?.name;
      const asset = assets?.find((a) => a._id === selectedAssetId);
      await createRepair({
        equipmentId: selectedEquipmentId as Id<"equipment">,
        assetId: selectedAssetId
          ? (selectedAssetId as Id<"assets">)
          : undefined,
        equipmentName: eqName,
        serialNumber: asset?.serialNumber,
        studentName,
        studentPhone,
        damageType,
        damageDescription: description,
      });
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">수리 내역 수동 등록</h3>
          <button onClick={onClose} disabled={isLoading}>
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-bold mb-1">장비 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full border pl-9 pr-3 py-2 rounded"
                placeholder="장비명 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsSearchOpen(true);
                  if (selectedEquipmentId) {
                    setSelectedEquipmentId("");
                    setSelectedAssetId("");
                  }
                }}
                onFocus={() => setIsSearchOpen(true)}
              />
            </div>
            {isSearchOpen && filteredEquipmentList && (
              <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                {filteredEquipmentList.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">
                    결과 없음
                  </div>
                ) : (
                  filteredEquipmentList.map((eq) => (
                    <button
                      key={eq._id}
                      type="button"
                      onClick={() => {
                        setSelectedEquipmentId(eq._id);
                        setSearchTerm(eq.name);
                        setSelectedAssetId("");
                        setIsSearchOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between items-center ${selectedEquipmentId === eq._id ? "bg-blue-50 text-blue-600 font-bold" : ""}`}
                    >
                      <span>{eq.name}</span>
                      <span className="text-xs text-gray-400">
                        재고: {eq.totalQuantity}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {selectedEquipmentId && (
            <div>
              <label className="block text-sm font-bold mb-1">
                개별 장비 (S/N)
              </label>
              <select
                className="w-full border p-2 rounded"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
              >
                <option value="">
                  선택하세요 (선택 시 '수리중' 상태로 변경)
                </option>
                {filteredAssets?.map((a) => (
                  <option key={a._id} value={a._id}>
                    #{a.serialNumber} -{" "}
                    {a.status === "available" ? "사용가능" : a.status}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-bold mb-1">학생 이름</label>
              <input
                className="w-full border p-2 rounded"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">연락처</label>
              <input
                className="w-full border p-2 rounded"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">유형</label>
            <div className="flex gap-2">
              {Object.entries(DAMAGE_TYPE_LABELS).map(([k, v]) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setDamageType(k)}
                  className={`flex-1 py-1 rounded text-xs border ${damageType === k ? "bg-black text-white" : "bg-white"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">내용</label>
            <textarea
              className="w-full border p-2 rounded h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="파손 경위 및 상태 상세"
              required
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
