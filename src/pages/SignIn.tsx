import { SignIn } from "@clerk/clerk-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">SSFILM RENTAL</h1>
        <p className="mb-8 text-gray-500">서비스 이용을 위해 로그인해주세요.</p>

        {/* Clerk 로그인 컴포넌트 (중앙 정렬) */}
        <div className="flex justify-center">
          <SignIn />
        </div>
      </div>
    </div>
  );
}
