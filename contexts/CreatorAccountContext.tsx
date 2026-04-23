import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { getCreator } from "@/lib/api/creator";
import { CreatorAccount } from "@/types/user";
import { useAuth } from "@/contexts/AuthContext";

type CreatorAccountContextType = {
  isLoading: boolean;
  creatorAccount: CreatorAccount | undefined;
  error: string | null;
  refreshCreatorAccount: () => Promise<void>;
};

const CreatorAccountContext = createContext<CreatorAccountContextType | null>(
  null
);

function buildCreatorAccount(
  data: Awaited<ReturnType<typeof getCreator>>
): CreatorAccount | undefined {
  const { application, creator } = data;

  if (creator) {
    return {
      applicationStatus: "approved",
      creatorStatus: creator.status,
      creatorTier: creator.tier,
      updatedAt: creator.updatedAt,
      langVariantCodes: creator.langVariantCodes,
      maxStudios: creator.maxStudios,
    };
  }

  if (application) {
    return {
      applicationStatus: application.status,
      creatorStatus: null,
      creatorTier: null,
      updatedAt: application.updatedAt,
      canReapplyAt: application.canReapplyAt ?? undefined,
    };
  }

  return undefined;
}

export function CreatorAccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isLoading] = useState(false);
  const [creatorAccount, setCreatorAccount] = useState<
    CreatorAccount | undefined
  >(undefined);
  const [error, setError] = useState<string | null>(null);

  const refreshCreatorAccount = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getCreator();
      setCreatorAccount(buildCreatorAccount(data));
      setError(null);
    } catch (e) {
      console.error("Error refreshing creator account:", e);
      setError("Could not refresh your account. Please try again.");
    }
  }, [user]);

  const value = useMemo(
    () => ({
      isLoading,
      creatorAccount,
      error,
      refreshCreatorAccount,
    }),
    [isLoading, creatorAccount, error, refreshCreatorAccount]
  );

  return (
    <CreatorAccountContext.Provider value={value}>
      {children}
    </CreatorAccountContext.Provider>
  );
}

export function useCreatorAccount(): CreatorAccountContextType {
  const context = useContext(CreatorAccountContext);
  if (!context) {
    throw new Error(
      "useCreatorAccount must be used within a CreatorAccountProvider"
    );
  }
  return context;
}
