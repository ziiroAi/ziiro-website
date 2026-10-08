import SEO from "@/shared/components/SEO";
import { copy } from "@/features/funnel/data/light";
import { FunnelRoot } from "@/features/funnel/flow/FunnelRoot";

/** `/`: the Business Spine funnel, S0 to S9 (spec §4, §8.2). The plan never reaches the HTML. */
export default function Home() {
  return (
    <>
      <SEO title={copy("seo.home.title")} description={copy("seo.home.desc")} canonical="/" />
      <FunnelRoot />
    </>
  );
}
