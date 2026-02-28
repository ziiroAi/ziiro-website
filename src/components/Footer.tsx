import { Link } from "react-router-dom";
import { Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="glass-footer mt-20 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company */}
          <div>
            <h3 className="text-xl font-black tracking-widest mb-3 text-foreground">ZIIRO</h3>
            <p className="text-muted-alpha text-sm mb-4">Automating Tomorrow, Today</p>
            <div className="flex gap-3">
              {["LinkedIn", "Twitter", "Instagram"].map((s) => (
                <a
                  key={s}
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass px-3 py-1.5 text-xs font-medium text-muted-alpha hover:text-foreground transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {["Home", "Services", "About", "Pricing", "Contact"].map((l) => (
                <li key={l}>
                  <Link
                    to={l === "Home" ? "/" : `/${l.toLowerCase()}`}
                    className="text-sm text-muted-alpha hover:text-foreground transition-colors"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Services</h4>
            <ul className="space-y-2">
              {[
                "AI Chatbots",
                "Workflow Automation",
                "Data Analytics",
                "Content Generation",
                "Custom Solutions",
              ].map((s) => (
                <li key={s}>
                  <Link
                    to="/services"
                    className="text-sm text-muted-alpha hover:text-foreground transition-colors"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact</h4>
            <div className="space-y-2 text-sm text-muted-alpha">
              <a href="mailto:aniket@ziiro.work" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail size={14} /> aniket@ziiro.work
              </a>
              <a href="mailto:Govind@ziiro.work" className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Mail size={14} /> Govind@ziiro.work
              </a>
              <p>Mon–Fri, 9 AM – 6 PM EST</p>
              <p>Remote-First Company</p>
            </div>
          </div>
        </div>

        <div className="border-t border-foreground/10 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-alpha">
          <p>© 2026 Ziiro . All rights reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
