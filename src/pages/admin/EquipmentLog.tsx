import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Edit, Plus, Trash, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

type FilterType = "all" | "equipment" | "asset";
type FilterSource = "all" | "manual" | "excel_import";
type FilterPeriod = "today" | "week" | "month" | "all";

export default function EquipmentLog() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterSource, setFilterSource] = useState<FilterSource>("all");
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // 기간 필터 계산
  const getDateRange = () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    switch (filterPeriod) {
      case "today":
        return { startDate: now - day, endDate: now };
      case "week":
        return { startDate: now - 7 * day, endDate: now };
      case "month":
        return { startDate: now - 30 * day, endDate: now };
      case "all":
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const { startDate, endDate } = getDateRange();

  const logsData = useQuery(api.changeHistory.getChanges, {
    limit: 50,
    cursor,
    targetType: filterType === "all" ? undefined : filterType,
    source: filterSource === "all" ? undefined : filterSource,
    startDate,
    endDate,
  });

  const logs = logsData?.logs || [];
  const hasMore = logsData?.hasMore || false;
  const nextCursor = logsData?.nextCursor;

  // 날짜별로 그룹화
  const groupByDate = () => {
    const groups: Record<string, typeof logs> = {};

    logs.forEach((log) => {
      const date = new Date(log.timestamp);
      const dateKey = date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return groups;
  };

  const groupedLogs = groupByDate();

  // 배치 묶음 토글
  const toggleBatch = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  // 배치별로 그룹화
  const groupByBatch = (logs: typeof logsData.logs) => {
    const batches: Record<string, typeof logs> = {};
    const singles: typeof logs = [];

    logs.forEach((log) => {
      if (log.batchId) {
        if (!batches[log.batchId]) {
          batches[log.batchId] = [];
        }
        batches[log.batchId].push(log);
      } else {
        singles.push(log);
      }
    });

    return { batches, singles };
  };

  // 아이콘 선택
  const getIcon = (action: string, source: string) => {
    if (source === "excel_import") return <FileText className="w-4 h-4" />;
    if (action === "create") return <Plus className="w-4 h-4" />;
    if (action === "update") return <Edit className="w-4 h-4" />;
    if (action === "delete") return <Trash className="w-4 h-4" />;
    if (action === "status_change") return <RefreshCw className="w-4 h-4" />;
    return <Edit className="w-4 h-4" />;
  };

  // 액션 레이블
  const getActionLabel = (action: string, source: string) => {
    if (source === "excel_import") return "엑셀 Import";
    if (action === "create") return "신규 추가";
    if (action === "update") return "수정";
    if (action === "delete") return "삭제";
    if (action === "status_change") return "상태 변경";
    return "수정";
  };

  // 시간 포맷팅
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            장비 관리로 돌아가기
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">장비 관리 변경 이력</h1>
          <p className="text-sm text-gray-500 mt-2">
            장비 및 자산의 모든 변경사항을 추적하여 확인할 수 있습니다.
          </p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 유형 필터 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">유형</label>
              <div className="flex gap-1.5">
                {(['all', 'equipment', 'asset'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      filterType === type
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {type === 'all' ? '전체' : type === 'equipment' ? '장비' : '자산'}
                  </button>
                ))}
              </div>
            </div>

            {/* 경로 필터 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">경로</label>
              <div className="flex gap-1.5">
                {(['all', 'manual', 'excel_import'] as FilterSource[]).map((source) => (
                  <button
                    key={source}
                    onClick={() => setFilterSource(source)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      filterSource === source
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {source === 'all' ? '전체' : source === 'manual' ? '수동 수정' : '엑셀 Import'}
                  </button>
                ))}
              </div>
            </div>

            {/* 기간 필터 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">기간</label>
              <div className="flex gap-1.5">
                {(['today', 'week', 'month', 'all'] as FilterPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setFilterPeriod(period)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      filterPeriod === period
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {period === 'today' ? '오늘' : period === 'week' ? '최근 1주' : period === 'month' ? '최근 1개월' : '전체'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 타임라인 */}
        <div className="space-y-6">
          {Object.entries(groupedLogs).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400">변경 이력이 없습니다.</p>
            </div>
          ) : (
            Object.entries(groupedLogs).map(([dateKey, dateLogs]) => {
              const { batches, singles } = groupByBatch(dateLogs);

              return (
                <div key={dateKey}>
                  {/* 날짜 헤더 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gray-300"></div>
                    <span className="text-sm font-bold text-gray-500">{dateKey}</span>
                    <div className="h-px flex-1 bg-gray-300"></div>
                  </div>

                  {/* 로그 항목 */}
                  <div className="space-y-3">
                    {/* 배치 항목 */}
                    {Object.entries(batches).map(([batchId, batchLogs]) => {
                      const firstLog = batchLogs[0];
                      const isExpanded = expandedBatches.has(batchId);
                      const displayLogs = isExpanded ? batchLogs : batchLogs.slice(0, 3);

                      return (
                        <div key={batchId} className="bg-white rounded-xl border border-gray-200 p-4">
                          {/* 배치 헤더 */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="mt-1 p-2 bg-blue-50 rounded-lg text-blue-600">
                              {getIcon(firstLog.action, firstLog.source)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs text-gray-500">
                                  {firstLog.versionMinor === 0 ? `v${firstLog.versionMajor}` : `v${firstLog.versionMajor}.${firstLog.versionMinor}`}
                                </span>
                                <span className="text-gray-300">·</span>
                                <span className="text-sm text-gray-600">{formatTime(firstLog.timestamp)}</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {firstLog.userName}
                                </span>
                                <span className="text-xs text-gray-400">({firstLog.userEmail})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">
                                  {getActionLabel(firstLog.action, firstLog.source)}
                                </span>
                                {firstLog.sourceDetail && (
                                  <span className="text-xs text-gray-500">— {firstLog.sourceDetail}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 배치 내 변경사항 */}
                          <div className="space-y-2 ml-14">
                            {displayLogs.map((log, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium text-gray-700">{log.targetName}</span>
                                {log.changes.map((change, cIdx) => (
                                  <div key={cIdx} className="ml-3 text-gray-600">
                                    <span className="text-gray-500">{change.fieldLabel}:</span>
                                    {change.oldValue && (
                                      <span className="line-through text-gray-400 ml-1">{change.oldValue}</span>
                                    )}
                                    {change.oldValue && <span className="mx-1">→</span>}
                                    <span className="font-semibold text-gray-900">{change.newValue}</span>
                                  </div>
                                ))}
                              </div>
                            ))}

                            {batchLogs.length > 3 && (
                              <button
                                onClick={() => toggleBatch(batchId)}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    접기
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    외 {batchLogs.length - 3}건 더보기
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* 단일 항목 */}
                    {singles.map((log) => (
                      <div key={log._id} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 p-2 bg-gray-50 rounded-lg text-gray-600">
                            {getIcon(log.action, log.source)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-gray-500">
                                {log.versionMinor === 0 ? `v${log.versionMajor}` : `v${log.versionMajor}.${log.versionMinor}`}
                              </span>
                              <span className="text-gray-300">·</span>
                              <span className="text-sm text-gray-600">{formatTime(log.timestamp)}</span>
                              <span className="text-sm font-semibold text-gray-900">{log.userName}</span>
                              <span className="text-xs text-gray-400">({log.userEmail})</span>
                            </div>
                            <div className="mb-2">
                              <span className="text-sm font-bold">
                                {getActionLabel(log.action, log.source)}
                              </span>
                              <span className="text-sm text-gray-700 ml-2">— {log.targetName}</span>
                            </div>
                            <div className="space-y-1 ml-3">
                              {log.changes.map((change, idx) => (
                                <div key={idx} className="text-sm text-gray-600">
                                  <span className="text-gray-500">{change.fieldLabel}:</span>
                                  {change.oldValue && (
                                    <span className="line-through text-gray-400 ml-1">{change.oldValue}</span>
                                  )}
                                  {change.oldValue && <span className="mx-1">→</span>}
                                  <span className="font-semibold text-gray-900">{change.newValue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* 더 보기 버튼 */}
          {hasMore && (
            <div className="text-center pt-6">
              <button
                onClick={() => setCursor(nextCursor)}
                className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                이전 기록 더 보기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
