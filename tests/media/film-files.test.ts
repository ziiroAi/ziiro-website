import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPINE_FILM_FILES } from "../../src/features/home/sections/BrandFilm";
import { jpegSize } from "../helpers/image-size";

const POSTER_MAX_BYTES = 90_000; // §13.10
const onDisk = (url: string) => `public${url}`;

describe("the Business Spine film (§6.5)", () => {
  it("names its three files ziiro-business-spine-v2-*, the cut without the false claims (12:42 ruling)", () => {
    expect(SPINE_FILM_FILES).toEqual({
      src: "/media/ziiro-business-spine-v2-master.mp4",
      narrowSrc: "/media/ziiro-business-spine-v2-phone.mp4",
      poster: "/media/ziiro-business-spine-v2-poster-1080.jpg",
    });
  });

  it("ships no earlier cut of the Spine film", () => {
    const spine = readdirSync("public/media").filter((f) => f.startsWith("ziiro-business-spine")).sort();
    expect(spine).toEqual(Object.values(SPINE_FILM_FILES).map((url) => url.replace("/media/", "")).sort());
  });

  it("ships them", () => {
    for (const url of Object.values(SPINE_FILM_FILES)) expect(existsSync(onDisk(url)), url).toBe(true);
  });

  it("keeps the poster at 1920 × 1080 and 90 KB or less (§13.10)", () => {
    const poster = readFileSync(onDisk(SPINE_FILM_FILES.poster));
    expect(jpegSize(poster)).toEqual({ width: 1920, height: 1080 });
    expect(poster.length).toBeLessThanOrEqual(POSTER_MAX_BYTES);
  });

  it("leaves no Business Brain film in public/media, and no \"Business Brain\" in src/ (§8.6)", () => {
    expect(readdirSync("public/media").filter((f) => f.startsWith("ziiro-business-brain"))).toEqual([]);
    const brain = readdirSync("src", { recursive: true, withFileTypes: true })
      // Test files may name it to ban it (lane C's copy.test.ts does); only shipped source counts.
      .filter((d) => d.isFile() && !d.name.includes(".test.") && readFileSync(`${d.parentPath}/${d.name}`, "utf8").includes("Business Brain"))
      .map((d) => `${d.parentPath}/${d.name}`);
    expect(brain).toEqual([]);
  });
});
