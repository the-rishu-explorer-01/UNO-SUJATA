import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { heroMeta } from "@/data/company";

/** Shared entrance: a short fade and 12px rise. Movement is removed for reduced-motion users by MotionConfig. */
const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/** Technical-drawing placeholder. Replace with approved macro photography. */
function TechDrawing() {
  return (
    <svg viewBox="0 0 520 520" className="h-auto w-full" role="img" aria-label="Technical drawing of a machined brass bushing">
      <rect x="0" y="0" width="520" height="520" fill="none" />
      <g stroke="#0E0F11" strokeWidth="1" fill="none">
        <circle cx="260" cy="260" r="170" strokeWidth="1.5" />
        <circle cx="260" cy="260" r="120" />
        <circle cx="260" cy="260" r="70" />
        <circle cx="260" cy="260" r="42" stroke="#A9834A" strokeWidth="2" />
        <line x1="40" y1="260" x2="480" y2="260" strokeDasharray="6 4" />
        <line x1="260" y1="40" x2="260" y2="480" strokeDasharray="6 4" />
        <line x1="90" y1="90" x2="430" y2="430" strokeOpacity="0.25" />
      </g>
      <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#7D5F33">
        <text x="300" y="58">Ø 340 · REF</text>
        <text x="350" y="112">Ø 240</text>
        <text x="20" y="500">DRAWING · SAMPLE · SPEC</text>
      </g>
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bone">
      <div className="tech-grid absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="container-x relative grid min-h-[calc(100vh-72px)] items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
        {/* Staggered entrance: eyebrow, headline, supporting copy and actions arrive in order. The headline stays readable at once. */}
        <motion.div
          className="lg:col-span-7"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
        >
          <motion.p variants={rise} className="eyebrow">{heroMeta}</motion.p>
          <motion.h1 variants={rise} className="mt-6 font-display text-[42px] font-extrabold leading-[0.98] sm:text-6xl lg:text-[76px]">
            PRECISION BRASS COMPONENTS.
            <span className="block text-brass-deep">ENGINEERED FOR INDUSTRY.</span>
          </motion.h1>
          <motion.p variants={rise} className="mt-7 max-w-xl font-body text-lg leading-relaxed text-ink/75">
            UNO SUJATA turns, forges and machines brass and non-ferrous components for electrical,
            automotive, gas and industrial applications. We build to your drawing, sample or
            specification, with inspection against the print at every stage.
          </motion.p>
          <motion.div variants={rise} className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to="/request-quote" className="btn-primary">
              Request a Quote <ArrowRight size={16} />
            </Link>
            <a href="#products" className="btn-ghost">Explore Products</a>
          </motion.div>
        </motion.div>

        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <div className="border border-line bg-paper p-6 sm:p-10">
            <TechDrawing />
            <div className="mt-4 flex justify-between border-t border-line pt-3 font-mono text-[11px] text-ink/60">
              <span>FIG. 01</span>
              <span>MACHINED BRASS · TO PRINT</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
