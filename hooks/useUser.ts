import { useUser as useClerkUser } from "@clerk/nextjs";

export function useUser() {
  const { user, isLoaded, isSignedIn } = useClerkUser();

  return {
    user,
    isLoaded,
    isSignedIn,
    clerkId: user?.id,
    email: user?.primaryEmailAddress?.emailAddress,
    name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.username || "User",
    avatar: user?.imageUrl,
  };
}
