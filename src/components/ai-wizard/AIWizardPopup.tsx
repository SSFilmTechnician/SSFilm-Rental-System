import { useEffect } from "react";
import { X } from "lucide-react";
import { useAIWizard } from "./AIWizardProvider";
import ProgressBar from "./components/ProgressBar";
import StepBasicInfo from "./steps/StepBasicInfo";
import StepCamera from "./steps/StepCamera";
import StepLens from "./steps/StepLens";
import StepTripodGrip from "./steps/StepTripodGrip";
import StepMonitor from "./steps/StepMonitor";
import StepLighting from "./steps/StepLighting";
import StepStand from "./steps/StepStand";
import StepAccessory from "./steps/StepAccessory";
import StepSummary from "./steps/StepSummary";

interface AIWizardPopupProps {
  onClose: () => void;
}

export default function AIWizardPopup({ onClose }: AIWizardPopupProps) {
  const { state, dispatch } = useAIWizard();

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // 스텝별 렌더링
  const renderStep = () => {
    switch (state.currentStep) {
      case "basic_info":
        return <StepBasicInfo />;
      case "camera":
        return <StepCamera />;
      case "lens":
        return <StepLens />;
      case "tripod_grip":
        return <StepTripodGrip />;
      case "monitor":
        return <StepMonitor />;
      case "lighting":
        return <StepLighting />;
      case "stand":
        return <StepStand />;
      case "accessory":
        return <StepAccessory />;
      case "summary":
        return <StepSummary />;
      default:
        return <div className="p-8 text-center text-gray-500">구현 중...</div>;
    }
  };

  // 백드롭 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      {/* 스마트폰 형태 팝업 */}
      <div
        className="bg-white rounded-3xl w-full max-w-md h-[85vh] max-h-[700px] flex flex-col overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">장비 리스트 추천</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 진행률 바 */}
          <ProgressBar />
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto">{renderStep()}</div>

        {/* 로딩 오버레이 */}
        {state.isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">장비를 추천하는 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
