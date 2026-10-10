import { describe, expect, it } from "vitest";
import { classify, CLASSIFIER_VERSION, clauseTokens } from "./classify";

const words = (text: string) => classify(text, []);

describe("classify: their words alone (§5.2)", () => {
  it("puts Ananya under sales (§5.8)", () => {
    const r = words("Enquiries come in, but by the time someone calls back they've gone cold.");
    expect(r).toEqual({ bucketPrimary: "sales", bucketSecondary: null, bucketScores: { sales: 4 }, matchedPhrases: ["calls back", "gone cold"] });
  });

  it("lets the longest phrase use up its words (rule 2)", () => {
    expect(words("the payment follow up with clients takes forever every month").bucketPrimary).toBe("payments");
    expect(words("client paisa nahi de raha hai teen mahine se").bucketPrimary).toBe("payments");
  });

  it("caps a phrase's weight at 3", () => {
    expect(words("staff kaam nahi karta yaar sach mein").bucketScores.team_ops).toBe(3);
  });

  it("doesn't treat a plain 'nahi' as negation", () => {
    expect(words("lead nahi aa rahe yaar kya karu").bucketPrimary).toBe("lead_gen");
  });

  it("cancels a phrase with a negator up to 4 words away, not 5 (rule 3)", () => {
    expect(words("staff one two three four theek hai").matchedPhrases).toEqual([]);
    expect(words("staff one two three four five theek hai").matchedPhrases).toEqual(["staff"]);
  });

  it("keeps negation inside its clause (D35)", () => {
    const r = words("Billing is sorted, but our reels need work every week");
    expect([r.bucketPrimary, r.matchedPhrases]).toEqual(["content", ["reels"]]);
    expect(words("staff theek hai, payment atka hai bas").bucketPrimary).toBe("payments");
  });

  it("breaks a tie by the problem mentioned first, and keeps the other as second", () => {
    const r = words("our profit is unclear and the staff keep fighting daily");
    expect([r.bucketPrimary, r.bucketSecondary]).toEqual(["numbers", "team_ops"]);
  });

  it("is unclassified with fewer than 4 words, or with no match (rule 6)", () => {
    expect(words("payments stuck").bucketPrimary).toBe("unclassified");
    expect(words("honestly I am just tired of everything here")).toEqual({
      bucketPrimary: "unclassified", bucketSecondary: null, bucketScores: {}, matchedPhrases: [],
    });
  });

  it("reads curly apostrophes, Devanagari and stretched letters", () => {
    expect(words("we can’t close deals after the first meeting").bucketPrimary).toBe("sales");
    expect(words("मेरा पेमेंट अटका है और उधार बहुत है").bucketPrimary).toBe("payments");
    expect(words("nahiii yaar, slowww month, lead nahiii aa raheee").bucketPrimary).toBe("lead_gen");
  });

  it("doesn't find 'mis' inside 'miss'", () => {
    expect(words("we miss calls all the time at the front desk").bucketScores.numbers).toBeUndefined();
  });

  it("classifies text that holds an Object.prototype key", () => {
    expect(words("Constructor here, payments stuck for months now").bucketPrimary).toBe("payments");
  });

  it("returns at most 20 phrases but scores every match (Review Focus 1)", () => {
    const r = words(Array.from({ length: 30 }, () => "follow up").join(" "));
    expect(r.matchedPhrases).toHaveLength(20);
    expect(r.bucketScores.sales).toBe(60);
  });
});

describe("classify: chips (§5.2)", () => {
  it("lets the first chip decide, whatever the words say", () => {
    const r = classify("we never follow up and leads go cold and they ghost us", ["payments"]);
    expect([r.bucketPrimary, r.bucketSecondary]).toEqual(["payments", "sales"]);
  });

  it("scores the deciding chip 6 and the others 5", () => {
    const r = classify("", ["leads", "team"]);
    expect(r).toMatchObject({ bucketPrimary: "lead_gen", bucketSecondary: "team_ops", bucketScores: { lead_gen: 6, team_ops: 5 } });
  });

  it("drops a second problem under half the first one's score", () => {
    const r = classify("also the reels are a mess honestly", ["team"]);
    expect(r.bucketScores).toEqual({ team_ops: 6, content: 1 });
    expect(r.bucketSecondary).toBeNull();
  });

  it("is never unclassified once a chip is tapped", () => {
    expect(classify("hi", ["support"]).bucketPrimary).toBe("support");
  });
});

describe("clauseTokens", () => {
  it("starts a new clause at punctuation and at 'but'", () => {
    expect(clauseTokens("Billing is sorted, but our reels").map((t) => `${t.word}/${t.clause}`)).toEqual([
      "billing/0", "is/0", "sorted/0", "but/2", "our/2", "reels/2",
    ]);
  });
});

it("is version kw-1", () => {
  expect(CLASSIFIER_VERSION).toBe("kw-1");
});
