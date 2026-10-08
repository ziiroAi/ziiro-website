/**
 * (C) Review M5: a page that throws while rendering shows g.error, the booking link and a reload, instead of
 * blanking the site. The header and footer sit outside it, so they stay. Moving to another page clears it.
 */
import { Component, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { calendlyUrl, copy } from "@/features/funnel/data/light";
import { ErrorNote } from "@/features/funnel/flow/ErrorNote";
import { funnelSession } from "@/features/funnel/flow/session";
import { INTERIM_BOOKING_URL } from "@/features/pricing/entities/rates";

interface BoundaryState { path: string; failed: boolean }

class Boundary extends Component<{ path: string; children: ReactNode }, BoundaryState> {
  state: BoundaryState = { path: this.props.path, failed: false };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: { path: string }, state: BoundaryState): Partial<BoundaryState> | null {
    return props.path === state.path ? null : { path: props.path, failed: false };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const lead = funnelSession.leadContact();
    const bookingHref = lead ? calendlyUrl(lead.name, lead.email) : INTERIM_BOOKING_URL;
    return <ErrorNote line={copy("g.error")} bookingHref={bookingHref} />;
  }
}

export function RouteBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary path={pathname}>{children}</Boundary>;
}
