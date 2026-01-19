import { forwardRef } from "react";

// 예약 데이터 타입 정의
interface RentalSheetProps {
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

// ✅ 반출증 컴포넌트 (A4 사이즈 디자인)
export const RentalSheet = forwardRef<HTMLDivElement, RentalSheetProps>(
  ({ reservation }, ref) => {
    // 날짜 포맷팅 함수
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
        {/* 이 div가 실제로 인쇄되는 영역입니다 */}
        <div
          ref={ref}
          className="bg-white p-8 mx-auto"
          style={{ width: "210mm", minHeight: "297mm" }} // A4 크기 고정
        >
          {/* 1. 헤더 */}
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-black tracking-tight">
                SSFILM RENTAL
              </h1>
              <p className="text-sm text-gray-500 mt-1">장비 반출/반납 확인증</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Reservation No.</p>
              <p className="font-mono font-bold text-lg">
                {reservation.reservation_number}
              </p>
            </div>
          </div>

          {/* 2. 예약 정보 (표 형태) */}
          <div className="mb-8 border border-black text-sm">
            <div className="flex border-b border-black">
              <div className="w-24 bg-gray-100 p-2 font-bold border-r border-black flex items-center justify-center">
                책임자
              </div>
              <div className="flex-1 p-2 flex items-center gap-4">
                <span className="font-bold text-lg">{reservation.leader_name}</span>
                <span className="text-gray-600">
                  ({reservation.leader_student_id})
                </span>
              </div>
              <div className="w-24 bg-gray-100 p-2 font-bold border-l border-r border-black flex items-center justify-center">
                연락처
              </div>
              <div className="w-40 p-2 flex items-center">
                {reservation.leader_phone}
              </div>
            </div>

            <div className="flex border-b border-black">
              <div className="w-24 bg-gray-100 p-2 font-bold border-r border-black flex items-center justify-center">
                대여 기간
              </div>
              <div className="flex-1 p-2">
                {formatDate(reservation.start_datetime)} ~{" "}
                {formatDate(reservation.end_datetime)}
              </div>
            </div>

            <div className="flex">
              <div className="w-24 bg-gray-100 p-2 font-bold border-r border-black flex items-center justify-center">
                사용 목적
              </div>
              <div className="flex-1 p-2">{reservation.purpose}</div>
            </div>
          </div>

          {/* 3. 장비 리스트 (체크리스트) */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-2 border-l-4 border-black pl-2">
              장비 목록 (Check List)
            </h3>
            <table className="w-full text-sm border-collapse border border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 w-12">No.</th>
                  <th className="border border-black p-2">장비명 (Equipment)</th>
                  <th className="border border-black p-2 w-20">수량</th>
                  <th className="border border-black p-2 w-16">반출</th>
                  <th className="border border-black p-2 w-16">반납</th>
                  <th className="border border-black p-2 w-32">비고 (파손확인)</th>
                </tr>
              </thead>
              <tbody>
                {reservation.reservation_items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-black p-2 text-center">
                      {index + 1}
                    </td>
                    <td className="border border-black p-2">
                      <span className="text-xs text-gray-500 block">
                        {item.equipment.category}
                      </span>
                      <span className="font-bold">{item.equipment.name}</span>
                    </td>
                    <td className="border border-black p-2 text-center font-bold">
                      {item.quantity}
                    </td>
                    <td className="border border-black p-2 text-center">
                      <div className="w-4 h-4 border border-gray-400 mx-auto"></div>
                    </td>
                    <td className="border border-black p-2 text-center">
                      <div className="w-4 h-4 border border-gray-400 mx-auto"></div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                ))}
                {/* 여백용 빈 줄 (3칸) */}
                {[...Array(3)].map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                    <td className="border border-black p-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 4. 주의사항 및 서명 */}
          <div className="border border-black p-6 mt-auto">
            <h4 className="font-bold mb-3 text-sm">⚠️ 대여 시 주의사항</h4>
            <ul className="text-xs space-y-1 list-disc list-inside text-gray-700 mb-8">
              <li>
                반출 시 장비의 상태(작동 여부, 구성품 등)를 반드시 관리자와 함께
                확인해야 합니다.
              </li>
              <li>
                대여 기간 중 발생한 장비의 파손, 분실, 도난에 대한 책임은 전적으로
                대여자(책임자)에게 있습니다.
              </li>
              <li>반납 시간을 엄수해주시기 바랍니다. (지연 시 페널티 부과)</li>
              <li>메모리카드 데이터 백업은 반납 전 완료해주시기 바랍니다.</li>
            </ul>

            <div className="flex justify-between items-end mt-10">
              <div className="text-center w-1/3">
                <p className="text-sm mb-4">위 내용을 확인하였으며 동의합니다.</p>
                <div className="text-sm">
                  <span className="mr-2">대여자(책임자):</span>
                  <span className="font-bold text-lg underline underline-offset-4">
                    {reservation.leader_name}
                  </span>
                  <span className="ml-2">(인)</span>
                </div>
              </div>
              <div className="text-center w-1/3">
                <p className="text-sm mb-4">관리자 확인</p>
                <div className="border-b border-black w-full h-8"></div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 text-xs text-gray-400">
             SSFILM Equipment Rental System
          </div>
        </div>
      </div>
    );
  }
);

RentalSheet.displayName = "RentalSheet";
