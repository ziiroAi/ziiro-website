import { Globe, MailCheck, Megaphone, Workflow } from "lucide-react";
import type { TimelineChildItem } from "@/types/orbital-timeline";

export const selfOptimizingSystemNodes: TimelineChildItem[] = [
  {
    id: "self-optimizing-outreach",
    title: "Outreach",
    date: "Reply loops",
    content: "Tracks replies, objections, timing, and follow-up performance so every new sequence gets sharper.",
    category: "Outbound",
    icon: MailCheck,
    energy: 92,
  },
  {
    id: "self-optimizing-marketing",
    title: "Marketing",
    date: "Campaign loops",
    content: "Reads content and campaign signals, finds winning angles, and suggests the next experiments to run.",
    category: "Growth",
    icon: Megaphone,
    energy: 90,
  },
  {
    id: "landing-page-optimization",
    title: "Landing Pages",
    date: "Conversion loops",
    content: "Audits copy, layout, speed, and conversion friction, then ships focused landing-page improvements.",
    category: "Website",
    icon: Globe,
    energy: 91,
  },
  {
    id: "workflow-feedback",
    title: "Workflows",
    date: "Ops loops",
    content: "Watches handoffs, dashboards, approvals, and exceptions so internal systems improve with real usage.",
    category: "Operations",
    icon: Workflow,
    energy: 88,
  },
];
