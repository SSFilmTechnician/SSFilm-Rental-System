import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  Printer,
  User,
  ShieldAlert,
  Loader2,
} from "lucide-react";

export default function MyPage() {
  const userProfile = useQuery(api.users.getMyProfile);
  const reservations = useQuery(api.reservations.getMyReservations);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getMonth() + 1}.${date.getDate()} (${date
      .getHours()
      .toString()
      .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")})`;
  };

  const getProjectTitle = (text: string) => {
    if (!text) return "";
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    const inquiryIndex = lines.findIndex((line) => line.startsWith("[문의"));
    if (inquiryIndex > 0) {
      return lines[inquiryIndex - 1];
    }
    if (lines.length >= 2) {
      return lines[lines.length - 2];
    }
    return lines[0] || "";
  };

  const canShowPrintButton = (status: string) => {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    return s === "approved" || s === "rented" || s === "returned";
  };

  const getStatusBadge = (status: string) => {
    const s = status ? status.toLowerCase().trim() : "";
    switch (s) {
      case "pending":
        return (
          <span className="inline-flex items-center text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
            <Clock className="w-3 h-3 mr-1" />
            승인대기
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            예약승인
          </span>
        );
      case "rented":
        return (
          <span className="inline-flex items-center text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
            대여중
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
            반납완료
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
            <XCircle className="w-3 h-3 mr-1" />
            거절됨
          </span>
        );
      default:
        return <span className="text-gray-500 text-xs">{status}</span>;
    }
  };

  if (userProfile === undefined || reservations === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (userProfile === null) {
    return (
      <div className="text-center py-20 text-gray-400">
        유저 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-5 py-6 md:py-10 pb-24">
      <h1 className="text-xl md:text-2xl font-bold mb-5 md:mb-6">마이페이지</h1>

      {/* 내 정보 영역 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8 md:mb-10">
        <div className="bg-gray-50 px-5 py-4 border-b border-gray-200 flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 text-gray-400 flex-shrink-0">
            <User className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-gray-900">
              내 정보
            </h2>
            <p className="text-xs text-gray-500">
              {userProfile.role === "admin"
                ? "관리자 계정"
                : "등록된 학생 정보 확인"}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 px-5 py-3 flex items-start gap-3 border-b border-blue-100">
          <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            정보 수정이 제한되어 있습니다. 변경이 필요한 경우{" "}
            <span className="underline font-bold cursor-pointer">
              학과 사무실
            </span>
            에 문의해주세요.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              이름
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium text-sm md:text-base">
              {userProfile.name || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              학번
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium text-sm md:text-base">
              {userProfile.studentId || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              연락처
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium text-sm md:text-base">
              {userProfile.phone || "-"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              이메일
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-medium truncate text-sm md:text-base">
              {userProfile.email || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* 예약 신청 내역 */}
      <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
        예약 신청 내역
        <span className="text-xs md:text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {reservations.length}건
        </span>
      </h3>

      {reservations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          아직 신청한 예약이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((res) => {
            const isExpanded = expandedId === res._id;
            const projectTitle = getProjectTitle(res.purposeDetail);
            const mainTitle = projectTitle || res.purpose;
            const firstItemName = res.items[0]?.name || "장비";
            const extraCount = res.items.length - 1;
            const subTitle =
              extraCount > 0
                ? `${firstItemName} 외 ${extraCount}건`
                : firstItemName;

            return (
              <div
                key={res._id}
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 ${
                  isExpanded
                    ? "shadow-md border-black ring-1 ring-black/5"
                    : "hover:border-gray-400"
                }`}
              >
                <div
                  onClick={() => toggleExpand(res._id)}
                  className="p-4 md:p-5 cursor-pointer flex justify-between items-start gap-3 bg-white hover:bg-gray-50 transition-colors active:scale-[0.99] origin-center touch-manipulation"
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* 상단: 뱃지 + 예약번호 + 날짜 (한 줄로 깔끔하게) */}
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      {getStatusBadge(res.status)}
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400 font-mono tracking-tight">
                        #{res.reservationNumber?.slice(-4)}
                      </span>
                      <span className="text-gray-400">
                        {new Date(res._creationTime).toLocaleDateString()}
                      </span>
                    </div>

                    {/* 제목 영역: 너비 전체 사용, 줄바꿈 개선 */}
                    <div>
                      <h4 className="font-bold text-base md:text-lg text-gray-900 leading-snug break-keep">
                        {mainTitle}
                      </h4>
                      <div className="text-sm text-gray-500 font-medium truncate mt-0.5">
                        {subTitle}
                      </div>
                    </div>

                    {/* 모바일 날짜: 제목 아래에 배치하여 간섭 제거 */}
                    <div className="flex sm:hidden items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1.5 rounded w-fit mt-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium">
                        {formatDate(res.startDate)} ~ {formatDate(res.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* 우측: PC 날짜 + 화살표 */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 pl-2">
                    {/* PC에서만 보이는 날짜 */}
                    <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {formatDate(res.startDate)} ~ {formatDate(res.endDate)}
                    </span>
                    <div className="text-gray-400 mt-1 p-1">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 md:p-5 space-y-5 animate-fadeIn">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <Users className="w-3 h-3" /> 신청 상세 내용
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {res.purposeDetail || "상세 내용 없음"}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                        상세 장비 목록
                      </div>
                      <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 shadow-sm">
                        {res.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="p-3 flex justify-between items-center text-sm"
                          >
                            <span className="font-medium text-gray-700 line-clamp-1 mr-2">
                              {item.name}
                            </span>
                            <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded text-xs whitespace-nowrap">
                              {item.quantity}개
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {canShowPrintButton(res.status) && (
                      <div className="flex justify-end pt-2 border-t border-gray-200 mt-4">
                        <button
                          onClick={() =>
                            window.open(
                              `/print/reservation/${res._id}`,
                              "_blank",
                            )
                          }
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:text-black hover:border-black transition-all shadow-sm active:scale-[0.98]"
                        >
                          <Printer className="w-4 h-4" />
                          예약 장비리스트 출력
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
