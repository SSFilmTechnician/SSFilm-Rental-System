import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";

interface Props {
  equipmentId: Id<"equipment">;
  compact?: boolean;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getDayColors(remaining: number, total: number) {
  if (total === 0) return { bg: "", text: "text-gray-500", badge: "" };
  if (remaining === 0)
    return {
      bg: "bg-red-50 border border-red-100",
      text: "text-red-700",
      badge: "bg-red-100 text-red-700",
    };
  if (remaining < total)
    return {
      bg: "bg-amber-50 border border-amber-100",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
    };
  return {
    bg: "bg-emerald-50 border border-emerald-100",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  };
}

// purposeDetail에서 [상세 내용] 섹션만 추출
function extractDetailContent(purposeDetail: string): string {
  const match = purposeDetail.match(/\[상세 내용\]\s*([\s\S]*?)(?=\[문의 사항\]|$)/);
  return match ? match[1].trim() : purposeDetail.trim();
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return { label: "승인 대기", color: "bg-yellow-100 text-yellow-700" };
    case "approved":
      return { label: "승인됨", color: "bg-blue-100 text-blue-700" };
    case "rented":
      return { label: "대여중", color: "bg-green-100 text-green-700" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-600" };
  }
}

export default function EquipmentAvailabilityCalendar({
  equipmentId,
  compact = false,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // 캘린더 그리드 시작/끝 (이전달·다음달 날짜 포함)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const startDateStr = format(gridStart, "yyyy-MM-dd");
  const endDateStr = format(gridEnd, "yyyy-MM-dd");

  const data = useQuery(api.reservations.getEquipmentCalendarData, {
    equipmentId,
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDateStr, endDateStr]
  );

  // 날짜별 잔여 수량 및 예약 목록 계산
  const dailyInfo = useMemo(() => {
    if (!data) return {};
    const result: Record<
      string,
      {
        remaining: number;
        total: number;
        reservations: typeof data.reservations;
      }
    > = {};
    calendarDays.forEach((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      // DB 날짜는 "YYYY-MM-DD HH:MM" 형식이므로 앞 10자리(날짜)만 비교
      const overlapping = data.reservations.filter((r) => {
        const rStart = r.startDate.substring(0, 10);
        const rEnd = r.endDate.substring(0, 10);
        return rStart <= dateStr && rEnd >= dateStr;
      });
      const occupied = overlapping.reduce((sum, r) => sum + r.quantity, 0);
      result[dateStr] = {
        remaining: Math.max(0, data.totalQuantity - occupied),
        total: data.totalQuantity,
        reservations: overlapping,
      };
    });
    return result;
  }, [data, calendarDays]);

  const selectedInfo = selectedDate ? dailyInfo[selectedDate] : null;

  const cellSize = compact ? "min-h-[44px]" : "min-h-[56px]";

  return (
    <div className="space-y-3">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => {
            setCurrentMonth(subMonths(currentMonth, 1));
            setSelectedDate(null);
          }}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {format(currentMonth, "yyyy년 M월", { locale: ko })}
        </span>
        <button
          onClick={() => {
            setCurrentMonth(addMonths(currentMonth, 1));
            setSelectedDate(null);
          }}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* 로딩 */}
      {data === undefined && (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400 animate-pulse">
          불러오는 중...
        </div>
      )}

      {data !== undefined && (
        <>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-0.5">
            {WEEKDAYS.map((d, i) => (
              <div
                key={d}
                className={`text-center text-[11px] font-semibold py-1 ${
                  i === 0
                    ? "text-red-400"
                    : i === 6
                      ? "text-blue-400"
                      : "text-gray-400"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const info = dailyInfo[dateStr];
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const todayHighlight = isToday(day);
              const isSelected = selectedDate === dateStr;
              const colors =
                info && inCurrentMonth
                  ? getDayColors(info.remaining, info.total)
                  : { bg: "", text: "text-gray-400", badge: "" };

              return (
                <button
                  key={dateStr}
                  onClick={() =>
                    setSelectedDate(isSelected ? null : dateStr)
                  }
                  className={[
                    "relative flex flex-col items-center justify-start rounded-xl p-1 transition-all duration-150",
                    cellSize,
                    inCurrentMonth ? "" : "opacity-25 pointer-events-none",
                    isSelected
                      ? "ring-2 ring-blue-400 ring-offset-1 shadow-sm"
                      : "",
                    info && inCurrentMonth ? colors.bg : "hover:bg-gray-50",
                    inCurrentMonth && !isSelected
                      ? "hover:scale-105 hover:shadow-sm"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* 날짜 숫자 */}
                  <span
                    className={[
                      "flex items-center justify-center text-xs font-medium w-5 h-5 rounded-full",
                      todayHighlight && inCurrentMonth
                        ? "bg-blue-600 text-white font-bold"
                        : inCurrentMonth
                          ? colors.text
                          : "text-gray-300",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {format(day, "d")}
                  </span>

                  {/* 잔여 수량 배지 */}
                  {info && inCurrentMonth && (
                    <span
                      className={`mt-0.5 text-[9px] font-semibold px-1 rounded ${colors.badge}`}
                    >
                      {info.remaining}/{info.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-3 justify-end pt-1">
            {[
              { bg: "bg-emerald-100", label: "여유" },
              { bg: "bg-amber-100", label: "일부 대여중" },
              { bg: "bg-red-100", label: "품절" },
            ].map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded ${bg}`} />
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            ))}
          </div>

          {/* 선택된 날짜 상세 패널 */}
          {selectedDate && selectedInfo && (
            <div className="mt-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-fadeIn">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {format(parseISO(selectedDate), "M월 d일 (EEE)", {
                      locale: ko,
                    })}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    잔여{" "}
                    <span
                      className={
                        selectedInfo.remaining === 0
                          ? "text-red-600 font-bold"
                          : selectedInfo.remaining < selectedInfo.total
                            ? "text-amber-600 font-bold"
                            : "text-emerald-600 font-bold"
                      }
                    >
                      {selectedInfo.remaining}
                    </span>
                    /{selectedInfo.total}대
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {selectedInfo.reservations.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  예약 없음 — 대여 가능합니다
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedInfo.reservations.map((r, i) => {
                    const { label, color } = statusLabel(r.status);
                    const detail = r.purposeDetail
                      ? extractDetailContent(r.purposeDetail)
                      : "";
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm"
                      >
                        {/* 이름 + 상태 */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-semibold text-sm text-gray-900">
                            {r.leaderName}
                          </p>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${color}`}
                          >
                            {label}
                          </span>
                        </div>

                        {/* 상세 내용 */}
                        {detail && (
                          <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                            {detail}
                          </p>
                        )}

                        {/* 반출 / 반납 시간 */}
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <span className="font-medium text-gray-500">반출</span>
                          <span>{r.startDate}</span>
                          <span className="mx-0.5">·</span>
                          <span className="font-medium text-gray-500">반납</span>
                          <span>{r.endDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
