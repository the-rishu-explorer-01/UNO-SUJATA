import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { company } from "@/data/company";

/** Footer: the site map grouped by purpose, a contact block, and the legal links. */
const explore = [
  { label: "Products", to: "/products" },
  { label: "Industries", to: "/industries" },
  { label: "Capabilities", to: "/capabilities" },
  { label: "Quality", to: "/quality" },
];
const companyLinks = [
  { label: "About", to: "/about" },
  { label: "Resources", to: "/resources" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact", to: "/contact" },
];

export default function Footer() {
  return (
    <footer className="bg-ink text-bone">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo inverted />
          <p className="mt-5 max-w-sm font-body text-sm leading-relaxed text-bone/70">
            Precision brass components, manufactured in {company.location.split(",")[0]}, {company.location.split(",").slice(1).join(",").trim()}, since {company.founded}.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link to="/request-quote" className="btn-primary !bg-brass !text-ink hover:!bg-brass-light">Request a Quote</Link>
            <Link to="/request-quote?type=drawing" className="btn-ghost !border-bone/30 !text-bone hover:!border-bone">Send Your Drawing</Link>
          </div>
        </div>

        <nav aria-label="Footer: explore" className="md:col-span-2">
          <p className="eyebrow !text-brass-light">Explore</p>
          <ul className="mt-5 space-y-3">
            {explore.map((l) => (
              <li key={l.to}><Link to={l.to} className="font-body text-sm text-bone/80 hover:text-bone">{l.label}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Footer: company" className="md:col-span-2">
          <p className="eyebrow !text-brass-light">Company</p>
          <ul className="mt-5 space-y-3">
            {companyLinks.map((l) => (
              <li key={l.to}><Link to={l.to} className="font-body text-sm text-bone/80 hover:text-bone">{l.label}</Link></li>
            ))}
          </ul>
        </nav>

        <address className="not-italic md:col-span-2">
          <p className="eyebrow !text-brass-light">Contact</p>
          <div className="mt-5 space-y-3 font-body text-sm text-bone/80">
            <p>{company.address}</p>
            <p><a className="hover:text-bone" href={`tel:${company.phone.replace(/[^+0-9]/g, "")}`}>{company.phone}</a></p>
            <p><a className="hover:text-bone" href={`mailto:${company.email}`}>{company.email}</a></p>
          </div>
        </address>

        <nav aria-label="Legal" className="md:col-span-2">
          <p className="eyebrow !text-brass-light">Legal</p>
          {/* Privacy, terms and cookie pages are not published yet. Do not link to them until they exist. */}
          <p className="mt-5 font-body text-sm leading-relaxed text-bone/80">
            Privacy, terms and cookie information on request:{" "}
            <a href={`mailto:${company.email}?subject=${encodeURIComponent("Privacy and terms enquiry")}`} className="underline underline-offset-4 hover:text-bone">{company.email}</a>
          </p>
        </nav>
      </div>
      <div className="border-t border-graphite">
        <div className="container-x flex flex-col gap-2 py-6 font-mono text-[11px] text-bone/65 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {company.legalName}. All rights reserved.</span>
          <span>Inspected to the print.</span>
        </div>
      </div>
    </footer>
  );
}
