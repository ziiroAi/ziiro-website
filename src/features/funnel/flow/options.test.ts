import { describe, expect, it, vi } from "vitest";
import { businessOptions, chipOptions, listOptions, nonOwnerOptions, revenueOptions, segmentOptions, teamOptions, yearsOptions } from "./options";

vi.mock("@/features/funnel/data/light", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import("./test/fake-data")).FAKE_DATA,
}));

describe("option lists (index §1.2)", () => {
  it("pairs S1's and S1b's IDs with their numbered lines", () => {
    expect(segmentOptions().map((o) => o.id)).toEqual(["business", "agency", "freelance", "starting", "student"]);
    expect(segmentOptions()[0].label).toBe("I run a business");
    expect(nonOwnerOptions()[4]).toEqual({ id: "something_else", label: "Something else" });
  });

  it("pairs the 12 S2 types with s2.o in order", () => {
    const options = businessOptions();
    expect(options).toHaveLength(12);
    expect(options[0]).toEqual({ id: "interior", label: "Interior design / architecture" });
    expect(options[6]).toEqual({ id: "agency", label: "Marketing or creative agency" });
    expect(options[11]).toEqual({ id: "other", label: "Other" });
  });

  it("labels S3, S4 and the nine chips", () => {
    expect(yearsOptions()[3]).toEqual({ id: "5_10", label: "5–10 years" });
    expect(teamOptions()[0]).toEqual({ id: "solo", label: "Just me" });
    expect(chipOptions().map((o) => o.id)).toEqual(["leads", "convert", "followups", "ads", "content", "numbers", "payments", "team", "support"]);
  });

  it("shows rupee bands in India and dollar bands elsewhere, then Rather not say (D10)", () => {
    expect(revenueOptions("INR").map((o) => o.label)).toEqual(["Under ₹25L", "₹25L–1Cr", "₹1–5Cr", "₹5–25Cr", "₹25Cr+", "Rather not say"]);
    expect(revenueOptions("USD")[2]).toEqual({ id: "band_3", label: "$1–5M" });
    expect(revenueOptions("USD")[5].id).toBe("undisclosed");
  });

  it("refuses a line whose item count doesn't match its IDs", () => {
    expect(() => listOptions(["a", "b"], "s4.o")).toThrow("s4.o has 5 items, expected 2");
  });
});
