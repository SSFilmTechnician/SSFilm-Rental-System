import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function StoreUser() {
  const { user, isLoaded } = useUser();

  // 1. (빠름) DB에 내 정보가 있는지 먼저 확인 (Query)
  const userProfile = useQuery(api.users.getMyProfile);

  // 2. (느림) 없을 때만 실행할 저장 함수 (Mutation)
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    // 로딩이 끝났고 && 로그인된 상태인데
    if (isLoaded && user) {
      // DB를 조회해봤더니 내 정보가 아예 없다면(null)?
      if (userProfile === null) {
        // 그때만 저장을 수행! (최초 1회만 발생)
        storeUser();
      }
    }
  }, [isLoaded, user, userProfile, storeUser]);

  return null;
}
