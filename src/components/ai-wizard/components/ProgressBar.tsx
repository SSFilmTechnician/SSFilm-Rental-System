import { useAIWizard } from "../AIWizardProvider";
import type { WizardStep } from "../types";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "basic_info", label: "기본 정보" },
  { key: "camera", label: "카메라" },
  { key: "lens", label: "렌즈" },
  { key: "tripod_grip", label: "트라이포드" },
  { key: "monitor", label: "모니터" },
  { key: "lighting", label: "조명" },
  { key: "stand", label: "스탠드" },
  { key: "accessory", label: "악세서리" },
  { key: "summary", label: "최종 확인" },
];

export default function ProgressBar() {
  const { state } = useAIWizard();

  const currentIndex = STEPS.findIndex((s) => s.key === state.currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  return (
    <div>
      {/* 진행률 바 */}
      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* 현재 스텝 정보 */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-white/80">
          Step {currentIndex + 1} / {STEPS.length}
        </p>
        <p className="text-sm font-medium text-white">
          {STEPS[currentIndex]?.label || ""}
        </p>
      </div>
    </div>
  );
}
