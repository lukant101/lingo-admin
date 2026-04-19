import { useCallback, useEffect, useState } from "react";
import { SellerAccount } from "@/types/payout";
import { useAuth } from "@/contexts/AuthContext";
import { getMonetizationAccount } from "@/lib/api/monetization";

type MonetizationReadiness = {
  canAcceptPayments: boolean; // Can charge customers (charges_enabled)
  canReceivePayouts: boolean; // Can transfer to bank (payouts_enabled)
  account: SellerAccount | null;
  loading: boolean;
  error: string | null;
};

const userFacingErrorMessage =
  "Error loading monetization information. Please try again later.";

/**
 * Hook to check creator's Monetization capabilities
 * Provides granular readiness for payment and payout readiness
 */
export function useMonetizationReadiness({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [readiness, setReadiness] = useState<MonetizationReadiness>({
    canAcceptPayments: false,
    canReceivePayouts: false,
    account: null,
    loading: enabled,
    error: null,
  });

  const fetchMonetizationAccount = useCallback(async () => {
    if (!uid) return;
    try {
      setReadiness((prev) => ({ ...prev, loading: true, error: null }));

      const account = await getMonetizationAccount();

      const canAcceptPayments = account?.chargesEnabled ?? false;
      const canReceivePayouts = account?.payoutsEnabled ?? false;

      setReadiness({
        canAcceptPayments,
        canReceivePayouts,
        account,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching monetization account:", error);
      setReadiness((prev) => ({
        ...prev,
        loading: false,
        error: userFacingErrorMessage,
      }));
    }
  }, [uid]);

  useEffect(() => {
    if (uid && enabled) {
      fetchMonetizationAccount();
    }
  }, [fetchMonetizationAccount, uid, enabled]);

  return {
    monetizationReadiness: readiness,
    fetchMonetizationAccount,
    setMonetizationReadiness: setReadiness,
  };
}
