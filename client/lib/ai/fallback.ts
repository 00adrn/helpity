/** One model that was tried and didn't produce an answer. */
export type FailedAttempt = { model: string; error: string };

export type FallbackResult<T> = {
  value: T;
  /** The model that produced `value`. */
  model: string;
  /** Models tried before it, in order. */
  failed: FailedAttempt[];
};

/** Thrown when every model failed. Carries what went wrong with each one. */
export class AllModelsFailedError extends Error {
  constructor(readonly failed: FailedAttempt[]) {
    super(`All models failed: ${failed.map((f) => `${f.model} (${f.error})`).join("; ")}`);
  }
}

/**
 * Try each model in order and return the first answer. `attempt` should throw, or return
 * undefined, when the model gave nothing usable. Duplicate model names are only tried once, so a
 * fallback equal to the primary doesn't just repeat the same failing call.
 */
export async function withModelFallback<T>(
  models: readonly string[],
  attempt: (model: string) => Promise<T | undefined>,
): Promise<FallbackResult<T>> {
  const failed: FailedAttempt[] = [];

  for (const model of new Set(models)) {
    try {
      const value = await attempt(model);
      if (value !== undefined) return { value, model, failed };
      failed.push({ model, error: "returned no usable answer" });
    } catch (error) {
      failed.push({ model, error: error instanceof Error ? error.message : String(error) });
    }
  }

  throw new AllModelsFailedError(failed);
}
