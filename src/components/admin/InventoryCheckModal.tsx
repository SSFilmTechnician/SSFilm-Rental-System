import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { X, Search, Calendar as CalendarIcon, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Equipment {
  _id: Id<"equipment">;
  name: string;
  totalQuantity: number;
}

interface ReservationItem {
  equipmentId: Id<"equipment">;
  name: string;
  quantity: number;
  checkedOut: boolean;
  returned: boolean;
}

interface Reservation {
  _id: Id<"reservations">;
  userId: Id<"users">;
  reservationNumber: string;
  status: string;
  purpose: string;
  purposeDetail: string;
  startDate: string;
  endDate: string;
  leaderName: string;
  leaderPhone: string;
  leaderStudentId: string;
  items: ReservationItem[];
}

// 화면에 보여줄 데이터 구조
interface ReservationDisplayData {
  id: string;
  name: string;
  student_id: string;
  phone: string;
  quantity: number;
  status: string;
  start_datetime: string;
  end_datetime: string;
}

interface DailyStock {
  date: string;
  reserved: number;
  remain: number;
  reservations: ReservationDisplayData[];
}

export function InventoryCheckModal({ isOpen, onClose }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateInfo, setSelectedDateInfo] = useState<DailyStock | null>(
    null
  );

  // Convex 쿼리
  const searchResults = useQuery(
    api.admin.searchEquipment,
    searchTerm ? { searchTerm } : "skip"
  ) as Equipment[] | undefined;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(
    year,
    month,
    0
  ).getDate()}`;

  const reservations = useQuery(
    api.admin.getReservationsForPeriod,
    selectedEquip ? { startDate, endDate } : "skip"
  ) as Reservation[] | undefined;

  // UTC ISO String -> KST 날짜 문자열 (YYYY-MM-DD)
  const parseToKST = (isoString: string) => {
    try {
      if (!isoString) return "";
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  // 화면 표시용 짧은 날짜 포맷 (01.15 10:00)
  const formatShortDate = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${month}.${day} ${hour}:${min}`;
  };

  // 월별 재고 계산
  const stockData = useMemo(() => {
    if (!selectedEquip || !reservations) return {};

    const targetEquipId = String(selectedEquip._id);
    const totalQty = selectedEquip.totalQuantity;

    const stockMap: Record<string, DailyStock> = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;

      const activeRes = reservations.filter((r) => {
        const s = parseToKST(r.startDate);
        const e = parseToKST(r.endDate);

        const hasItem = r.items.some(
          (i) => String(i.equipmentId) === targetEquipId
        );

        return hasItem && dateStr >= s && dateStr <= e;
      });

      let usedCount = 0;
      const resList: ReservationDisplayData[] = activeRes.map((r) => {
        const item = r.items.find(
          (i) => String(i.equipmentId) === targetEquipId
        );
        const qty = item ? item.quantity : 0;

        if (r.status !== "returned") {
          usedCount += qty;
        }

        return {
          id: r._id,
          name: r.leaderName || "이름없음",
          student_id: r.leaderStudentId || "",
          phone: r.leaderPhone || "",
          quantity: qty,
          status: r.status,
          start_datetime: r.startDate,
          end_datetime: r.endDate,
        };
      });

      stockMap[dateStr] = {
        date: dateStr,
        reserved: usedCount,
        remain: totalQty - usedCount,
        reservations: resList,
      };
    }

    return stockMap;
  }, [selectedEquip, reservations, year, month]);

  const handleMonthChange = (gap: number) => {
    setCurrentDate(
      new Date(currentDate.setMonth(currentDate.getMonth() + gap))
    );
    setSelectedDateInfo(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 whitespace-nowrap">
            대기
          </span>
        );
      case "approved":
        return (
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap">
            승인
          </span>
        );
      case "rented":
        return (
          <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 whitespace-nowrap">
            반출
          </span>
        );
      case "returned":
        return (
          <span className="text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">
            반납
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" /> 장비별 스케줄 조회
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽: 검색 */}
          <div className="w-1/3 border-r p-4 flex flex-col gap-4 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="장비명 검색 (예: FX3)"
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-black outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults?.map((equip) => (
                <button
                  key={equip._id}
                  onClick={() => {
                    setSelectedEquip(equip);
                    setSearchTerm("");
                    setSelectedDateInfo(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    String(selectedEquip?._id) === String(equip._id)
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white hover:bg-gray-100 border-gray-200"
                  }`}
                >
                  <div className="font-bold">{equip.name}</div>
                  <div className="text-xs opacity-70">
                    총 보유량: {equip.totalQuantity}개
                  </div>
                </button>
              ))}
              {!searchTerm && (
                <div className="mt-10 text-center text-gray-400 text-sm">
                  검색어를 입력하면 목록이 나타납니다.
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 달력 */}
          <div className="w-2/3 p-6 flex flex-col overflow-y-auto">
            {selectedEquip ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedEquip.name}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      재고 현황
                    </span>
                  </h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleMonthChange(-1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      &lt;
                    </button>
                    <span className="font-bold text-lg">
                      {currentDate.getFullYear()}.{currentDate.getMonth() + 1}
                    </span>
                    <button
                      onClick={() => handleMonthChange(1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                <>
                  <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                    {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                      <div
                        key={d}
                        className="text-xs font-bold text-gray-500 py-1"
                      >
                        {d}
                      </div>
                    ))}

                    {Array.from({
                      length: new Date(
                        currentDate.getFullYear(),
                        currentDate.getMonth(),
                        1
                      ).getDay(),
                    }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="h-20 bg-gray-50/30 rounded-lg"
                      ></div>
                    ))}

                    {Object.values(stockData).map((day) => {
                      const isFull = day.remain <= 0;
                      const isSafe = day.remain === selectedEquip.totalQuantity;

                      return (
                        <div
                          key={day.date}
                          onClick={() => setSelectedDateInfo(day)}
                          className={`h-24 border rounded-lg p-1 flex flex-col justify-between cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 ${
                            selectedDateInfo?.date === day.date
                              ? "ring-2 ring-blue-600 bg-blue-50"
                              : "bg-white"
                          }`}
                        >
                          <span className="text-sm font-bold text-gray-700">
                            {parseInt(day.date.split("-")[2])}
                          </span>
                          <div
                            className={`text-xs font-bold text-center py-1 rounded ${
                              isFull
                                ? "bg-red-100 text-red-600"
                                : isSafe
                                ? "bg-gray-100 text-gray-400"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {day.remain} / {selectedEquip.totalQuantity}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t pt-4 h-40 overflow-y-auto">
                    <h4 className="text-sm font-bold text-gray-500 mb-2">
                      {selectedDateInfo
                        ? `${selectedDateInfo.date} 예약자 명단`
                        : "날짜를 클릭하면 상세 내역이 보입니다."}
                    </h4>
                    {selectedDateInfo &&
                      (selectedDateInfo.reservations.length === 0 ? (
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> 예약 없음 (전량
                          보유 중)
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {selectedDateInfo.reservations.map((res, idx) => (
                            <li
                              key={idx}
                              className="bg-gray-50 p-2.5 rounded border border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
                            >
                              {/* 좌측: 이름 (학번, 번호) */}
                              <div className="flex items-center gap-2 overflow-hidden">
                                {getStatusBadge(res.status)}
                                <div className="flex items-baseline gap-2">
                                  <span className="font-bold text-sm text-gray-900 whitespace-nowrap">
                                    {res.name}
                                  </span>
                                  <span className="text-xs text-gray-400 whitespace-nowrap">
                                    ({res.student_id || "-"}, {res.phone})
                                  </span>
                                </div>
                              </div>

                              {/* 우측: 시간 [수량] */}
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                <span className="text-xs text-red-600 font-mono tracking-tight">
                                  {formatShortDate(res.start_datetime)} ~{" "}
                                  {formatShortDate(res.end_datetime)}
                                </span>
                                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-100">
                                  {res.quantity}개
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ))}
                  </div>
                </>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>왼쪽에서 장비를 검색하여 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
