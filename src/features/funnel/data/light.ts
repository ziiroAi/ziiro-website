// The funnel's light entry, for the header (every page), the questions (S0 to S8) and the film.
// It never imports the agents data, the jobs, the classifier or compose.ts (00-index §1.5).
// Lane C adds its light exports below this line until the module satisfies FunnelLight (contract.ts).
export * from "./contract";
export { copy, COPY_LINES } from "./copy";
