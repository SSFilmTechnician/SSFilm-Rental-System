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

  // purposeDetail에서 프로젝트명 추출
  const getProjectTitle = (text: string) => {
    if (!text) return "";

    // 줄바꿈으로 분리
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // [문의 사항], [문의] 등으로 시작하는 줄 찾기
    const inquiryIndex = lines.findIndex((line) => line.startsWith("[문의"));

    // [문의] 줄이 있으면 그 바로 앞 줄이 프로젝트명
    if (inquiryIndex > 0) {
      return lines[inquiryIndex - 1];
    }

    // [문의] 줄이 없으면 마지막에서 두 번째 줄 (마지막은 장소)
    if (lines.length >= 2) {
      return lines[lines.length - 2];
    }

    // 줄이 1개면 그대로 반환
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
          <span className="flex items-center text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs font-bold">
            <Clock className="w-3 h-3 mr-1" />
            승인대기
          </span>
        );
      case "approved":
        return (
          <span className="flex items-center text-blue-700 bg-blue-100 px-2 py-1 rounded text-xs font-bold">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            예약승인
          </span>
        );
      case "rented":
        return (
          <span className="flex items-center text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold">
            대여중
          </span>
        );
      case "returned":
        return (
          <span className="flex items-center text-gray-700 bg-gray-100 px-2 py-1 rounded text-xs font-bold">
            반납완료
          </span>
        );
      case "rejected":
        return (
          <span className="flex items-center text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold">
            <XCircle className="w-3 h-3 mr-1" />
            거절됨
          </span>
        );
      default:
        return <span className="text-gray-500 text-xs">{status}</span>;
    }
  };

  // 1. 로딩 중 처리
  if (userProfile === undefined || reservations === undefined) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 2. 데이터 없음 처리
  if (userProfile === null) {
    return (
      <div className="text-center py-20 text-gray-400">
        유저 정보를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 pb-20">
      <h1 className="text-2xl font-bold mb-6">마이페이지</h1>

      {/* 내 정보 영역 (수정 불가) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-10">
        {/* 헤더 */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 text-gray-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">내 정보</h2>
            <p className="text-xs text-gray-500">
              {userProfile.role === "admin"
                ? "관리자 계정입니다."
                : "등록된 학생 정보를 확인합니다."}
            </p>
          </div>
        </div>

        {/* 수정 불가 안내 배너 */}
        <div className="bg-blue-50 px-6 py-3 flex items-start gap-3 border-b border-blue-100">
          <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium leading-relaxed">
            개인정보 도용 방지를 위해 정보 수정이 제한되어 있습니다.
            <br />
            개명, 연락처 변경 등이 필요한 경우{" "}
            <span className="underline font-bold cursor-pointer">
              학과 사무실
            </span>
            에 문의해주세요.
          </p>
        </div>

        {/* 정보 표시 (읽기 전용 폼) */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              이름
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium">
              {userProfile.name || "-"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              학번
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium">
              {userProfile.studentId || "-"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              연락처
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium">
              {userProfile.phone || "-"}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
              이메일
            </label>
            <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-medium truncate">
              {userProfile.email || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* 예약 신청 내역 (기존 유지) */}
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        예약 신청 내역
        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
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
            // 프로젝트명 추출 (purposeDetail에서 파싱)
            const projectTitle = getProjectTitle(res.purposeDetail);
            // 프로젝트명이 있으면 사용, 없으면 purpose 사용
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
                    ? "shadow-md border-black"
                    : "hover:border-gray-400"
                }`}
              >
                <div
                  onClick={() => toggleExpand(res._id)}
                  className="p-5 cursor-pointer flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 mb-1">
                      {getStatusBadge(res.status)}
                      <span className="text-xs text-gray-400 font-mono">
                        #{res.reservationNumber?.slice(-4)}
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-gray-500">
                        {new Date(res._creationTime).toLocaleDateString()} 신청
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">
                      {mainTitle}
                    </h4>
                    <div className="text-sm text-gray-500 mt-0.5 font-medium">
                      {subTitle}
                    </div>
                  </div>
                  <div className="text-gray-400 flex flex-col items-end gap-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(res.startDate)} ~ {formatDate(res.endDate)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-6 animate-fadeIn">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
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
                      <ul className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                        {res.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="p-3 flex justify-between items-center text-sm hover:bg-gray-50"
                          >
                            <span className="font-medium text-gray-700">
                              {item.name}
                            </span>
                            <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
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
                              "_blank"
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 hover:text-black hover:border-black transition-all shadow-sm"
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
