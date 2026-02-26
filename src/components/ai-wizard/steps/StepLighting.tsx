import { Lightbulb } from "lucide-react";
import StepTemplate from "./StepTemplate";

export default function StepLighting() {
  return (
    <StepTemplate
      step="lighting"
      title="조명"
      icon={Lightbulb}
      infoMessage={
        <>
          촬영 규모에 맞는 조명 장비를 추천합니다.
          <br />
          <span className="text-xs text-blue-700">
            💡 우선순위: 600C Pro II → 600D Pro → 400X → F21C
          </span>
        </>
      }
    />
  );
}
