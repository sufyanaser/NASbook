export type SaveTask = () => Promise<boolean>;

export interface LatestSaveQueue {
  readonly request: (task: SaveTask) => Promise<boolean>;
  readonly isBusy: () => boolean;
}

/**
 * Serializes persistence work while coalescing queued requests to the latest
 * draft. Every caller receives the same drain barrier, so navigation cannot
 * continue until both the active write and the latest queued write finish.
 */
export function createLatestSaveQueue(): LatestSaveQueue {
  let pendingTask: SaveTask | null = null;
  let drainPromise: Promise<boolean> | null = null;

  const drain = async (): Promise<boolean> => {
    let latestResult = true;

    while (pendingTask) {
      const task = pendingTask;
      pendingTask = null;

      try {
        latestResult = await task();
      } catch {
        latestResult = false;
      }
    }

    return latestResult;
  };

  return {
    request: (task) => {
      pendingTask = task;

      if (!drainPromise) {
        const currentDrain = drain();
        drainPromise = currentDrain;
        void currentDrain.finally(() => {
          if (drainPromise === currentDrain) {
            drainPromise = null;
          }
        });
      }

      return drainPromise;
    },
    isBusy: () => drainPromise !== null,
  };
}
