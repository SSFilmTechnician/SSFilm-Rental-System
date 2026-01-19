import { forwardRef } from "react";

interface AdminChecklistProps {
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

// ✅ 관리자용: 반출증 (체크리스트 포함)
export const AdminChecklist = forwardRef<HTMLDivElement, AdminChecklistProps>(
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
              <h1 className="text-2xl font-extrabold text-black">SSFILM 관리자용</h1>
              <p className="text-lg font-bold mt-1">장비 반출/반납 확인증</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">No.</p>
              <p className="font-mono font-bold text-lg">{reservation.reservation_number}</p>
            </div>
          </div>

          {/* 대여자 정보 요약 */}
          <div className="mb-6 border border-black p-2 text-sm bg-gray-50">
            <span className="font-bold mr-2">책임자:</span> {reservation.leader_name} 
            <span className="mx-2">|</span> 
            <span className="font-bold mr-2">기간:</span> {formatDate(reservation.start_datetime)} ~ {formatDate(reservation.end_datetime)}
          </div>

          {/* 체크리스트 테이블 */}
          <div className="mb-4">
            <table className="w-full text-xs border-collapse border border-black text-center">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 w-8">No</th>
                  <th className="border border-black p-1">장비명</th>
                  <th className="border border-black p-1 w-10">수량</th>
                  <th className="border border-black p-1 w-12">반출</th>
                  <th className="border border-black p-1 w-12">반납</th>
                  <th className="border border-black p-1 w-32">특이사항(파손/분실)</th>
                </tr>
              </thead>
              <tbody>
                {reservation.reservation_items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-black p-2">{index + 1}</td>
                    <td className="border border-black p-2 text-left font-bold text-sm">
                      {item.equipment.name}
                    </td>
                    <td className="border border-black p-2">{item.quantity}</td>
                    <td className="border border-black p-2"><div className="w-4 h-4 border border-black mx-auto"></div></td>
                    <td className="border border-black p-2"><div className="w-4 h-4 border border-black mx-auto"></div></td>
                    <td className="border border-black p-2"></td>
                  </tr>
                ))}
                 {/* 여백용 빈 줄 (넉넉하게) */}
                 {[...Array(10)].map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-black p-2">&nbsp;</td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 서명란 */}
          <div className="mt-auto border border-black p-4">
            <div className="flex justify-between items-end">
              <div className="w-1/2 pr-4 border-r border-black">
                <p className="font-bold mb-8 text-sm">[반출 확인]</p>
                <p className="text-xs mb-1">본인은 위 장비를 이상 없이 인수하였음을 확인합니다.</p>
                <div className="flex justify-between text-sm">
                  <span>대여자: (인)</span>
                  <span>관리자: (인)</span>
                </div>
              </div>
              <div className="w-1/2 pl-4">
                <p className="font-bold mb-8 text-sm">[반납 확인]</p>
                <p className="text-xs mb-1">위 장비가 이상 없이 반납되었음을 확인합니다.</p>
                 <div className="flex justify-between text-sm">
                  <span>반납자: (인)</span>
                  <span>관리자: (인)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
AdminChecklist.displayName = "AdminChecklist";
