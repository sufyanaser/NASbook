import { useCallback, useState } from "react";

export interface OperationErrorState {
  readonly operation: string;
  readonly detail: string;
}

export interface OperationErrorController {
  readonly error: OperationErrorState | null;
  readonly execute: <T>(operation: string, action: () => Promise<T>) => Promise<T | null>;
  readonly dismiss: () => void;
}

function getErrorDetail(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return "Unknown operation failure.";
}

export function useOperationError(): OperationErrorController {
  const [error, setError] = useState<OperationErrorState | null>(null);

  const execute = useCallback(
    async <T,>(operation: string, action: () => Promise<T>): Promise<T | null> => {
      try {
        return await action();
      } catch (failure) {
        const detail = getErrorDetail(failure);
        console.error(`NASbook ${operation} failed:`, failure);
        setError({ operation, detail });
        return null;
      }
    },
    [],
  );

  const dismiss = useCallback(() => setError(null), []);
  return { error, execute, dismiss };
}
