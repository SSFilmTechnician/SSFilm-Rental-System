import { useParams, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface EquipmentDetail {
  name: string;
  description: string;
  sortOrder: number;
  isGroupPrint: boolean;
}

interface PrintItem {
  equipmentId: Id<"equipment">;
  name: string;
  quantity: number;
  checkedOut: boolean;
  returned: boolean;
  equipment: EquipmentDetail | null;
  assignedSerialNumbers?: string[];
  serialNumber?: string;  // 개별 아이템용
}

interface PrintReservation {
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
  items: PrintItem[];
  _creationTime: number;
}

export default function ReservationPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const type = searchParams.get("type") || "reservation";
  const isRental = type === "rental";
  const isReservation = type === "reservation";

  const queryData = useQuery(
    api.reservations.getById,
    id ? { id: id as Id<"reservations"> } : "skip"
  ) as PrintReservation | null | undefined;

  // 데이터를 useMemo로 메모이제이션하여 인쇄 중에도 유지
  const data = useMemo(() => {
    if (queryData && queryData !== null) {
      return queryData;
    }
    return queryData;
  }, [queryData]);

  // 처리된 아이템 목록도 메모이제이션
  const processedItems = useMemo(() => {
    if (!data || !data.items) return [];

    const sortedItems = data.items.slice().sort((a, b) => {
      const orderA = a.equipment?.sortOrder ?? 999;
      const orderB = b.equipment?.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.equipment?.name || "").localeCompare(b.equipment?.name || "");
    });

    const items: PrintItem[] = [];
    sortedItems.forEach((item) => {
      if (item.equipment?.isGroupPrint) {
        // 그룹 인쇄: 모든 시리얼 번호를 쉼표로 연결
        items.push({
          ...item,
          serialNumber: item.assignedSerialNumbers?.join(", ") || "",
        });
      } else {
        // 개별 인쇄: 각 시리얼 번호별로 행 생성
        const serials = item.assignedSerialNumbers || [];
        for (let i = 0; i < item.quantity; i++) {
          items.push({
            ...item,
            quantity: 1,
            serialNumber: serials[i] || "",  // 배정된 번호가 있으면 사용
          });
        }
      }
    });
    return items;
  }, [data]);

  // 로딩 중
  if (data === undefined) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
      </div>
    );
  }

  // 데이터 없음
  if (data === null) {
    return (
      <div className="p-10 text-center text-red-600">
        예약 정보를 찾을 수 없습니다.
      </div>
    );
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(
      2,
      "0"
    )}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getProjectTitle = (text: string) => {
    if (!text) return "-";

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
    return lines[0] || "-";
  };

  return (
    <>
      <style>
        {`
          @media print {
            @page { margin: 15mm; size: A4; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }

            /* 테이블 헤더가 페이지 넘어갈 때마다 반복되도록 설정 */
            thead { display: table-header-group; }

            /* 테이블 행이 중간에서 잘리지 않도록 설정 */
            tr { break-inside: avoid; page-break-inside: avoid; }

            /* 서명란이 찢어지지 않고 통째로 넘어가도록 설정 */
            .signature-section { break-inside: avoid; page-break-inside: avoid; }
          }
        `}
      </style>

      {/* 전체 컨테이너: 높이 제한 제거 (min-h 관련 삭제) */}
      <div className="max-w-[210mm] mx-auto bg-white p-10 text-black font-sans leading-relaxed print:p-0 print:w-full">
        {/* 인쇄 버튼 */}
        <div className="print:hidden mb-6 flex justify-end">
          <button
            onClick={() => {
              // 데이터가 완전히 로딩된 후 인쇄 실행
              setTimeout(() => {
                window.print();
              }, 100);
            }}
            className="bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800"
          >
            인쇄하기
          </button>
        </div>

        {/* 1. 헤더 (타이틀) */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-extrabold tracking-widest mb-2">
            {isRental ? "반출 장비 리스트" : "예약 장비 리스트"}
          </h1>
          <p className="text-sm text-gray-500">
            No. {data.reservationNumber} | 출력일:{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* 2. 대여자 정보 */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <tbody>
              <tr>
                <th className="border border-gray-300 bg-gray-50 p-2 w-24 text-center font-bold">
                  대여자
                </th>
                <td className="border border-gray-300 p-2 font-bold">
                  {data.leaderName} ({data.leaderStudentId})
                </td>
                <th className="border border-gray-300 bg-gray-50 p-2 w-24 text-center font-bold">
                  연락처
                </th>
                <td className="border border-gray-300 p-2">
                  {data.leaderPhone}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 p-2 text-center font-bold">
                  대여 기간
                </th>
                <td
                  className="border border-gray-300 p-2 font-bold"
                  colSpan={3}
                >
                  {formatDate(data.startDate)} ~ {formatDate(data.endDate)}
                </td>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 p-2 text-center font-bold">
                  프로젝트명
                </th>
                <td className="border border-gray-300 p-2" colSpan={3}>
                  {getProjectTitle(data.purposeDetail)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. 장비 목록 */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-1 w-10 text-center">
                  No.
                </th>
                <th className="border border-gray-300 p-1 text-left pl-3">
                  장비명 (구성품)
                </th>
                <th className="border border-gray-300 p-1 w-12 text-center">
                  수량
                </th>
                {isRental && (
                  <>
                    <th className="border border-gray-300 p-1 w-20 text-center">
                      No.
                    </th>
                    <th className="border border-gray-300 p-1 w-16 text-center">
                      확인
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {processedItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 p-2 text-center text-gray-500">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <span className="font-bold">
                      {item.equipment?.name || item.name}
                    </span>
                    {item.equipment?.description && (
                      <span className="text-gray-500 text-xs ml-1 font-normal">
                        ({item.equipment.description})
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-center font-bold">
                    {item.quantity}
                  </td>
                  {isRental && (
                    <>
                      <td className="border border-gray-300 p-2 text-center font-mono font-bold">
                        {item.serialNumber || ""}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <div className="w-4 h-4 border border-gray-400 mx-auto"></div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {processedItems.length === 0 && (
                <tr>
                  <td
                    colSpan={isRental ? 5 : 3}
                    className="border border-gray-300 p-4 text-center text-gray-500"
                  >
                    선택된 장비가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. 하단 서명 영역 (반출 리스트일 때만) */}
        {/* signature-section 클래스를 통해 중간에 잘리지 않도록 함 */}
        {isRental && (
          <div className="signature-section mt-10">
            <div className="border border-gray-400 p-4 mb-8 bg-gray-50 text-xs leading-relaxed">
              <h3 className="font-bold mb-2 text-sm">[반출 시 주의사항]</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  대여한 장비의 파손, 분실, 도난에 대한 책임은 전적으로
                  대여자에게 있습니다.
                </li>
                <li>
                  반납 시간을 엄수해야 하며, 연체 시 학과 규정에 따른 불이익이
                  발생할 수 있습니다.
                </li>
                <li>
                  장비 반납 시 관리자에게 장비 이상 유무를 반드시 확인받아야
                  합니다.
                </li>
                <li>
                  데이터 백업은 사용자 본인의 책임이며, 반납 후 데이터 망실에
                  대해 책임지지 않습니다.
                </li>
              </ol>
            </div>

            <div className="text-right space-y-8">
              <div className="flex justify-end gap-16 pr-10">
                <div className="text-center">
                  <p className="text-sm mb-4 font-bold">대여자 (학생)</p>
                  <div className="flex items-end gap-2">
                    <span className="text-lg border-b border-black px-4 min-w-[120px] h-8"></span>
                    <span className="text-sm">(서명)</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm mb-4 font-bold">관리자 (확인)</p>
                  <div className="flex items-end gap-2">
                    <span className="text-lg border-b border-black px-4 min-w-[120px] h-8"></span>
                    <span className="text-sm">(서명)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 맨 하단 꼬리말 */}
            <div className="text-center mt-8 text-[10px] text-gray-400">
              SSFILM EQUIPMENT RENTAL SYSTEM
            </div>
          </div>
        )}

        {isReservation && (
          <div className="py-10 text-center text-gray-400 text-xs">
            - End of List -
          </div>
        )}
      </div>
    </>
  );
}
