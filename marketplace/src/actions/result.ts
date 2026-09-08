export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}
export function fail<T = undefined>(error: string, fieldErrors?: Record<string, string>): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

/** Wraps an action body converting thrown errors into a safe result. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
    // never leak SQL internals
    const safe = /relation|syntax|column|constraint|violates|null value/i.test(msg) ? 'حدث خطأ غير متوقع، حاول مرة أخرى' : msg;
    if (safe !== msg) console.error(e);
    return fail(safe);
  }
}
