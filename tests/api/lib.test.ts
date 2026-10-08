import { describe, expect, it } from "vitest";
import * as lib from "../../api/_lib";
import * as checks from "../../src/shared/lib/contact-checks";

describe("isValidEmail in api/_lib.ts", () => {
  it("is the shared check, so /contact, S7 and /lead agree", () => {
    expect(lib.isValidEmail).toBe(checks.isValidEmail);
  });
});
