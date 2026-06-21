import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const scrollBehavior = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

  const handleResults = () => {
    setOpen(false);
    if (location.pathname === "/") {
      document.getElementById("results")?.scrollIntoView({ behavior: scrollBehavior() });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: scrollBehavior() });
      }, 400);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-nav py-3" : "py-5"
      }`}
    >
      <div className="w-full px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
          <img
            src="/logo/ziiro-logo-small.webp"
            alt="Ziiro"
            width="96"
            height="64"
            decoding="async"
            style={{ height: "64px", width: "auto" }}
          />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-10">
          <Link
            to="/services"
            className={`text-sm font-medium tracking-wide transition-colors ${
              location.pathname === "/services" ? "text-[#A8B4C8]" : "text-white/55 hover:text-white"
            }`}
          >
            SERVICES
          </Link>
          <button
            onClick={handleResults}
            className="text-sm font-medium tracking-wide transition-colors text-white/55 hover:text-white"
          >
            FOCUS
          </button>
          <Link
            to="/audit"
            className={`text-sm font-medium tracking-wide transition-colors ${
              location.pathname === "/audit" ? "text-[#A8B4C8]" : "text-white/55 hover:text-white"
            }`}
          >
            FREE AUDIT
          </Link>
          <Link to="/contact" className="btn-primary-gradient text-sm font-bold !px-6 !py-2.5">
            BOOK A CALL
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-white" aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden glass-nav mt-2 mx-4 rounded-xl p-6 flex flex-col gap-5">
          <Link to="/services" className="text-base font-medium text-white/80">Services</Link>
          <button onClick={handleResults} className="text-base font-medium text-white/80 text-left">Focus</button>
          <Link to="/audit" className="text-base font-medium text-white/80">Free Audit</Link>
          <Link to="/contact" className="btn-primary-gradient text-center text-sm font-bold mt-1">
            Book a Call
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
