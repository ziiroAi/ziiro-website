// §6.3: every "Book a call" on the plan opens the same Calendly event in a new tab, their name and email filled in.
import type { ReactNode } from "react";
import { calendlyUrl } from "../data";
import type { CtaFrom } from "../data/contract";

export interface BookCallLinkProps {
  name: string;
  email: string;
  from: CtaFrom;
  onBook(from: CtaFrom): void;
  className?: string;
  children: ReactNode;
}

export function BookCallLink({ name, email, from, onBook, className, children }: BookCallLinkProps): JSX.Element {
  return (
    <a href={calendlyUrl(name, email)} target="_blank" rel="noopener noreferrer" className={className} onClick={() => onBook(from)}>
      {children}
    </a>
  );
}
