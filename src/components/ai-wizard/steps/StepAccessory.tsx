import { Package } from "lucide-react";
import StepTemplate from "./StepTemplate";

export default function StepAccessory() {
  return (
    <StepTemplate
      step="accessory"
      title="악세서리"
      icon={Package}
      infoMessage="배터리, 케이블, 메모리 카드 등 필수 악세서리를 추천합니다."
    />
  );
}
