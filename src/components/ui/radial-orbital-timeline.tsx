import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineItem } from "@/types/orbital-timeline";

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [activeChildSelection, setActiveChildSelection] = useState<{ parentId: number; childId: string } | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setActiveChildSelection(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    const shouldExpand = !expandedItems[id];

    setExpandedItems(shouldExpand ? { [id]: true } : {});
    setActiveNodeId(shouldExpand ? id : null);
    setActiveChildSelection(null);

    if (shouldExpand) {
      setAutoRotate(false);
      const relatedItems = getRelatedItems(id);
      const newPulse: Record<number, boolean> = {};
      relatedItems.forEach((relId) => { newPulse[relId] = true; });
      setPulseEffect(newPulse);
      centerViewOnNode(id);
    } else {
      setAutoRotate(true);
      setPulseEffect({});
    }
  };

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setRotationAngle((prev) => Number(((prev + 0.25) % 360).toFixed(3)));
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const centerViewOnNode = (nodeId: number) => {
    if (!nodeRefs.current[nodeId]) return;
    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const targetAngle = (nodeIndex / timelineData.length) * 360;
    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 185;
    const radian = (angle * Math.PI) / 180;
    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;
    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(0.35, Math.min(1, 0.35 + 0.65 * ((1 + Math.sin(radian)) / 2)));
    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const item = timelineData.find((i) => i.id === itemId);
    return item ? item.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":   return "text-[#0a0c12] bg-[#C0C8D8] border-[#C0C8D8]";
      case "in-progress": return "text-[#A8B4C8] bg-transparent border-[#A8B4C8]/60";
      case "pending":     return "text-white/60 bg-transparent border-white/20";
      default:            return "text-white/60 bg-transparent border-white/20";
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-2xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Center orb — platinum chrome */}
          <div className="absolute w-14 h-14 rounded-full flex items-center justify-center z-10"
            style={{ background: "radial-gradient(circle, #e8ecf4 0%, #8a92a8 55%, #4a5060 100%)" }}
          >
            <div className="absolute w-20 h-20 rounded-full border border-white/20 animate-ping opacity-50" />
            <div className="absolute w-28 h-28 rounded-full border border-white/10 animate-ping opacity-30"
              style={{ animationDelay: "0.6s" }} />
            <div className="w-6 h-6 rounded-full bg-white/95 backdrop-blur-md" />
          </div>

          {/* Orbit ring */}
          <div className="absolute w-[370px] h-[370px] rounded-full border border-white/10" />

          {/* Nodes */}
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const isHovered = hoveredId === item.id;
            const Icon = item.icon;
            const activeChild = isExpanded && activeChildSelection?.parentId === item.id
              ? item.childNodes?.find((childNode) => childNode.id === activeChildSelection.childId)
              : undefined;
            const displayItem = activeChild ?? item;
            const DisplayIcon = displayItem.icon;
            const hasChildNodes = Boolean(item.childNodes?.length);
            const relatedIds = activeChild ? [] : item.relatedIds;
            const nodeSize = isExpanded ? 60 : isHovered ? 52 : 44;
            const auraSize = isHovered ? item.energy * 0.5 + 70 : item.energy * 0.4 + 44;

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute h-0 w-0"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  zIndex: isExpanded ? 200 : isHovered ? 150 : position.zIndex,
                  opacity: isExpanded ? 1 : isHovered ? 1 : position.opacity,
                  transition: "transform 700ms ease, opacity 200ms ease, z-index 0ms",
                }}
                onMouseEnter={() => { setHoveredId(item.id); setAutoRotate(false); }}
                onMouseLeave={() => { setHoveredId(null); if (!activeNodeId) setAutoRotate(true); }}
              >
                {/* Energy aura — expands on hover */}
                <div
                  className={`absolute rounded-full transition-all duration-300 ${isPulsing ? "animate-pulse" : ""}`}
                  style={{
                    background: isHovered
                      ? "radial-gradient(circle, rgba(192,200,216,0.35) 0%, rgba(192,200,216,0) 70%)"
                      : "radial-gradient(circle, rgba(192,200,216,0.15) 0%, rgba(192,200,216,0) 70%)",
                    width: `${auraSize}px`,
                    height: `${auraSize}px`,
                    left: `-${auraSize / 2}px`,
                    top: `-${auraSize / 2}px`,
                  }}
                />

                {/* Node trigger */}
                <button
                  type="button"
                  className="relative flex flex-col items-center justify-start gap-2 border-0 bg-transparent p-0 text-center outline-none focus-visible:ring-2 focus-visible:ring-[#C0C8D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060610]"
                  style={{
                    width: 180,
                    height: isExpanded ? 100 : isHovered ? 86 : 76,
                    marginLeft: -90,
                    marginTop: -(nodeSize / 2),
                  }}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.title}`}
                  onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                >
                  <span
                    className="flex items-center justify-center rounded-full border-2 transition-all duration-200"
                    style={{
                      width: nodeSize,
                      height: nodeSize,
                      background: isExpanded || isHovered
                        ? "linear-gradient(135deg, #6e7888, #d8dce8)"
                        : isRelated
                        ? "rgba(192,200,216,0.12)"
                        : "rgba(6,6,16,0.85)",
                      borderColor: isExpanded || isHovered
                        ? "#C0C8D8"
                        : isRelated
                        ? "#A8B4C8"
                        : "rgba(255,255,255,0.2)",
                      color: isExpanded || isHovered ? "#0a0c12" : isRelated ? "#C0C8D8" : "rgba(255,255,255,0.7)",
                      boxShadow: isHovered || isExpanded
                        ? "0 0 20px rgba(192,200,216,0.4), 0 0 40px rgba(192,200,216,0.15)"
                        : "none",
                    }}
                  >
                    <Icon size={isExpanded ? 20 : isHovered ? 17 : 15} />
                  </span>
                  <span
                    className="whitespace-nowrap transition-all duration-200"
                    style={{
                      fontSize: isHovered || isExpanded ? 11 : 10,
                      fontWeight: isHovered || isExpanded ? 700 : 600,
                      letterSpacing: "0.08em",
                      color: isExpanded ? "#D8DCE8" : isHovered ? "#ffffff" : "rgba(255,255,255,0.5)",
                      textShadow: isHovered ? "0 0 14px rgba(192,200,216,0.55)" : "none",
                    }}
                  >
                    {item.title}
                  </span>
                </button>

                {/* Child nodes — used for offers that break into sub-systems */}
                {isExpanded && hasChildNodes && item.childNodes && (
                  <div
                    className="absolute top-[5.8rem] left-1/2 z-[210] flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 flex-wrap items-start justify-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.childNodes.map((childNode) => {
                      const isChildActive = activeChildSelection?.parentId === item.id && activeChildSelection.childId === childNode.id;
                      const ChildIcon = childNode.icon;

                      return (
                        <button
                          key={childNode.id}
                          type="button"
                          className="group flex w-[88px] flex-col items-center gap-1 rounded-xl text-center outline-none focus-visible:ring-2 focus-visible:ring-[#C0C8D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060610]"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isChildActive) {
                              setActiveChildSelection(null);
                              const relatedPulse: Record<number, boolean> = {};
                              getRelatedItems(item.id).forEach((relId) => { relatedPulse[relId] = true; });
                              setPulseEffect(relatedPulse);
                            } else {
                              setActiveChildSelection({ parentId: item.id, childId: childNode.id });
                              setPulseEffect({});
                            }
                            setAutoRotate(false);
                          }}
                          aria-pressed={isChildActive}
                          aria-label={isChildActive ? `Hide ${childNode.title}` : `Show ${childNode.title}`}
                        >
                          <span
                            className="flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200"
                            style={{
                              background: isChildActive
                                ? "linear-gradient(135deg, #6e7888, #d8dce8)"
                                : "rgba(6,6,16,0.92)",
                              borderColor: isChildActive ? "#C0C8D8" : "rgba(255,255,255,0.2)",
                              color: isChildActive ? "#0a0c12" : "rgba(255,255,255,0.7)",
                              boxShadow: isChildActive
                                ? "0 0 18px rgba(192,200,216,0.35)"
                                : "none",
                            }}
                          >
                            <ChildIcon size={14} />
                          </span>
                          <span className="text-[9px] font-bold uppercase leading-tight tracking-wider text-white/50 transition-colors group-hover:text-white/80">
                            {childNode.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Expanded card */}
                {isExpanded && (
                  <Card
                    className={`absolute ${hasChildNodes ? "top-[12rem]" : "top-[4.5rem]"} left-1/2 -translate-x-1/2 w-60 border-white/10 shadow-xl overflow-visible`}
                    style={{ background: "rgba(6,6,16,0.96)", backdropFilter: "blur(20px)" }}
                    onClick={(e) => e.stopPropagation()}
                    aria-live="polite"
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/30" />
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex justify-between items-center gap-2">
                        <Badge className={`px-2 py-0 text-[10px] font-bold tracking-wider rounded-sm ${getStatusStyles(item.status)}`}>
                          {activeChild ? "LOOP" : item.status === "completed" ? "ACTIVE" : item.status === "in-progress" ? "GROWING" : "AVAILABLE"}
                        </Badge>
                        <span className="text-[10px] font-mono text-white/40 shrink-0">{displayItem.date}</span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-white font-bold leading-tight">
                        <span className="inline-flex items-center gap-2">
                          <DisplayIcon size={13} className="text-[#A8B4C8]" aria-hidden="true" />
                          {displayItem.title}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/65 px-4 pb-4">
                      <p className="leading-relaxed">{displayItem.content}</p>

                      {/* Impact bar */}
                      <div className="mt-3 pt-3 border-t border-white/[0.07]">
                        <div className="flex justify-between items-center text-[10px] mb-1.5">
                          <span className="flex items-center gap-1 text-white/50">
                            <Zap size={9} />
                            Impact
                          </span>
                          <span className="font-mono text-white/50">{displayItem.energy}%</span>
                        </div>
                        <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${displayItem.energy}%`,
                              background: "linear-gradient(90deg, #6e7888, #d8dce8)",
                            }}
                          />
                        </div>
                      </div>

                      {/* Related services */}
                      {relatedIds.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/[0.07]">
                          <div className="flex items-center gap-1 mb-2">
                            <Link size={9} className="text-white/40" />
                            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-white/40">
                              Pairs with
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId);
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="h-5 px-2 py-0 text-[10px] rounded-sm border-white/10 bg-transparent hover:bg-white/8 hover:border-white/25 text-white/40 hover:text-white/80 transition-all"
                                  onClick={(e) => { e.stopPropagation(); toggleItem(relatedId); }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight size={7} className="ml-1" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
