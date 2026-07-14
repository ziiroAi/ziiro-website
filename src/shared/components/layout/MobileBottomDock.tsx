import { Link, useLocation } from "react-router-dom";
import { Home, Layers, ClipboardCheck, MessageCircle } from "lucide-react";

const items = [
  { path: "/", label: "Home", icon: Home },
  { path: "/#services", label: "Services", icon: Layers },
  { path: "/audit", label: "Audit", icon: ClipboardCheck },
  { path: "/contact", label: "Contact", icon: MessageCircle },
];

export default function BottomDock() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/" && !location.hash;
    if (path.startsWith("/#")) return location.pathname === "/" && location.hash === path.slice(1);
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
      <div className="bg-[#1a1a1a] rounded-2xl px-5 py-2.5 flex items-center gap-1 shadow-2xl shadow-black/40 border border-white/5">
        {items.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all group"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.5}
                fill={active ? "white" : "none"}
                className={`transition-all ${
                  active ? "text-white" : "text-white/50 group-hover:text-white"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-all ${
                  active ? "text-white" : "text-white/50 group-hover:text-white"
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
