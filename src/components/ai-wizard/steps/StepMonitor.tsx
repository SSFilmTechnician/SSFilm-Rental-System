import { Monitor } from "lucide-react";
import StepTemplate from "./StepTemplate";

export default function StepMonitor() {
  return (
    <StepTemplate
      step="monitor"
      title="모니터/무선"
      icon={Monitor}
      infoMessage={
        <>
          모니터와 무선 송수신 장비를 추천합니다.
          <br />
          <span className="text-xs text-blue-700">💡 모니터 선택 시 SDI/HDMI 케이블도 함께 추천됩니다.</span>
        </>
      }
    />
  );
}
