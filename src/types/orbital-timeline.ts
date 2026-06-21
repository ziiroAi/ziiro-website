import type { ElementType } from "react";

export interface TimelineChildItem {
  id: string;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: ElementType;
  energy: number;
}

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
  childNodes?: TimelineChildItem[];
}
