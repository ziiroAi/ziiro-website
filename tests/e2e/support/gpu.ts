import type { Page } from "@playwright/test";

/**
 * (C) W14-W: what lets CI run S0's live spine (and, since W14-X, the plan's). CI draws WebGL on SwiftShader, and S0's main-thread probe
 * (first-screen.ts) keeps the 3D off on a software renderer (§6.6 "S0"). This makes the page's own WebGL contexts name
 * a hardware GPU, so the probe lets the 3D start and it renders on SwiftShader underneath. Init scripts never run in
 * workers, so the worker's scene still names SwiftShader and keeps its idle spin off (W14-O).
 */
export const SWIFTSHADER = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"];

/** WEBGL_debug_renderer_info's UNMASKED_RENDERER_WEBGL. */
const UNMASKED_RENDERER = 0x9246;
const HARDWARE_NAME = "ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)";

/** W14-X: the probe runs in its own worker (gl-probe.worker.ts), which init scripts never reach. */
const PROBE_WORKER = /\/assets\/gl-probe\.worker-[\w-]+\.js(\?|$)/;
const PROBE_SEES_HARDWARE = "self.postMessage({ software: false }); self.close();";

export async function probeSeesHardware(page: Page): Promise<void> {
  await page.context().route(PROBE_WORKER, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: PROBE_SEES_HARDWARE }));
  await page.addInitScript(({ unmasked, name }) => {
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const real = proto.getParameter;
      proto.getParameter = function (this: WebGLRenderingContext, p: number) {
        return p === unmasked || p === this.RENDERER ? name : real.call(this, p);
      };
    }
  }, { unmasked: UNMASKED_RENDERER, name: HARDWARE_NAME });
}
