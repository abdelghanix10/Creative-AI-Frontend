import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface UserCredits {
  credits: number;
}

export function useUserCredits() {
  const { data: session, status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredits() {
      if (status === "loading") return;

      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/user/credits");

        if (!response.ok) {
          throw new Error("Failed to fetch credits");
        }

        const data = (await response.json()) as UserCredits;
        setCredits(data.credits);
      } catch (err) {
        console.error("Error fetching credits:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    void fetchCredits();
  }, [session, status]);

  const refetchCredits = async () => {
    if (!session?.user) return;

    try {
      setError(null);
      const response = await fetch("/api/user/credits");

      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }

      const data = (await response.json()) as UserCredits;
      setCredits(data.credits);
    } catch (err) {
      console.error("Error refetching credits:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return {
    credits,
    loading,
    error,
    refetchCredits,
  };
}
