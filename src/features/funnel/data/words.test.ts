import { describe, expect, it } from "vitest";
import { copy } from "./copy";
import { cleanProblemText, quoteWords } from "./words";

describe("quoteWords (§6.3)", () => {
  it("strips trailing punctuation, the danda included", () => {
    expect(quoteWords("they've gone cold.", 120)).toBe("they've gone cold");
    expect(quoteWords("why do leads go cold?!  ", 120)).toBe("why do leads go cold");
    expect(quoteWords("पेमेंट अटका है।", 120)).toBe("पेमेंट अटका है");
  });

  it("puts their words on one line", () => {
    expect(quoteWords("first line\n\nsecond line", 120)).toBe("first line second line");
  });

  it("cuts at 120 characters with '…'", () => {
    const quoted = quoteWords("a".repeat(130), 120);
    expect([...quoted]).toHaveLength(120);
    expect(quoted.endsWith("a…")).toBe(true);
    expect(quoteWords("b".repeat(120), 120)).toBe("b".repeat(120));
  });

  it("cuts at any length without splitting an emoji", () => {
    const quoted = quoteWords(`${"x".repeat(138)}😀😀😀`, 140);
    expect([...quoted]).toHaveLength(140);
    expect(quoted.endsWith("😀…")).toBe(true);
  });

  it("leaves no comma before the '…'", () => {
    expect(quoteWords(`${"c".repeat(118)}, and more words`, 120)).toBe(`${"c".repeat(118)}…`);
  });
});

describe("cleanProblemText (S6)", () => {
  const starter = copy("s6.text");

  it("treats the untouched starter as empty (Review Focus 2)", () => {
    expect(cleanProblemText(starter)).toBe("");
    expect(cleanProblemText(`  ${starter} `)).toBe("");
  });

  it("removes the blanks they didn't fill", () => {
    expect(cleanProblemText(starter.replace("___", "payments"))).toBe("Honestly, I'm struggling with payments because .");
  });

  it("keeps their own words as they are", () => {
    expect(cleanProblemText("Leads go cold.")).toBe("Leads go cold.");
  });

  it("is empty for nothing typed", () => {
    expect(cleanProblemText("   ")).toBe("");
  });
});
