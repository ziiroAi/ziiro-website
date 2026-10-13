import { describe, expect, it } from "vitest";
import { inputModeOf, problemTextFrom } from "./words";

const STARTER = "Honestly, I'm struggling with ___ because ___.";

describe("problemTextFrom (Review Focus 1)", () => {
  it.each([
    ["the untouched starter", STARTER, ""],
    ["the first blank filled", "Honestly, I'm struggling with leads because ___.", "Honestly, I'm struggling with leads."],
    ["the second blank filled", "Honestly, I'm struggling with ___ because nobody calls back.", "because nobody calls back."],
    ["both blanks filled", "Honestly, I'm struggling with leads because nobody calls back.", "Honestly, I'm struggling with leads because nobody calls back."],
    ["their own sentence", "Enquiries come in, but by the time someone calls back they've gone cold.", "Enquiries come in, but by the time someone calls back they've gone cold."],
    ["the starter left and words after it", `${STARTER} Leads go cold`, "Leads go cold"],
    ["a stray blank in their words", "leads ___ go cold", "leads go cold"],
    ["spacing and lines tidied", "  Leads \n\n go   cold .", "Leads go cold."],
    ["only punctuation left", "Honestly, I'm struggling with ___ because ___!!", ""],
    ["Hindi typed in", "लीड्स ठंडी पड़ जाती हैं", "लीड्स ठंडी पड़ जाती हैं"],
  ])("%s", (_case, value, expected) => {
    expect(problemTextFrom(value, STARTER)).toBe(expected);
  });

  it("never passes 600 characters", () => {
    expect(problemTextFrom("a".repeat(700), STARTER)).toHaveLength(600);
  });
});

describe("inputModeOf (§9)", () => {
  it("is typed, chips or mixed", () => {
    expect(inputModeOf("Leads go cold", [])).toBe("typed");
    expect(inputModeOf("", ["leads"])).toBe("chips");
    expect(inputModeOf("Leads go cold", ["leads"])).toBe("mixed");
  });
});
