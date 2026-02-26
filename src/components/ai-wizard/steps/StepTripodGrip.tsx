import { Move } from "lucide-react";
import StepTemplate from "./StepTemplate";

export default function StepTripodGrip() {
  return (
    <StepTemplate
      step="tripod_grip"
      title="트라이포드/그립"
      icon={Move}
      infoMessage="촬영 스타일에 맞는 트라이포드와 그립 장비를 추천합니다."
    />
  );
}
