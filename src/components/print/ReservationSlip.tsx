import { forwardRef } from "react";

interface ReservationSlipProps {
  reservation: {
    reservation_number: string;
    leader_name: string;
    leader_student_id: string;
    leader_phone: string;
    purpose: string;
    start_datetime: string;
    end_datetime: string;
    staff_list: string;
    reservation_items: {
      equipment: {
        name: string;
        category: string;
      };
      quantity: number;
    }[];
  };
}

// ✅ 사용자용: 예약 승인 장비리스트 (단순 확인용)
export const ReservationSlip = forwardRef<HTMLDivElement, ReservationSlipProps>(
  ({ reservation }, ref) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    return (
      <div className="hidden-print">
        <div
          ref={ref}
          className="bg-white p-8 mx-auto"
          style={{ width: "210mm", minHeight: "297mm" }}
        >
          {/* 헤더 */}
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-black tracking-tight">
                SSFILM
              </h1>
              <p className="text-lg font-bold mt-1">예약 승인 장비리스트</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Document No.</p>
              <p className="font-mono font-bold text-lg">
                {reservation.reservation_number}
              </p>
            </div>
          </div>

          {/* 대여자 정보 */}
          <div className="mb-8 border-t border-b border-black py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-bold mr-2">책임자:</span>
                {reservation.leader_name} ({reservation.leader_student_id})
              </div>
              <div>
                <span className="font-bold mr-2">연락처:</span>
                {reservation.leader_phone}
              </div>
              <div className="col-span-2">
                <span className="font-bold mr-2">사용 기간:</span>
                {formatDate(reservation.start_datetime)} ~{" "}
                {formatDate(reservation.end_datetime)}
              </div>
              <div className="col-span-2">
                <span className="font-bold mr-2">사용 목적:</span>
                {reservation.purpose}
              </div>
            </div>
          </div>

          {/* 장비 목록 (사용자용 심플 버전) */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-2">승인 장비 목록</h3>
            <table className="w-full text-sm border-collapse border border-black text-center">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 w-12">No.</th>
                  <th className="border border-black p-2">장비명</th>
                  <th className="border border-black p-2 w-20">수량</th>
                  <th className="border border-black p-2 w-48">기타사항</th>
                </tr>
              </thead>
              <tbody>
                {reservation.reservation_items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-black p-3">{index + 1}</td>
                    <td className="border border-black p-3 text-left font-bold">
                      <span className="text-xs text-gray-500 block font-normal">
                        {item.equipment.category}
                      </span>
                      {item.equipment.name}
                    </td>
                    <td className="border border-black p-3 font-bold">
                      {item.quantity}
                    </td>
                    <td className="border border-black p-3 text-left text-gray-500 text-xs">
                      {/* 비고란은 비워두거나 필요 시 데이터 연결 */}
                    </td>
                  </tr>
                ))}
                {/* 빈 줄 채우기 */}
                {[...Array(5)].map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-black p-3">&nbsp;</td>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 안내 문구 */}
          <div className="mt-10 p-4 border border-gray-300 rounded bg-gray-50 text-sm text-gray-700">
            <p className="font-bold mb-2">ℹ️ 안내사항</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>위 목록은 관리자에 의해 승인된 장비 리스트입니다.</li>
              <li>
                실제 반출 시 장비 상태에 따라 일부 품목이 변경될 수 있습니다.
              </li>
              <li>반출증 작성 및 장비 점검은 현장에서 진행됩니다.</li>
            </ul>
          </div>

          <div className="text-center mt-20">
            <p className="text-sm font-bold border-t border-black inline-block px-10 pt-2">
              SSFILM 관리자 승인
            </p>
          </div>
        </div>
      </div>
    );
  }
);
ReservationSlip.displayName = "ReservationSlip";
