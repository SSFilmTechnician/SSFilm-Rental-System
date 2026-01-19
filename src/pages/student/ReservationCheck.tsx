import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, CheckSquare } from "lucide-react";
import { ReservationSlip } from "../../components/print/ReservationSlip";
import { AdminChecklist } from "../../components/print/AdminChecklist";

export default function ReservationCheck() {
  // 1. 사용자용 (승인 리스트) Ref
  const userSlipRef = useRef<HTMLDivElement>(null);

  // 사용자용 인쇄 함수
  const handleUserPrint = useReactToPrint({
    contentRef: userSlipRef,
    documentTitle: "예약승인리스트_사용자용",
  });

  // 2. 관리자용 (체크리스트) Ref
  const adminChecklistRef = useRef<HTMLDivElement>(null);

  // 관리자용 인쇄 함수
  const handleAdminPrint = useReactToPrint({
    contentRef: adminChecklistRef,
    documentTitle: "반출반납확인증_관리자용",
  });

  // ✅ 테스트용 임시 데이터
  const dummyReservation = {
    reservation_number: "20240520-TEST",
    leader_name: "홍길동",
    leader_student_id: "20240001",
    leader_phone: "010-1234-5678",
    purpose: "졸업작품 <바람> 3회차 촬영",
    start_datetime: "2024-05-20T10:00:00",
    end_datetime: "2024-05-22T18:00:00",
    staff_list: "촬영: 김철수, 조명: 이영희",
    reservation_items: [
      { equipment: { name: "Sony FX6 Body", category: "CAMERA" }, quantity: 1 },
      {
        equipment: { name: "Sony 24-70 GM II", category: "LENS" },
        quantity: 1,
      },
      {
        equipment: { name: "Sachtler Flowtech", category: "TRIPOD" },
        quantity: 1,
      },
    ],
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-4">
      <div className="bg-white p-10 rounded-xl shadow-lg border border-gray-200 flex flex-col items-center gap-8 text-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            예약 양식 미리보기
          </h2>
          <p className="text-gray-500">
            사용자용(승인서)과 관리자용(반출증)을 각각 테스트합니다.
          </p>
        </div>

        <div className="flex gap-4">
          {/* 버튼 1: 사용자용 */}
          <button
            onClick={() => handleUserPrint()}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md"
          >
            <Printer className="w-5 h-5" />
            사용자용 (승인 리스트)
          </button>

          {/* 버튼 2: 관리자용 */}
          <button
            onClick={() => handleAdminPrint()}
            className="flex items-center gap-2 bg-gray-800 text-white px-6 py-4 rounded-xl font-bold hover:bg-gray-900 transition-all shadow-md"
          >
            <CheckSquare className="w-5 h-5" />
            관리자용 (체크리스트)
          </button>
        </div>
      </div>

      {/* 🖨️ 인쇄될 때만 사용되는 숨겨진 컴포넌트들 */}
      <div className="hidden">
        {/* 사용자용 양식 */}
        <ReservationSlip ref={userSlipRef} reservation={dummyReservation} />

        {/* 관리자용 양식 */}
        <AdminChecklist
          ref={adminChecklistRef}
          reservation={dummyReservation}
        />
      </div>
    </div>
  );
}
