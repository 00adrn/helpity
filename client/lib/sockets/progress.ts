import type { TestRunResult } from "@/lib/editor/runner";

/** A student's last test submission, shared with the teacher through the session's `progress` map. */
export type StudentProgress = {
  name: string;
  passed: number;
  total: number;
  attempts: number;
  /** The code that was submitted. */
  code: string;
  /** Each test's pass/fail, expected and actual value, so the teacher sees what failed. */
  result?: TestRunResult;
};
