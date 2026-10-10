// (C) The viewer API other builders use (W14-F: scroll flights, disc panels, pinned labels). SpineViewer hands it
// over through `apiRef` once the 3D is live, and sets it back to null if the still comes back.
import type { DepartmentId, DiscId } from "../data/contract";
import type { CameraTarget, Framing } from "./camera";
import type { DiscBox } from "./scene";

export type { CameraTarget, DiscBox };

export interface DiscPickEvent {
  /** The disc picked, or null when a hover leaves every disc. */
  disc: DiscId | null;
  via: "tap" | "hover";
  /** The disc's box in the frame it was picked from. */
  box: DiscBox | null;
}

export interface StagePose {
  turn: number;
}

export interface SpineViewerApi {
  /**
   * Moves the camera to a target. With animate (the default) it flies for FLIGHT_MS; without it, or under
   * prefers-reduced-motion, it cuts. Resolves on arrival. A new flyTo replaces one in flight, which then resolves.
   * With hold (a tour stop, W14-X) the model also turns back to its side view on the way, the short way round, and
   * holds still there with no idle spin; a drag still turns it. The next flyTo without hold lets it spin again.
   */
  flyTo(target: CameraTarget, options?: { animate?: boolean; hold?: boolean }): Promise<void>;
  /**
   * W15-B, the one plan stage: puts the camera at this framing at once, each scroll frame. `hold` from 0 to 1 turns
   * the model towards its side view and stops the idle spin; a drag still turns it, and 0 lets it spin again. Ends a
   * flight in progress.
   */
  scrub(framing: Framing, hold: number): void;
  /**
   * W16-A, W17-S: the plan stage's `turn` (radians), added to the model's yaw at a department stop. Kept until the
   * next call; starts at 0.
   */
  setPose(pose: StagePose): void;
  /** W23-C: false while the stage is faded out (the phone band past the plan's end): nothing is drawn till true. */
  setShown(shown: boolean): void;
  /** Lights these departments' discs; the rest keep 12 % (D28). null lights all nine. */
  setLit(lit: readonly DepartmentId[] | null): void;
  /** Called after every drawn frame with all nine discs' screen boxes. Returns an unsubscribe. */
  onDiscBoxes(listener: (boxes: readonly DiscBox[]) => void): () => void;
  /**
   * Called when a disc is tapped or clicked (a press that barely moved), and when a mouse hover moves onto or off a
   * disc. A touch tap counts only if the disc's box is 44 × 44 px or more (§11.3). Returns an unsubscribe.
   */
  onDiscPick(listener: (event: DiscPickEvent) => void): () => void;
  /** The disc under a point in CSS px from the viewer's top left, by raycast. */
  pick(x: number, y: number): Promise<DiscId | null>;
  /** The latest boxes, or [] before the first frame. */
  boxes(): readonly DiscBox[];
  readonly reducedMotion: boolean;
}
