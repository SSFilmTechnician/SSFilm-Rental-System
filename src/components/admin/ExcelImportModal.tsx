import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import * as XLSX from "xlsx";
import { X, Upload, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

// ──────────────────────────────────────────────
// 타입 정의
// ──────────────────────────────────────────────
type RowStatus = "new" | "update" | "unchanged" | "error";

interface ExportEquipment {
  _id: string;
  name: string;
  category: string;
  subCategory: string;
  totalQuantity: number;
  description: string;
  isVisible: boolean;
}

interface ExportAsset {
  _id: string;
  equipmentId: string;
  equipmentName: string;
  serialNumber?: string;
  managementCode?: string;
  status: string;
  note?: string;
}

interface EquipmentRow {
  equipment_id: string;
  장비명: string;
  카테고리: string;
  서브카테고리: string;
  전체수량: string | number;
  설명: string;
  상태: string;
  _status: RowStatus;
  _error?: string;
  _matchedId?: string;
}

interface AssetRow {
  asset_id: string;
  장비명: string;
  자산번호: string;
  시리얼넘버: string;
  상태: string;
  컨디션: string;
  비고: string;
  equipment_id: string;
  _status: RowStatus;
  _error?: string;
  _matchedId?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existingEquipment: ExportEquipment[];
  existingAssets: ExportAsset[];
  currentUser: {
    _id: string;
    name: string;
    email: string;
  };
}

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
function str(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

const STATUS_STYLE: Record<RowStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  update: "bg-amber-100 text-amber-700",
  unchanged: "bg-gray-100 text-gray-500",
  error: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<RowStatus, string> = {
  new: "신규",
  update: "수정",
  unchanged: "변경없음",
  error: "오류",
};

// ──────────────────────────────────────────────
// 클라이언트 사이드 분석
// ──────────────────────────────────────────────
function analyzeEquipment(rows: Record<string, unknown>[], existing: ExportEquipment[]): EquipmentRow[] {
  return rows.map((row) => {
    const name = str(row["장비명"]);
    const eqId = str(row["equipment_id"]);
    const qtyStr = str(row["전체수량"]);

    if (!name) {
      return { ...(row as any), _status: "error", _error: "장비명 필수" };
    }
    if (qtyStr && (isNaN(parseFloat(qtyStr)) || parseFloat(qtyStr) < 0)) {
      return { ...(row as any), _status: "error", _error: "전체수량 오류" };
    }

    let matched = eqId ? existing.find((e) => e._id === eqId) : undefined;
    if (!matched) matched = existing.find((e) => e.name === name);

    if (matched) {
      const qty = qtyStr ? parseFloat(qtyStr) : undefined;
      const isVisible = str(row["상태"]) !== "숨김";
      const changed =
        (qty !== undefined && matched.totalQuantity !== qty) ||
        (str(row["설명"]) && matched.description !== str(row["설명"])) ||
        (str(row["상태"]) && matched.isVisible !== isVisible);
      return {
        ...(row as any),
        _status: changed ? "update" : "unchanged",
        _matchedId: matched._id,
      };
    }
    return { ...(row as any), _status: "new" };
  });
}

function analyzeAssets(rows: Record<string, unknown>[], existing: ExportAsset[]): AssetRow[] {
  return rows.map((row) => {
    const assetId = str(row["asset_id"]);
    const eqId = str(row["equipment_id"]);
    const eqName = str(row["장비명"]);
    const serial = str(row["시리얼넘버"]);

    if (!eqId && !eqName) {
      return { ...(row as any), _status: "error", _error: "장비명 또는 equipment_id 필수" };
    }

    let matched = assetId ? existing.find((a) => a._id === assetId) : undefined;
    if (!matched && eqId && serial) {
      matched = existing.find((a) => a.equipmentId === eqId && a.serialNumber === serial);
    }
    if (!matched && eqName && serial) {
      matched = existing.find((a) => a.equipmentName === eqName && a.serialNumber === serial);
    }

    if (matched) {
      const changed =
        (serial && matched.serialNumber !== serial) ||
        (str(row["자산번호"]) && matched.managementCode !== str(row["자산번호"])) ||
        (str(row["상태"]) && matched.status !== str(row["상태"])) ||
        (str(row["비고"]) && matched.note !== str(row["비고"]));
      return {
        ...(row as any),
        _status: changed ? "update" : "unchanged",
        _matchedId: matched._id,
      };
    }
    return { ...(row as any), _status: "new" };
  });
}

// ──────────────────────────────────────────────
// 요약 뱃지
// ──────────────────────────────────────────────
function SummaryBadges({
  rows,
  currentFilter,
  onFilterChange
}: {
  rows: Array<{ _status: RowStatus }>;
  currentFilter: RowStatus | null;
  onFilterChange: (status: RowStatus | null) => void;
}) {
  const counts = rows.reduce(
    (acc, r) => { acc[r._status]++; return acc; },
    { new: 0, update: 0, unchanged: 0, error: 0 } as Record<RowStatus, number>
  );
  return (
    <div className="flex gap-1.5 flex-wrap">
      {(["new", "update", "unchanged", "error"] as RowStatus[]).map((s) => (
        <button
          key={s}
          onClick={() => onFilterChange(currentFilter === s ? null : s)}
          className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all ${STATUS_STYLE[s]} ${
            currentFilter === s ? "ring-2 ring-offset-1 ring-gray-400" : "hover:opacity-80"
          }`}
        >
          {STATUS_LABEL[s]} {counts[s]}
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────
export default function ExcelImportModal({ isOpen, onClose, existingEquipment, existingAssets, currentUser }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"equipment" | "assets">("equipment");
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>([]);
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RowStatus | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [importResult, setImportResult] = useState<{
    equipment: { created: number; updated: number; errors: number };
    assets: { created: number; updated: number; errors: number };
  } | null>(null);

  const bulkUpsertEquipment = useMutation(api.equipment.bulkUpsertEquipment);
  const bulkUpsertAssets = useMutation(api.assets.bulkUpsertAssets);
  const createExcelLog = useMutation(api.excelLogs.createLog);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });

        const eqSheet = wb.Sheets["장비목록"];
        const assetSheet = wb.Sheets["자산목록"];

        if (!eqSheet && !assetSheet) {
          alert("'장비목록' 또는 '자산목록' 시트를 찾을 수 없습니다.\n이전에 내보낸 SSFilm 형식의 파일을 업로드해주세요.");
          return;
        }

        const eqData = eqSheet
          ? (XLSX.utils.sheet_to_json(eqSheet, { defval: "" }) as Record<string, unknown>[])
          : [];
        const assetData = assetSheet
          ? (XLSX.utils.sheet_to_json(assetSheet, { defval: "" }) as Record<string, unknown>[])
          : [];

        setEquipmentRows(analyzeEquipment(eqData, existingEquipment));
        setAssetRows(analyzeAssets(assetData, existingAssets));
        setIsParsed(true);
        setImportResult(null);
        setActiveTab("equipment");
      } catch {
        alert("파일 파싱 중 오류가 발생했습니다. 올바른 .xlsx 파일인지 확인해주세요.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const hasErrors =
    equipmentRows.some((r) => r._status === "error") ||
    assetRows.some((r) => r._status === "error");

  const applyableEqCount = equipmentRows.filter((r) => r._status !== "unchanged" && r._status !== "error").length;
  const applyableAssetCount = assetRows.filter((r) => r._status !== "unchanged" && r._status !== "error").length;

  const handleConfirm = async () => {
    setIsImporting(true);
    try {
      const eqItems = equipmentRows
        .filter((r) => r._status !== "unchanged" && r._status !== "error")
        .map((r) => ({
          id: r._matchedId || undefined,
          name: str(r["장비명"]),
          categoryName: str(r["카테고리"]) || undefined,
          subCategoryName: str(r["서브카테고리"]) || undefined,
          totalQuantity: str(r["전체수량"]) ? parseFloat(str(r["전체수량"])) : undefined,
          description: str(r["설명"]) || undefined,
          isVisible: str(r["상태"]) !== "숨김",
        }));

      const assetItems = assetRows
        .filter((r) => r._status !== "unchanged" && r._status !== "error")
        .map((r) => ({
          id: r._matchedId || undefined,
          equipmentId: str(r["equipment_id"]) || undefined,
          equipmentName: str(r["장비명"]) || undefined,
          serialNumber: str(r["시리얼넘버"]) || undefined,
          managementCode: str(r["자산번호"]) || undefined,
          status: str(r["상태"]) || undefined,
          note: str(r["비고"]) || undefined,
        }));

      const [eqResult, assetResult] = await Promise.all([
        eqItems.length > 0
          ? bulkUpsertEquipment({ items: eqItems, fileName: uploadedFileName })
          : { created: 0, updated: 0, errors: 0 },
        assetItems.length > 0
          ? bulkUpsertAssets({ items: assetItems, fileName: uploadedFileName })
          : { created: 0, updated: 0, errors: 0 },
      ]);

      setImportResult({ equipment: eqResult, assets: assetResult });

      // 로그 기록
      await createExcelLog({
        userId: currentUser._id as any,
        userName: currentUser.name,
        userEmail: currentUser.email,
        action: "import",
        fileName: uploadedFileName,
        equipmentCount: equipmentRows.length,
        assetCount: assetRows.length,
        importResult: {
          equipmentCreated: eqResult.created,
          equipmentUpdated: eqResult.updated,
          equipmentErrors: eqResult.errors,
          assetCreated: assetResult.created,
          assetUpdated: assetResult.updated,
          assetErrors: assetResult.errors,
        },
      });
    } catch (e: unknown) {
      alert("가져오기 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setEquipmentRows([]);
    setAssetRows([]);
    setIsParsed(false);
    setImportResult(null);
    setStatusFilter(null);
    setUploadedFileName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[70vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-lg">엑셀 가져오기</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                이전에 내보낸 SSFilm 형식의 .xlsx 파일을 업로드해주세요
              </p>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 미리보기 상태일 때만 표시: 에러메시지, 탭, 요약뱃지 */}
          {isParsed && !importResult && (
            <div className="space-y-3">
              {hasErrors && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  오류 항목이 있습니다. 오류 행은 가져오기에서 제외됩니다.
                </div>
              )}

              {/* 탭 */}
              <div className="flex border-b gap-4">
                {(["equipment", "assets"] as const).map((tab) => {
                  const rows = tab === "equipment" ? equipmentRows : assetRows;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-2.5 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === tab ? "border-black text-black" : "border-transparent text-gray-400"
                      }`}
                    >
                      {tab === "equipment" ? "장비목록" : "자산목록"}
                      <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">
                        {rows.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 요약 뱃지 */}
              <SummaryBadges
                rows={activeTab === "equipment" ? equipmentRows : assetRows}
                currentFilter={statusFilter}
                onFilterChange={setStatusFilter}
              />
            </div>
          )}
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto">
          {/* 완료 결과 */}
          {importResult ? (
            <div className="p-8 flex flex-col items-center justify-center gap-6">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <h3 className="text-xl font-bold text-gray-900">가져오기 완료</h3>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-gray-50 rounded-xl p-4 text-center border">
                  <p className="text-xs font-bold text-gray-400 mb-2">장비목록</p>
                  <p className="text-sm">신규 <span className="font-bold text-blue-600">{importResult.equipment.created}</span>건</p>
                  <p className="text-sm">수정 <span className="font-bold text-amber-600">{importResult.equipment.updated}</span>건</p>
                  {importResult.equipment.errors > 0 && (
                    <p className="text-sm">오류 <span className="font-bold text-red-600">{importResult.equipment.errors}</span>건</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center border">
                  <p className="text-xs font-bold text-gray-400 mb-2">자산목록</p>
                  <p className="text-sm">신규 <span className="font-bold text-blue-600">{importResult.assets.created}</span>건</p>
                  <p className="text-sm">수정 <span className="font-bold text-amber-600">{importResult.assets.updated}</span>건</p>
                  {importResult.assets.errors > 0 && (
                    <p className="text-sm">오류 <span className="font-bold text-red-600">{importResult.assets.errors}</span>건</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="bg-black text-white px-8 py-2.5 rounded-xl font-bold text-sm"
              >
                닫기
              </button>
            </div>
          ) : !isParsed ? (
            /* 파일 업로드 영역 */
            <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[300px]">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors w-full max-w-md"
              >
                <Upload className="w-10 h-10 text-gray-400" />
                <p className="font-semibold text-gray-700">클릭하여 파일 선택</p>
                <p className="text-xs text-gray-400">SSFilm_장비목록_*.xlsx 형식</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            /* 미리보기 - 테이블만 */
            <div className="p-6">
              {activeTab === "equipment" ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {["상태", "장비명", "카테고리", "전체수량", "상태(노출)", "오류"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {equipmentRows
                        .filter((row) => !statusFilter || row._status === statusFilter)
                        .map((row, i) => (
                        <tr key={i} className={row._status === "error" ? "bg-red-50" : row._status === "unchanged" ? "opacity-50" : ""}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[row._status]}`}>
                              {STATUS_LABEL[row._status]}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{str(row["장비명"])}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                            {[str(row["카테고리"]), str(row["서브카테고리"])].filter(Boolean).join(" · ")}
                          </td>
                          <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{str(row["전체수량"])}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{str(row["상태"])}</td>
                          <td className="px-3 py-2 text-red-600 whitespace-nowrap">{row._error ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {["상태", "장비명", "자산번호", "시리얼넘버", "상태(자산)", "비고", "오류"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assetRows
                        .filter((row) => !statusFilter || row._status === statusFilter)
                        .map((row, i) => (
                        <tr key={i} className={row._status === "error" ? "bg-red-50" : row._status === "unchanged" ? "opacity-50" : ""}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[row._status]}`}>
                              {STATUS_LABEL[row._status]}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{str(row["장비명"])}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{str(row["자산번호"])}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{str(row["시리얼넘버"])}</td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{str(row["상태"])}</td>
                          <td className="px-3 py-2 text-gray-400 whitespace-nowrap max-w-[160px] truncate">{str(row["비고"])}</td>
                          <td className="px-3 py-2 text-red-600 whitespace-nowrap">{row._error ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {isParsed && !importResult && (
          <div className="px-6 py-4 border-t flex-shrink-0">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs text-gray-400">
                적용 대상: 장비 {applyableEqCount}건 · 자산 {applyableAssetCount}건
                {hasErrors && " (오류 제외됨)"}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> 다른 파일 선택
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className="border px-4 py-2 rounded-lg text-sm">
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={isImporting || (applyableEqCount === 0 && applyableAssetCount === 0)}
                className="bg-black text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isImporting ? "처리 중..." : "확인 (DB 반영)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
