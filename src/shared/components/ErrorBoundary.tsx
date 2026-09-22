import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * A real error boundary. The site had none, and one decoration was able to
 * delete the whole document.
 *
 * MEASURED, not theoretical. With Chrome started with --disable-3d-apis, so
 * WebGL is refused the way it is on a GPU blocklist, with hardware
 * acceleration off, behind some privacy extensions or on an old device,
 * scrolling to the closing dot-art scene threw
 * "Cannot set properties of null (setting 'renderer')" out of an effect.
 * React treats an uncaught error during commit as unrecoverable and unmounts
 * the entire tree, so the home page went from 2287 characters, 3 h2 and 8
 * children under #root to 0, 0 and 0, and because that scene is the last thing
 * before the footer it took the footer and every link in it. A blank white
 * page.
 *
 * The scene's own null guards are the real fix for that one throw. This is the
 * backstop for the next one: it is the difference between a missing decoration
 * and a missing site. Wrap anything whose failure should not be load-bearing,
 * which on this site means the WebGL subtrees.
 *
 * Errors thrown from `useEffect` reach here, which is the case that matters:
 * that is where scenes are built.
 *
 * SSR-safe by construction. There is no browser API here and no state read at
 * render time beyond its own, so `renderToString` through entry-server.tsx
 * renders `children` exactly as if the boundary were not there. React does not
 * run boundaries during server rendering, which costs nothing, because
 * everything this wraps is behind Suspense and does not render on the server
 * anyway.
 */

interface Props {
  children: ReactNode;
  /** Rendered in place of the subtree once it has thrown. Default: nothing. */
  fallback?: ReactNode;
  /** Told once, so a parent can stop reserving layout for what is gone. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  failed: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Say what died and that the page survived. Without this the swallow is
    // silent and the next person debugging sees a missing effect and no cause.
    console.error("[ErrorBoundary] subtree failed, page kept:", error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
