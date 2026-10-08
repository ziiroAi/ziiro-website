import { describe, expect, it } from "vitest";
import { agentById, agents, AGENTS_VERSION, departments } from "./agents";
import { AGENT_IDS, DEPARTMENTS } from "./contract";

const jobNames = (status: string) =>
  agents.flatMap((a) => a.jobs).filter((j) => j.status === status).map((j) => j.name).sort();

describe("agents", () => {
  it("lists the 33 agents by number, with the contract's IDs", () => {
    expect(agents.map((a) => a.number)).toEqual(Array.from({ length: 33 }, (_, i) => i + 1));
    expect(agents.map((a) => a.id)).toEqual([...AGENT_IDS]);
  });

  it("names each agent and its line from copy.md's agent table", () => {
    expect(agentById("deals-inbound")).toMatchObject({ number: 16, department: "deals", name: "Enquiry responder" });
    expect(agents.filter((a) => a.name === "" || a.line === "" || a.line.includes("●"))).toEqual([]);
  });

  it("carries 137 jobs with unique IDs", () => {
    const ids = agents.flatMap((a) => a.jobs.map((j) => j.id));
    expect(ids).toHaveLength(137);
    expect(new Set(ids).size).toBe(137);
  });

  it("marks exactly the jobs §5.6 names", () => {
    expect(jobNames("runs_on_our_company_today")).toEqual([
      "Company Deep-Dive", "Hook Writing", "List Building", "Meeting Booking", "Post-Call Debrief", "Reply Classification",
    ]);
    expect(jobNames("we_build_it_for_you")).toEqual([
      "Call Capture", "Collections", "Document Extraction", "Follow-Up Drafting", "Lead Qualification",
      "Payment Tracking", "Revenue Reporting", "Speed-to-Lead", "Status Updates",
    ]);
    expect(jobNames("mapped")).toHaveLength(122);
  });

  it("records the agents file's version", () => {
    expect(AGENTS_VERSION).toBe("2026-10-04");
  });

  it("returns undefined for an ID that isn't an agent", () => {
    expect(agentById("deals-closer")).toBeUndefined();
    expect(agentById("constructor")).toBeUndefined();
  });
});

describe("departments", () => {
  it("are the 7 in spine order, with §6.7's discs and agent numbers", () => {
    expect(departments.map((d) => d.id)).toEqual([...DEPARTMENTS]);
    expect(departments.map((d) => `${d.id} ${d.disc} ${d.numbers.join("-")}`)).toEqual([
      "intelligence G07 1-5", "marketing G06 6-10", "sales G05 11-15", "deals G04 16-20",
      "customer G03 21-23", "operations G02 24-28", "back-office G01 29-33",
    ]);
  });

  it("gives Back Office its name, its dp.* key and its five agents", () => {
    expect(departments[6]).toMatchObject({ name: "Back Office", copyKey: "backoffice" });
    expect(departments[6].agentIds).toEqual([
      "back-office-money-in", "back-office-finance-reporting", "back-office-records", "back-office-office", "back-office-talent",
    ]);
  });
});
