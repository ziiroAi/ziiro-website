/**
 * The eight departments on the hero orbit, in the owner's order.
 *
 * The owner's order wins over the reference picture: the picture was drawn with
 * a PEOPLE node where GTM sits here. `role` is the AI hire that runs the
 * department, which is what the old orb cycled through as "Your AI · …". It is
 * set under each label as a small grey line and turns orange while that node
 * passes the focus marker.
 */
export interface Department {
  /** Two digits, shown in orange above the label. */
  readonly number: string;
  /** Shown upper-cased. Kept in sentence case here so the screen-reader list
   *  reads it as a word rather than letter by letter. */
  readonly label: string;
  readonly role: string;
}

export const DEPARTMENTS: readonly Department[] = [
  { number: "01", label: "Strategy", role: "AI Strategist" },
  { number: "02", label: "Product", role: "AI Product Manager" },
  { number: "03", label: "Marketing", role: "AI Marketer" },
  { number: "04", label: "Sales", role: "AI Sales Agent" },
  { number: "05", label: "Operations", role: "AI Operator" },
  { number: "06", label: "GTM", role: "GTM Agent" },
  { number: "07", label: "Finance", role: "AI Analyst" },
  { number: "08", label: "Technology", role: "AI Engineer" },
];
