# UNO SUJATA Website

Frontend: React, Vite, TypeScript, Tailwind, Framer Motion.
API: Express, Prisma, PostgreSQL.

## Setup

Requires Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # set DATABASE_URL
npm run db:generate           # generate the Prisma client
npm run db:migrate            # create tables (name the migration, e.g. "catalogue")
npm run db:seed               # load categories, products, lookups, industries, capabilities
```

## Run

```bash
npm run server:dev            # API on http://localhost:4000
npm run dev                   # site on http://localhost:5173 (proxies /api and /sitemap.xml)
```

## Checks

```bash
npm run typecheck             # frontend
npx tsc -p server/tsconfig.json --noEmit   # server
npm run lint
npm test                      # unit tests: search, filters, URL state, file validation, RFQ rules
npm run build                 # production build; must pass before release
```

## Catalogue system

### Routes
| Path | Purpose |
| --- | --- |
| `/products` | All products, search, filters, pagination |
| `/products/category/:slug` | Category page with the same search and filters |
| `/products/:slug` | Product detail: spec table, images, related products, quote CTAs |
| `/request-quote?product=:slug` | Quote form, pre-filled with the product |
| `/request-quote?product=:slug&type=drawing` | Drawing submission |

### URL state
Search and filters live in the URL (`?search=`, `material=`, `application=`, `process=`, `type=`, `page=`). Filtered views can be shared, and the back button works. Changing any filter resets to page 1. The canonical URL for a category or the catalogue always points to the base page, so filtered views do not compete with it in search.

### API
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/products` | `search`, `category`, `material`, `application`, `process`, `type`, `page`, `limit` (max 48, default 12). Repeat a param or use commas for several values. |
| GET | `/api/products/:slug` | Includes spec fields, images and up to 4 related products. 404 if unknown or unpublished. |
| GET | `/api/categories` | Includes `productCount` |
| GET | `/api/materials` | |
| GET | `/api/applications` | |
| GET | `/api/processes` | |
| GET | `/api/facets` | Filter options with live counts (drives the sidebar) |
| POST | `/api/quote-requests` | Validated. Accepts optional `productSlug`. Returns a `reference`. |
| GET | `/sitemap.xml` | Generated from the database: static pages, categories and published products |

### Search behaviour
Each word in the query must match at least one of: product name, part number, product type, description, category, material, application or process. Words are matched case-insensitively. Singular and plural forms match each other ("pins" finds "pin"). For example, "brass pin" returns brass products whose name or type includes "pin". Results are ordered by name. There is no relevance ranking yet.

### Data provenance
- Category and product names come from sujatabrass.com.
- Materials, applications, processes and product types are **derived** from those names. They are not confirmed specifications.
- Every product is `verified: false`. Product codes are null. Finishes are empty. Unknown values show "Available on request".
- Dimensions show "As per drawing" on every product. This is the company's standard practice, not a measured value.
- Marketplace listings from other companies were deliberately not used as a source.

## Request for quotation (RFQ)

### Journey
Product page → "Request a Quote" (pre-fills product, part number and category) → form → drawings uploaded and checked one at a time → submit → RFQ reference shown on the success page → confirmation email to the customer and notification to the internal inbox.

### Routes
| Path | Purpose |
| --- | --- |
| `/request-quote` | Form. Accepts `?product=<slug>` and `&type=drawing`. |
| `/request-quote/success` | Confirmation with the RFQ reference. Reads it from navigation state, not the URL. |

### API
| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/rfq/uploads` | Multipart, one file, field name `file`. Returns a staged file `id`. Rate limited. |
| DELETE | `/api/rfq/uploads/:id` | Removes a staged file the customer no longer wants. |
| POST | `/api/rfq` | JSON submission. Send `Idempotency-Key` (16–64 characters). Returns `rfqNumber`, `status`, `submittedAt`, and a one-time `accessToken`. |
| GET | `/api/rfq/:rfqNumber` | Customer-safe status. Requires header `X-RFQ-Token`. Returns only the number, a status label, the submission date and product names. Wrong or unknown references return the same response. |

### RFQ numbers
`RFQ-SUJ-2026-00001`. Generated on the server inside the same transaction that creates the RFQ, using an atomic per-year counter (`RfqCounter`). A rolled-back submission does not consume a number. The year is UTC.

### Uploads
1. The browser checks the extension, size, count and first bytes. This is for speed only.
2. The server repeats every check: allowlisted extension, size limit, file signature (magic bytes), and blocked executable and script content, whatever the extension says.
3. The file is stored under a random name, outside any public directory, with owner-only permissions. Its name is sanitised. Its MIME type is set by the server, not the client.
4. Staged files expire after 24 hours and are removed by an hourly job. Only files attached on submission become part of the RFQ.

Allowed: PDF, STEP (.step, .stp), DWG, DXF, JPG, PNG. Up to 5 files, 10 MB each (`MAX_UPLOAD_MB`).

### Security
- Server-side validation of every field (zod). Client validation is advisory.
- HTML tags are stripped from free text. Line breaks are removed from single-line fields, so values cannot inject email headers.
- Honeypot field (`website`) rejects automated form fills.
- Rate limits per IP: submissions, uploads and lookups (`RFQ_SUBMIT_LIMIT`, `RFQ_UPLOAD_LIMIT`, `RFQ_LOOKUP_LIMIT`). Set `TRUST_PROXY` behind a reverse proxy so the real client IP is used.
- CORS allowlist from `CORS_ORIGIN`. In production with no list set, cross-origin requests are refused.
- Lookup tokens are 192-bit random values. Only their SHA-256 hash is stored. Comparison is constant-time.
- Idempotency keys stop a retried or double-clicked submission creating two RFQs.
- Errors never include stack traces. 5xx responses use a generic message, and details go to the server log.

### Email
An abstraction in `server/src/services/email/`. Choose the transport with `EMAIL_PROVIDER`:
- `console` (default): prints emails to the server log. Use for development only.
- `smtp`: sends through `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, with `MAIL_FROM`.

Customer confirmation: "Your requirement has been received." with the RFQ number. Internal notification: "New RFQ received." sent to `RFQ_NOTIFY_EMAIL`, with the customer as reply-to. Email failures are logged and do not fail the submission, because the RFQ is already saved. The database does not yet record whether each email was delivered.

### Database
- `RFQ`: the enquiry, with `status` (`NEW`, `UNDER_REVIEW`, `TECHNICAL_REVIEW`, `QUOTE_PREPARED`, `CLOSED`).
- `RFQAttachment`: drawings attached to an RFQ. Cascade-deleted with the RFQ.
- `RFQProduct`: products linked to an RFQ. Names and codes are copied, so the record survives catalogue changes.
- `PendingUpload`: staged files awaiting submission.
- `RfqCounter`: per-year sequence.

In Prisma Client the models are accessed as `prisma.rFQ`, `prisma.rFQAttachment` and `prisma.rFQProduct`, following Prisma's naming rules.

Migration note: the earlier `QuoteRequest` table and the `/api/quote-requests` endpoint are removed. There is no production data to migrate yet.

### Open items for the RFQ system
1. Email delivery is not recorded on the RFQ. Add `customerEmailSentAt` and `internalEmailSentAt` before go-live.
2. Attachment files are not deleted when an RFQ is deleted (the rows are). Add a cleanup job.
3. No virus scanning. Add ClamAV or a managed scanner before accepting files from the public.
4. No internal interface for changing status yet. The statuses exist; a back office or admin route should set them.
5. The customer status lookup has no UI. The token is returned once to API clients. Decide whether to email a status link or build a customer portal.
6. The sales inbox address (`RFQ_NOTIFY_EMAIL`) must be supplied by the client.
7. `Industry`, `Material` and `Application` inputs accept free text. Suggestions come from the catalogue lists, but nothing forces a choice.
8. Customer privacy consent wording needs legal review.

## Staff administration

Staff sign in at `/admin/login`. Everything under `/admin` is a separate shell from the public site and is never indexed.

### Setting up the first administrator
```bash
npm run db:migrate                                   # creates the admin tables (see Migrations)
ADMIN_EMAIL=you@company.example \
ADMIN_PASSWORD='a long passphrase of at least 12 characters' \
npm run admin:create
```
Clear the password from your shell history afterwards, or keep it in a secret manager. Further staff accounts are created by an administrator at Settings → Staff accounts.

### Screens
| Path | Who | Purpose |
| --- | --- | --- |
| `/admin` | staff | Dashboard: new and open RFQs, RFQs this week against last week, catalogue counts, RFQs by status, latest RFQs, recent activity |
| `/admin/rfqs` | staff | Search by RFQ number, company, name or email. Filter by status. Paginated. |
| `/admin/rfqs/:id` | staff | Customer, requirement, drawings (download), status change, history |
| `/admin/contacts` | staff | Contact form enquiries. Mark as handled. |
| `/admin/products` | staff | Search, filter by category and state. Archive and restore. |
| `/admin/products/new`, `/admin/products/:id` | editor, admin | Identity, category, material, application, process, specifications, finishes, publishing, images |
| `/admin/categories` | editor, admin | Create, edit, archive, restore, reorder |
| `/admin/industries`, `/admin/capabilities` | editor, admin | Create and edit |
| `/admin/content` | editor, admin | Hero, statistics, homepage sections, quality, about, contact details |
| `/admin/settings` | everyone | Change own password. Administrators also manage staff accounts and reset passwords. |

### Roles
| Permission | ADMIN | EDITOR |
| --- | --- | --- |
| View dashboard, RFQs, contacts, catalogue | yes | yes |
| Change RFQ status, download drawings | yes | yes |
| Manage products, categories, lookups, images | yes | yes |
| Manage industries, capabilities, content | yes | yes |
| Manage staff accounts, reset passwords | yes | no |
| Read audit trail | yes | yes |

The role map is in `server/src/lib/permissions.ts`. Adding a role means adding its permissions there. Routes do not change.

### Security model
- **Passwords** are hashed with scrypt (N=2^15) with a per-password salt. Plain passwords are never stored or logged. Minimum length 12.
- **Sessions** are random 256-bit tokens. Only their SHA-256 hash is stored. The cookie is HttpOnly, SameSite=Strict, and Secure in production. Sessions expire after 8 hours and are checked against the database on every request, so revocation takes effect immediately.
- **Sign-out and password change** revoke sessions server-side. A password change signs out every device. Deactivating or resetting an account does the same.
- **Brute force** is limited per IP (`ADMIN_LOGIN_LIMIT`, default 10 per 15 minutes) and per account (locked for 15 minutes after 5 failures). Unknown emails and locked accounts get the same message and the same response time as a wrong password.
- **CSRF**: state-changing requests must echo the `uno_csrf` cookie in the `X-CSRF-Token` header. A cross-site page cannot read the cookie, so it cannot send the matching header.
- **Authorisation** is checked on the server for every route, after authentication. The client hides controls the role cannot use, but that is cosmetic.
- **Input** is validated with zod on every route. Route ids must match a strict pattern. Unknown fields are ignored. The acting user always comes from the session, never from the request body.
- **Downloads**: each drawing is streamed with a nosniff header, a canonical content type, and `no-store`. Every download is written to the audit trail.
- **Audit trail** records sign-ins, failed sign-ins, status changes, product, category and content changes, downloads, and account changes. Audit writes for status changes are inside the same transaction as the change.
- **Safeguards**: the last active administrator cannot be demoted or disabled, and nobody can remove their own administrator access.
- **Public product images** live in `MEDIA_DIR`, served read-only at `/media`. Only JPG, PNG and WebP are accepted, identified by their bytes. Drawings are never in this directory.
- **Errors** return a generic message and a stable code. Details go to the server log.

### Content (CMS)
Each key is validated against its own schema and has a default. Defaults only use facts verified on the company website. The public read endpoint is `GET /api/content`. The homepage does not read it yet. Wiring it in is the next step, and the admin already writes the fields it will need.

| Key | Fields |
| --- | --- |
| `homepage.hero` | eyebrow, two headline lines, supporting text, two button labels |
| `homepage.stats` | up to six value and label pairs |
| `homepage.sections` | eight sections, each shown or hidden |
| `quality` | title, introduction |
| `about` | headline, story |
| `contact` | phone, email, address, opening hours (blank until confirmed) |

### Migrations
Run `npm run db:migrate` and name the migration (for example `admin`). This project had no `migrations/` folder before this change, because earlier sessions did not run migrate. The first migration therefore covers the whole schema, including the catalogue, RFQ and admin tables. Review the generated SQL before applying it to a shared database.

### Admin API
All routes are under `/api/admin`. Everything except `POST /auth/login` needs a session cookie, and state-changing methods also need `X-CSRF-Token`.

| Method | Path | Permission |
| --- | --- | --- |
| POST | `/auth/login` | none (rate limited) |
| POST | `/auth/logout`, POST `/auth/password`, GET `/auth/me`, GET `/auth/csrf` | any signed-in user |
| GET | `/dashboard` | dashboard:read |
| GET | `/rfqs`, GET `/rfqs/:id` | rfq:read |
| PATCH | `/rfqs/:id/status` | rfq:update |
| GET | `/rfqs/:id/attachments/:attachmentId` | rfq:download |
| GET, POST | `/products` | product:read, product:write |
| GET, PUT | `/products/:id` | product:read, product:write |
| POST | `/products/:id/archive`, `/restore` | product:write |
| POST, DELETE | `/products/:id/images`, `/images/:imageId` | product:write |
| GET | `/categories`, `/lookups` | product:read |
| POST, PUT | `/categories`, `/categories/:id`; POST `/categories/:id/archive`, `/restore`, `/categories/reorder` | category:write |
| GET, POST, PUT | `/industries`, `/capabilities` | content:read, content:write |
| GET, PUT | `/content`, `/content/:key` | content:read, content:write |
| GET | `/contacts`; POST `/contacts/:id/handled` | contact:read, contact:write |
| GET, POST, PATCH | `/users`, `/users/:id` | user:manage (administrators only) |
| GET | `/audit` | audit:read |

Public endpoints: `GET /api/content` and `POST /api/contact` (honeypot, rate limited).

### Archiving
Archiving a product hides it from the website and keeps it for records. Archiving a category is refused while it still has live products, so no public category is left empty or broken. Restoring a product under an archived category is refused until the category is restored.

## Corporate and manufacturing pages

| Path | Purpose | Data source |
| --- | --- | --- |
| `/industries` | Five sectors served, each linked | `src/data/pages.ts`, industry rows from the API |
| `/industries/:slug` | Requirement, typical components, capability, relevant live products, quote CTA, previous and next | `src/data/pages.ts`; products from `GET /api/products?application=` |
| `/capabilities` | Requirement through dispatch, in three stages, with a process diagram | `src/data/pages.ts` |
| `/quality` | Philosophy, six inspection stages, certifications from the CMS | `src/data/pages.ts`; CMS `quality` |
| `/about` | Story, statistics, timeline, Jamnagar, engineering focus, business approach, group | CMS `about`; `src/data/pages.ts`; `src/data/company.ts` |
| `/contact` | Company details, map placeholder, enquiry form to `POST /api/contact`, two CTAs | CMS `contact`; `src/data/company.ts` |

Every page has a unique title, meta description, canonical URL, Open Graph tags and structured data (`CollectionPage`, `WebPage`, `BreadcrumbList`, `AboutPage`, `ContactPage`, `Organization`). Animations fade in once on scroll. `MotionConfig reducedMotion="user"` turns off movement for people who ask for reduced motion.

### Industries
Five sectors, each backed by product categories on the company website: Electrical, Automotive, Gas Equipment, Fasteners & Hardware, Industrial Engineering. Industry slugs match the catalogue's application slugs, so the relevant products are real.

**Not published** (no supporting evidence on the company's own website): Electronics, Energy, Appliances, Hardware (as distinct from fasteners), Automation, Gas & Plumbing (plumbing). Add one only when the client confirms it, and add its content to `industryContent` in `src/data/pages.ts`. The test in `src/data/pages.test.ts` fails if an industry has no content.

**Industry rows and content must stay in step.** The test checks slugs match. If you rename an industry slug, change it in both places. The seed only creates and updates rows, and there is no admin delete for industries, so remove the old row directly in the database.

### Claims register

Facts from the company website, and what is still to confirm. Lines marked CONFIRM are process descriptions written from typical practice. The company website does not state them.

| Claim | Basis | Where |
| --- | --- | --- |
| Founded 1978, 200 sq. ft. start, Jamnagar | Company website | About, timeline |
| About 100,000 sq. ft. facility, about 120 workforce | Company website | About, statistics |
| Sujata Group with six other companies | Company website | About, timeline |
| Machine division builds sliding head, single spindle and rotary table machines | Company website (machine division page) | About, capabilities |
| "India's third largest exporter of brass and copper parts" | Company's own statement, shown with attribution | About |
| Each product made exactly to the print | Company website | Quality, capabilities |
| Measuring instruments used for dimensional checks | Company website navigation | Quality, capabilities |
| Non-ferrous turned components; forged and machined components | Company website product list | Capabilities, industries |
| Engineering review before quoting | CONFIRM | Capabilities, about |
| Material inspection, process inspection, final inspection | CONFIRM | Quality |
| Documentation and traceability | CONFIRM | Quality |
| Finishing, packaging, dispatch | CONFIRM | Capabilities |
| Opening hours | Not in the sources; left blank in CMS | Contact |

**Conflicting figures on third-party listings** were not used: a 1979 founding date, a 62,000 sq. ft. factory, 80 workers, and a 2003 registration. Those listings also describe a different legal entity. Confirm the official figures with the client.

### Certifications and placeholders
- **Certifications** are entered in the admin (Content → Quality). Each needs a name, issuing body, reference and validity date. Until one is added, the page says certifications will appear once verified. Nothing is shown by default.
- **Opening hours** on the contact page appear only once entered in the CMS.
- **Map**: a placeholder box with a link to Google Maps. No embedded map yet, to keep third-party scripts off the page.
- **Photography**: the pages use technical drawings. Replace them with approved factory photography when available.

### Route checks to run (in a browser)
Each route: loads, has one `h1`, title and description are unique, canonical is correct, no console errors.

1. `/`, `/products`, `/products/fuel-jets`, `/request-quote` (regression)
2. `/industries`, and each of its five links
3. `/industries/electrical`, `/industries/automotive`, `/industries/gas-equipment`, `/industries/hardware-fasteners`, `/industries/industrial`: relevant products load; "Request quote" links carry the product
4. `/industries/does-not-exist`: "Industry not found" page with `noindex`
5. `/capabilities`, `/quality`, `/about`, `/contact`
6. `/contact`: send an empty form (inline errors), a valid enquiry (success), and a second submission while the API is stopped (network message)
7. Quality page with and without a certification entered in the admin
8. Header and footer links on every public page, the mobile drawer at 360 px, and the Resources link opening the catalogue in a new tab
9. Animations with the operating system's "reduce motion" setting turned on: content visible without movement
10. Sitemap at `/sitemap.xml` lists every route above, plus each industry

### Open items for these pages
1. **Privacy, terms and cookie pages** are still linked from the footer and do not exist yet.
2. **CONFIRM lines** on the quality and capabilities pages need the client's sign-off, or rewording.
3. **Photography and the map** are placeholders.
4. **Industry content** is in code (`src/data/pages.ts`), not the CMS. Move it into the CMS if the client will edit it.
5. **Resources** links to the company catalogue only. Add a proper resources page when there is more to publish.

## Discovery: search, resources, FAQ, navigation

### Global search (`/search` and the Ctrl/Cmd+K palette)
One endpoint, `GET /api/search?q=`, searches products, categories, industries, capabilities, resources and pages. Results come back in groups, in this order: Products, Categories, Industries, Capabilities, Resources, Pages. Each group is capped at five items.

- **Matching:** every word must appear in at least one field of an item. Singular and plural forms match. Queries are capped at 100 characters, and control characters are removed.
- **Only published content is searched.** Archived products, archived categories and resources without an uploaded file are excluded.
- **Desktop:** a command-style palette with keyboard navigation. ArrowUp and ArrowDown move through results, Enter opens the highlighted item or the full search page, and Escape closes it. Ctrl+K or Cmd+K opens it from anywhere outside a text field.
- **Mobile:** the palette fills the screen.
- **States:** suggestions and recent searches when empty, a loading state, a no-results message with two routes forward (browse products, send a drawing), and an error state with retry.

**Privacy of searches**
- The server does not log or store search text. The search response is `Cache-Control: private, no-store`, and product lists with a search term are not shared-cached.
- Recent searches are kept in `sessionStorage`. They are cleared when the tab closes and are never sent to the server.
- Queries that look personal are never remembered: anything containing an email address, six or more digits, more than 60 characters, or words suggesting account, identity, medical or payment details.
- The full search page writes the query into the URL with replace, so typing does not fill the browser's history. The URL does contain the query while the page is open. Any future access log must not record query strings; none is configured.

**Search rate limit:** 120 requests a minute per IP (`SEARCH_LIMIT`).

### Resources (`/resources`)
Only documents that have been uploaded and checked are shown. There are no placeholder PDFs and no links to unverified files.

- Staff upload PDFs in Admin → Resources. The server accepts only files that start with `%PDF-` and contain an end-of-file marker, up to 20 MB.
- A resource cannot be published until its file is attached. The server refuses the publish.
- Replacing or deleting a resource removes its old file from public storage.
- The public page shows an honest empty state, "Documents are not published yet", until the first document is published.

**Not used:** the company's catalogue PDF linked from its website. A search for it found no copy, so its existence could not be checked. Upload it through the admin once the client confirms it.

Security note: PDFs can carry active content. Uploads are restricted to staff, but scanning uploads for malicious content is still an open item.

### FAQ (`/faq`)
- Stored in the database (`FaqEntry`) and managed in Admin → FAQ. Seeded with the answers in `src/data/faq.ts`, but only when the table is empty, so admin edits are never overwritten.
- Grouped by category: Ordering, Custom components, Materials, Drawings and files, The quote process, Quality, Packaging and delivery. A category with no published answers is hidden.
- Native disclosure elements, so the page works without JavaScript and is keyboard accessible.
- The FAQPage structured data is generated from the answers shown on the page.
- **Only factual answers are published.** Questions about lead times, payment terms, packing methods, certifications and minimum quantity guarantees are not published. The minimum-order answer states that no minimum is published, which is accurate.
- A test fails if an answer contains an unconfirmed promise, such as a turnaround time or a certification claim.

### Navigation review
- **Where am I:** the current section is underlined in the header and marked as the current page for assistive technology. Each inner page has breadcrumbs: Products, Industries, Capabilities, Quality, About, Contact, Resources, FAQ, Search, Request a quote, and each product and industry page.
- **What can I do next:** each page ends with the two calls to action (Request a Quote and Send Your Drawing), or a link to the next logical page.
- **Header:** Products, Industries, Capabilities, Quality, About, Resources, plus search and Request a Quote.
- **Mobile menu:** the same six links, with the current page marked, plus FAQ, Contact, Search and the two calls to action.
- **Footer:** Explore (Products, Industries, Capabilities, Quality), Company (About, Resources, FAQ, Contact), the contact block, and the legal links, with Request a Quote and Send Your Drawing beside them.

### 404
The page says "This component doesn't exist." It offers Return Home and Explore Products, plus a search box that goes to `/search`. It is marked noindex. It uses the same visual language as the rest of the site.

### Performance audit
| Area | Finding | Action |
| --- | --- | --- |
| JavaScript | Every page was in one bundle, including the admin | Route-level code splitting. Only the homepage loads eagerly, and the admin loads only for staff. |
| API calls | Categories, industries, capabilities, lookups and content were fetched again on every page | In-memory cache with shared in-flight requests, 1 to 5 minutes by data type. Failures are not cached. Search is never cached. |
| Server caching | Catalogue reads had no cache headers | `Cache-Control` on catalogue reads (60 to 300 seconds). Searched product lists are `private, no-store`. |
| Search | Typing fired a request per keystroke | Debounced (180 to 250 ms). A new query aborts the previous request. |
| Images | No raster images on the public pages; product images are lazy-loaded with fixed aspect ratios | No change. Add responsive formats when photography arrives. |
| Fonts | Three families with multiple weights, loaded with `display=swap` and preconnect | Kept. Every weight in the list is used by the interface. Consider self-hosting to remove the third-party request. |
| CSS | Tailwind purges unused classes | No change needed. |
| Animations | Each reveal runs once, on scroll | `reducedMotion="user"` turns off movement for people who ask for it. |

### Testing this release
Run `npm test`, then check each route in a browser at 360, 390, 768, 1024 and 1440 px:

1. **Search:** Ctrl+K opens the palette. "brass pin" returns grouped results. ArrowDown and Enter open the highlighted result. Escape closes. A query with no results shows the no-results state. Stop the API and confirm the error state with retry. Mobile shows a full-screen search.
2. **Search page:** typing updates the URL without adding history entries. The Back button leaves the search page.
3. **Recent searches:** after choosing a result, the query appears in recent searches. An email address does not. Closing the tab clears the list.
4. **Navigation:** the active section is underlined in the header. Breadcrumbs appear and link correctly. The mobile menu opens, closes with the button and with Escape, and marks the current page.
5. **404:** `/does-not-exist` shows the component message, both buttons work, and the search box goes to `/search`.
6. **Resources:** with no published documents, the empty state shows. Upload a PDF in the admin and publish it. Confirm it appears and downloads. Try to publish with no file (refused). Replace the file and confirm the old URL returns 404.
7. **FAQ:** each category opens and closes. Each answer shows. The page works with JavaScript disabled.
8. **Footer:** every link goes to a working page, except the legal links, which are still open items.
9. **Performance:** in the browser network tab, confirm `/admin` code is not loaded on public pages, and categories are requested once per minute across page changes.

### Open items for discovery
1. **Search is not full-text.** It matches words in fields, with no relevance ranking. PostgreSQL full-text search would improve ranking.
2. **Focus trap in the palette** is not complete. Tab can move focus behind the dialog. Add a full focus trap before accessibility sign-off.
3. **FAQ answers** need client confirmation for the existing entries, and new entries are needed for lead times, packing and certifications.
4. **Resources** need the first real documents uploaded by the client.
5. **Legal pages** (privacy, terms, cookies) are still missing.

## Removed: GST invoice generator

The GST invoice generator (numbering, seller settings, invoice documents, invoice PDF and print views, and invoice API routes) has been removed. It is not part of this product and must not be reintroduced.

**Before running `npm run db:migrate` on any existing database**, check whether the `Invoice`, `InvoiceLine`, `InvoiceSettings` and `InvoiceCounter` tables contain records. The migration generated from the current schema drops those tables, and dropping them destroys any data in them. If records exist, export them first, or write the migration by hand to keep the data.

Customer records are kept. They live in the `Customer` table and are managed at Admin → Customers, with the `crm:read` and `crm:write` permissions.

## Product Assistant, product files and 3D viewer

### Product Assistant (chatbot)
- A floating button, bottom-right on public pages. It answers from the published catalogue: product names, part numbers, categories, materials and applications.
- **Grounding:** the server searches the published catalogue first, then passes only those published fields to the AI provider. Internal fields, files and notes never reach it.
- **No provider configured:** replies come from fixed, factual text, and product cards still show. Set the variables below to enable AI replies.
- **No invented facts:** replies never state prices, stock, certifications, tolerances, capacity or dimensions. When a detail isn't in the record, the reply says the sales team will confirm it.
- **Quotation requests** go through the existing RFQ endpoint, so they appear in Admin → RFQs. The reference number is shown only after the server confirms receipt. The request asks for consent to be contacted.
- **Privacy:** chat messages are not stored, and nothing is kept in the browser. The panel asks visitors not to share personal or financial details.
- **Rate limit:** 20 messages a minute per IP (`CHAT_LIMIT`).

### Product files: drawings, 3D models and documents
- **Types:** 2D engineering drawings (PDF), 3D models (GLB), and documents (PDF). Images still use the existing product image uploader (JPG, PNG, WebP).
- **Checks:** the server checks the file's bytes, not its name. A PDF must start with `%PDF-` and contain an end-of-file marker. A GLB must start with `glTF`, be version 2, and declare a length equal to the file size. Disguised executables are refused.
- **Storage:** files are stored in `PRIVATE_FILES_DIR` with random names, and are served only through the API. They are never placed in a public folder.
- **Visibility:** every file is private until an administrator approves it. Approving a 3D model or drawing is an explicit step. Unapproved drawings are described as "available on request".
- **Size limits:** PDF 25 MB, GLB 50 MB (`MAX_MODEL_MB`).

### 3D viewer
- Shown on the product page for approved GLB models. It loads only when the visitor clicks "Load 3D view", so the Three.js code is not part of the first page load.
- Controls: rotate and zoom by mouse, touch or pinch, plus buttons for zoom in, zoom out, fit to screen and reset view.
- A studio environment map is used, so metal surfaces read as metal.
- It is for visual inspection only. Each viewer says so, and it does not measure the part.

### Not built yet
- **SVG drawings.** Refused. A verified sanitiser is needed before any user-supplied SVG is stored or shown.
- **STL and OBJ models.** Refused. Convert to GLB first. No conversion pipeline exists.
- **Chatbot admin settings** (enable or disable, welcome message, suggested questions) and **usage statistics.** Not built.
- **Internal notes and status history on quotation requests** beyond the existing audit trail. Not built.
- **Reordering and captions for existing product images.** Not built. Images can still be uploaded and removed.
- **Malware scanning** of uploads. None is in place.
- **Testing:** the viewer and the chat widget have not been run in a browser, and no dependency install was possible in this environment.

### Setup
Run `npm install`, which adds `three` and `@types/three`. Then run the migration. It adds the `ProductFile` table and the `ProductFileKind` enum. A migration that only adds a table does not drop data, but check the generated SQL before applying it.

### Environment variables (server)
| Variable | Purpose |
| --- | --- |
| `PRIVATE_FILES_DIR` | Private folder for drawings, models and documents. Keep it out of the web root. |
| `MAX_MODEL_MB` | GLB size limit in MB. Default 50. |
| `CHAT_LIMIT` | Chat messages per minute per IP. Default 20. |
| `CHAT_AI_URL` | OpenAI-compatible chat completions endpoint. Optional. |
| `CHAT_AI_KEY` | API key for that endpoint. Server only. Never put this in a `VITE_` variable or in frontend code. Optional. |
| `CHAT_AI_MODEL` | Model name for that endpoint. Optional. |

Without `CHAT_AI_URL`, `CHAT_AI_KEY` and `CHAT_AI_MODEL`, the assistant uses its fixed replies and product search.

### Uploading a product with drawings and a 3D model
1. Admin → Products → open the product, or create it and save as a draft.
2. Under **Images**, upload the photographs, as before.
3. Under **Drawings and 3D models**, choose a type and label (for example "Front view" or "Dimensioned drawing"), select the file, and upload. The progress bar shows the upload.
4. Review the file in **Open**. When it is correct, choose **Approve for public display**.
5. Publish the product. The viewer appears on the product page, and approved drawings are listed for download.

## Structure

```
src/
  data/        catalogue seed (products, categories, lookups), company facts, content
  hooks/       debounced value, cancellable product list fetch
  lib/         API client, URL query helpers, Zod schemas
  components/catalog/   search, filter panel and drawer, active chips, cards, pagination, states, spec table
  pages/       products list, product detail, quote, 404
  sections/    homepage sections
server/
  src/services/productFilters.ts   pure search and filter logic (unit tested)
  src/lib/files.ts, rfqSchema.ts   upload policy and submission validation (unit tested)
  src/services/rfq.service.ts      RFQ creation, uploads, status lookup
  src/services/email/              email abstraction and templates
  src/services/auth.service.ts     sign-in, lockout, sessions, password change
  src/services/admin-*.service.ts  staff operations (RFQs, catalogue, content, users)
  src/middleware/auth.ts           session, CSRF and permission middleware
  src/lib/permissions.ts           role to permission map
  src/cli/create-admin.ts          first administrator
  src/services/customer.service.ts CRM customer records
  src/services/product-file.service.ts private drawings, models and documents
  src/services/chat.service.ts     product assistant: grounded search, optional AI, fallback
  src/lib/chatLogic.ts             intent, keywords, grounding fields, fallback text (tested)
  src/components/chat/             product assistant widget and quotation form
  src/components/product/          3D viewer (lazy) and public technical files
  src/services/search.service.ts   grouped global search, suggestions
  src/services/resource.service.ts documents: publish only with an uploaded PDF
  src/services/faq.service.ts      FAQ entries and public grouping
  src/services/product.service.ts  database queries
  src/routes/sitemap.ts            dynamic sitemap
  prisma/schema.prisma             catalogue, lookups, images, quote requests
  prisma/seed.ts                   loads src/data into the database
```

## Data model

- `ProductCategory` one-to-many `Product`
- `Product` many-to-many `Material`, `Application`, `ManufacturingProcess`
- `Product` one-to-many `ProductImage` (cascade delete)
- `QuoteRequest` optionally references a product by slug

## Before launch: open items

1. **Confirm technical data with the client, product by product.** Materials, processes and applications are derived. Set `verified: true` once confirmed.
2. **Product codes:** supply real part numbers. Search matches them.
3. **Images:** no product photography exists yet. Each product currently shows a placeholder. Upload real images through `ProductImage`.
4. **Image optimisation:** images are served at their original size with lazy loading and fixed dimensions to prevent layout shift. Add a CDN or resize pipeline (WebP, responsive `srcset`) before launch.
5. **Routes still missing:** `/about`, `/quality`, `/privacy`, `/terms`, `/cookies`.
6. **Domain:** `https://www.unosujata.com` is a placeholder. Replace it in `index.html`, `src/components/Seo.tsx`, `server/src/routes/sitemap.ts` (or set `PUBLIC_SITE_URL`).
7. **Filter counts are global**, not recalculated for the current search. Making them contextual is a possible enhancement.
8. **Search ranking:** results are alphabetical. Relevance ranking (name matches first) would need a search index such as PostgreSQL full-text search.
9. **Quote notifications:** requests are stored but no email is sent yet.
10. **SEO for crawlers that don't run JavaScript:** per-product meta tags are set in the browser. Add prerendering or server rendering before relying on them.
11. **Copy to confirm:** the journey steps, quality check descriptions and response-time wording on the homepage (carried over from earlier).

## Open items for staff administration
1. **Homepage content** is still static. Read `GET /api/content` into the sections and remove the hard-coded copy.
2. **Two-factor sign-in** is not implemented. Recommended before the admin is used from outside the office network.
3. **Session list and sign-out of other devices** are not shown to staff. The server supports revocation, but there is no screen for it yet.
4. **Lookup management**: materials, applications and processes can be assigned to products but not created or renamed in the admin.
5. **Lost access**: if every administrator is locked out, recovery needs a database-level change or re-running `admin:create` after removing the old account. Document the procedure with the client.
6. **Email on contact enquiries**: the contact form stores messages but does not notify anyone.
7. **Attachment deletion**: removing an RFQ does not yet delete its files.
8. **Rate-limit store** is in memory, so limits reset on restart and are per process. Use a shared store if the API runs on more than one instance.

## Verification status

**Not yet run.** This code was written in a sandbox without package registry access, so nothing has been installed, compiled, built or run in a browser. The discovery system (search, resources, FAQ, navigation, 404, performance) was added in this session. What was checked:

- All local imports resolve, and named imports exist in the modules they come from (static script).
- No remaining references to the removed quote endpoint.
- Brackets balance in every source file.
- Unit tests are written for: file signature and extension rules, filename sanitising, text sanitising, the RFQ submission schema, RFQ numbering, access tokens, the client form schema, client file rules, password hashing, role permissions, cookie parsing, image detection, slugs, admin input validation and CMS defaults.
- Unused imports and stray references were searched for and removed.
- Corporate page content has tests: every industry has content and catalogue links, and the timeline has one dated event (1978).
- Discovery: the query cleaner, PDF validation, page index coverage, FAQ answers (no unconfirmed promises), search grouping and order, and privacy rules for recent searches.
- Two bugs found and fixed while reviewing: a shared cache that let one aborted request reject for every caller, and an imported constant that did not exist in the module it came from (caught by the static check).
- Invalid list and block markup (a `<div>` or `<span>` directly inside a `<ul>` or `<ol>`) was found and fixed on the industry and about pages.

Before release, run in order and fix whatever fails:

1. `npm install`
2. `npm run db:generate` and `npm run db:migrate` (migration name e.g. `rfq`)
3. `npm run db:seed`
4. `npm test`
5. `npm run typecheck`, `npx tsc -p server/tsconfig.json --noEmit`, `npm run lint`
6. `npm run build`
7. Browser tests:
   - normal submission, then confirm the RFQ number is sequential and the success page shows it
   - invalid email and missing fields (inline errors, nothing sent)
   - a file over 10 MB, a `.exe` renamed to `.pdf`, and a valid PDF with a wrong extension
   - five files, then a sixth (should be refused)
   - a product-specific RFQ from a product page (product, part number and category pre-filled, and editable)
   - a mobile upload at 360 px and 390 px
   - API stopped mid-submit (network banner, then retry with the same key creates one RFQ only)
   - double-click on submit (one RFQ only)
   - server error (generic message, no stack trace)
8. Admin tests, in a browser and with curl against the API:
   - sign-in with the right password, then with a wrong one (same message both times)
   - five wrong passwords in a row for one account (locked), and a correct one during the lock (refused)
   - an API call without the cookie (401), and with the cookie but without the CSRF header (403)
   - an EDITOR calling `/api/admin/users` (403), and the same call as ADMIN (200)
   - sign-out, then reusing the old cookie (401)
   - password change (all sessions ended, sign-in required again)
   - RFQ status change, then the history entry appears
   - drawing download (correct file name and type; an `X-Content-Type-Options: nosniff` header; a history entry)
   - product create, edit, archive and restore; an archived category refusing archive of live products
   - image upload of a renamed `.svg` or `.exe` (refused), and of a real JPG (accepted)
   - the admin layout at 768 px and 1024 px (sidebar opens as a drawer below 768 px; tables scroll sideways)
