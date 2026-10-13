import { describe, expect, it } from "vitest";
import { normalise, tokens } from "./normalise";
import { NEGATORS, PHRASES } from "./phrases";

describe("normalise (§5.2 rule 1)", () => {
  it("lower-cases and drops punctuation, emoji and apostrophes", () => {
    expect(normalise("We can’t follow-up!! 😭❤️")).toBe("we cant follow up");
  });

  it("squeezes a letter repeated three or more times", () => {
    expect(normalise("Sooo slowww, need more")).toBe("so slow need more");
  });

  it("joins spelling variants", () => {
    expect(normalise("nahin nai nhi paise inquiry followup watsapp leads clients")).toBe(
      "nahi nahi nahi paisa enquiry follow up whatsapp lead client",
    );
  });

  it("leaves words that are Object.prototype keys alone", () => {
    expect(normalise("Constructor toString, payments stuck")).toBe("constructor tostring payments stuck");
  });

  it("keeps Devanagari words whole", () => {
    expect(tokens("पेमेंट अटका है।")).toEqual(["पेमेंट", "अटका", "है"]);
  });

  it("gives no tokens for empty or punctuation-only text", () => {
    expect(tokens("")).toEqual([]);
    expect(tokens(" ...!! ")).toEqual([]);
  });
});

describe("the phrase lists (templates.md §1)", () => {
  it("hold 209 phrases, none empty once cleaned and none listed twice", () => {
    const all = Object.values(PHRASES).flat().map((p) => tokens(p).join(" "));
    expect(all).toHaveLength(209);
    expect(all.filter((p) => p === "")).toEqual([]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("keep every negator matchable", () => {
    expect(NEGATORS.filter((n) => tokens(n).length === 0)).toEqual([]);
  });
});
