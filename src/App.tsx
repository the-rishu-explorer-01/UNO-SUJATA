import { lazy, Suspense, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchPalette from "@/components/search/SearchPalette";
import SearchShortcut from "@/components/search/SearchShortcut";
import ChatWidget from "@/components/chat/ChatWidget";
import HomePage from "@/pages/HomePage";

// The homepage loads eagerly because most visitors land there. Everything else is split into its own
// download, so the admin code is never sent to a public visitor.
const ProductsPage = lazy(() => import("@/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage"));
const RequestQuotePage = lazy(() => import("@/pages/RequestQuotePage"));
const RfqSuccessPage = lazy(() => import("@/pages/RfqSuccessPage"));
const IndustriesPage = lazy(() => import("@/pages/IndustriesPage"));
const IndustryDetailPage = lazy(() => import("@/pages/IndustryDetailPage"));
const CapabilitiesPage = lazy(() => import("@/pages/CapabilitiesPage"));
const QualityPage = lazy(() => import("@/pages/QualityPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const ResourcesPage = lazy(() => import("@/pages/ResourcesPage"));
const FaqPage = lazy(() => import("@/pages/FaqPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

const AdminRoot = lazy(() => import("@/admin/AdminLayout"));
const LoginPage = lazy(() => import("@/admin/LoginPage"));
const DashboardPage = lazy(() => import("@/admin/pages/DashboardPage"));
const RfqListPage = lazy(() => import("@/admin/pages/RfqListPage"));
const RfqDetailPage = lazy(() => import("@/admin/pages/RfqDetailPage"));
const ContactsPage = lazy(() => import("@/admin/pages/ContactsPage"));
const ProductListPage = lazy(() => import("@/admin/pages/ProductListPage"));
const ProductFormPage = lazy(() => import("@/admin/pages/ProductFormPage"));
const CategoriesPage = lazy(() => import("@/admin/pages/CategoriesPage"));
const AdminIndustriesPage = lazy(() => import("@/admin/pages/IndustriesPage"));
const AdminCapabilitiesPage = lazy(() => import("@/admin/pages/CapabilitiesPage"));
const ContentPage = lazy(() => import("@/admin/pages/ContentPage"));
const SettingsPage = lazy(() => import("@/admin/pages/SettingsPage"));
const CustomersPage = lazy(() => import("@/admin/pages/CustomersPage"));
const FaqAdminPage = lazy(() => import("@/admin/pages/FaqAdminPage"));
const ResourcesAdminPage = lazy(() => import("@/admin/pages/ResourcesAdminPage"));

/** Shown for a moment while a page's code loads. Keeps the layout stable so nothing jumps. */
function PageFallback() {
  return (
    <div className="container-x py-24" aria-busy="true" aria-label="Loading page">
      <div className="h-4 w-40 animate-pulse bg-line" />
      <div className="mt-8 h-14 w-3/4 animate-pulse bg-bone" />
      <div className="mt-4 h-4 w-2/3 animate-pulse bg-bone" />
    </div>
  );
}

const lazyRoute = (node: ReactNode) => <Suspense fallback={<PageFallback />}>{node}</Suspense>;

/** Public website chrome: header, footer, search palette and shortcut. Not rendered on /admin. */
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-ink focus:px-4 focus:py-2 focus:text-bone">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <SearchShortcut />
      <SearchPalette />
      <ChatWidget />
    </div>
  );
}

export default function App() {
  return (
    // reducedMotion="user" disables transform animations for people who ask for less motion.
    <MotionConfig reducedMotion="user">
      <Routes>
        {/* Staff administration: separate shell, guarded in the UI and enforced on the server */}
        <Route path="/admin" element={lazyRoute(<AdminRoot />)}>
          <Route path="login" element={lazyRoute(<LoginPage />)} />
          <Route index element={lazyRoute(<DashboardPage />)} />
          <Route path="rfqs" element={lazyRoute(<RfqListPage />)} />
          <Route path="rfqs/:id" element={lazyRoute(<RfqDetailPage />)} />
          <Route path="contacts" element={lazyRoute(<ContactsPage />)} />
          <Route path="products" element={lazyRoute(<ProductListPage />)} />
          <Route path="products/new" element={lazyRoute(<ProductFormPage />)} />
          <Route path="products/:id" element={lazyRoute(<ProductFormPage />)} />
          <Route path="categories" element={lazyRoute(<CategoriesPage />)} />
          <Route path="industries" element={lazyRoute(<AdminIndustriesPage />)} />
          <Route path="capabilities" element={lazyRoute(<AdminCapabilitiesPage />)} />
          <Route path="content" element={lazyRoute(<ContentPage />)} />
          <Route path="faq" element={lazyRoute(<FaqAdminPage />)} />
          <Route path="resources" element={lazyRoute(<ResourcesAdminPage />)} />
          <Route path="customers" element={lazyRoute(<CustomersPage />)} />
          <Route path="settings" element={lazyRoute(<SettingsPage />)} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Public website */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/category/:slug" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/request-quote" element={<RequestQuotePage />} />
          <Route path="/request-quote/success" element={<RfqSuccessPage />} />
          <Route path="/industries" element={<IndustriesPage />} />
          <Route path="/industries/:slug" element={<IndustryDetailPage />} />
          <Route path="/capabilities" element={<CapabilitiesPage />} />
          <Route path="/quality" element={<QualityPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </MotionConfig>
  );
}
