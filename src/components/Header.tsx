import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, X } from "lucide-react";
import Logo from "@/components/Logo";
import { openSearch } from "@/components/search/openSearch";

/** Primary navigation. Each item is a real page, so the current page can be shown as active. */
const nav = [
  { label: "Products", to: "/products" },
  { label: "Industries", to: "/industries" },
  { label: "Capabilities", to: "/capabilities" },
  { label: "Quality", to: "/quality" },
  { label: "About", to: "/about" },
  { label: "Resources", to: "/resources" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer when the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  // Lock page scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? "border-line bg-paper/95 backdrop-blur" : "border-transparent bg-bone"
      }`}
    >
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Link to="/" aria-label="UNO SUJATA home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 xl:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `font-body text-sm font-medium transition-colors ${
                  isActive ? "text-ink underline decoration-brass decoration-2 underline-offset-[10px]" : "text-ink/70 hover:text-ink"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search the site (Ctrl K)"
            title="Search (Ctrl K)"
            onClick={openSearch}
            className="inline-flex h-11 w-11 items-center justify-center text-ink/80 hover:text-ink"
          >
            <Search size={19} aria-hidden="true" />
          </button>
          <Link to="/request-quote" className="btn-primary hidden !py-2.5 md:inline-flex">
            Request a Quote
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center xl:hidden"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-ink/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-steel text-bone"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex h-[72px] items-center justify-between px-5">
                <Logo inverted />
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="inline-flex h-11 w-11 items-center justify-center">
                  <X size={22} aria-hidden="true" />
                </button>
              </div>
              <div className="rule !border-graphite" />
              <nav aria-label="Mobile" className="flex flex-col px-5 py-6">
                {nav.map((n, i) => (
                  <motion.div key={n.to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                    <NavLink
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `flex items-baseline justify-between border-b border-graphite py-4 font-display text-2xl font-medium ${isActive ? "text-brass-light" : ""}`
                      }
                    >
                      {n.label}
                      <span className="font-mono text-[11px] text-brass-light">0{i + 1}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-auto space-y-3 p-5">
                <Link to="/request-quote" onClick={() => setOpen(false)} className="btn-primary w-full !bg-brass !text-ink hover:!bg-brass-light">
                  Request a Quote
                </Link>
                <Link to="/request-quote?type=drawing" onClick={() => setOpen(false)} className="btn-ghost w-full !border-bone/30 !text-bone hover:!border-bone">
                  Send Your Drawing
                </Link>
                <div className="flex justify-between pt-3 font-body text-sm">
                  <Link to="/faq" onClick={() => setOpen(false)} className="text-bone/80 hover:text-bone">FAQ</Link>
                  <Link to="/contact" onClick={() => setOpen(false)} className="text-bone/80 hover:text-bone">Contact</Link>
                  <button type="button" onClick={() => { setOpen(false); openSearch(); }} className="text-bone/80 hover:text-bone">Search</button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
