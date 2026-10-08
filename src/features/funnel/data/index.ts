// The funnel's full data module, for the plan chunk and api/funnel/*: the light entry and the rest.
// Lane C adds its exports below this line until the module satisfies FunnelData (contract.ts).
export * from "./light";
export { AGENTS_VERSION, agentById, agents, departments, jobIdsFor, stopsFor } from "./agents";
export { tierFor } from "./tier";
export { classify, CLASSIFIER_VERSION } from "./classifier/classify";
