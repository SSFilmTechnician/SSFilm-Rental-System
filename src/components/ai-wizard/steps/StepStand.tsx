import { Boxes } from "lucide-react";
import StepTemplate from "./StepTemplate";

export default function StepStand() {
  return (
    <StepTemplate
      step="stand"
      title="스탠드"
      icon={Boxes}
      infoMessage={
        <>
          조명 수에 맞는 스탠드를 추천합니다.
          <br />
          <span className="text-xs text-blue-700">
            💡 스탠드 선택 시 모래주머니가 자동으로 추천됩니다 (안전상 필수)
          </span>
        </>
      }
    />
  );
}
