import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ToastContainer from './components/ToastContainer';
import FloatingDock from './components/FloatingDock';
import Storefront from './pages/Storefront';
// Route-level code splitting: everything below the fold / off the critical
// path is lazy-loaded so the initial bundle stays lean.
const Catalog = lazy(() => import('./pages/Catalog'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const OrderLookup = lazy(() => import('./pages/OrderLookup'));
const SwatchifyPage = lazy(() => import('./pages/SwatchifyPage'));
const StoreDirectory = lazy(() => import('./pages/StoreDirectory'));
const SellPage = lazy(() => import('./pages/SellPage'));
// Admin-only heavy routes — never in the storefront critical path.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdsConsole = lazy(() => import('./pages/AdsConsole'));
const Tenants = lazy(() => import('./pages/Tenants'));
const Settings = lazy(() => import('./pages/Settings'));
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminGate from './components/AdminGate';
import { trackPageView, captureUtmParams } from './lib/analytics';

function SpaTracker() {
  const location = useLocation();
  useEffect(function onRouteChange() {
    captureUtmParams();
    try {
      if (window.gtag && typeof window.gtag === 'function') {
        var GA4_ID = (import.meta && import.meta.env) ? import.meta.env.VITE_GA4_MEASUREMENT_ID : '';
        if (GA4_ID && GA4_ID.indexOf('XXXXXXXX') === -1) {
          window.gtag('event', 'page_view', {
            page_path: location.pathname + location.search,
            page_location: window.location.href,
            page_title: document.title,
            send_to: GA4_ID,
          });
        }
      }
    } catch (e) { /* noop */ }
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
}

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Navbar />
      <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

function RouteFallback() {
  return (
    <main className="flex-1 flex items-center justify-center min-h-[60vh] px-4">
      <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading page">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-foreground animate-spin" />
        <p className="text-sm text-muted">กำลังโหลด…</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <CartProvider>
      <ToastProvider>
        <AuthProvider>
        <CatalogProvider>
        <AdminAuthProvider>
        <Router>
          <SpaTracker />
          <ToastContainer />
          <FloatingDock />

          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Storefront />} />
              <Route path="/product" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/confirmation" element={<OrderConfirmation />} />
              <Route path="/order" element={<OrderLookup />} />
              <Route path="/swatchify" element={<SwatchifyPage />} />
              <Route path="/stores" element={<StoreDirectory />} />
              <Route path="/sell" element={<SellPage />} />

              <Route path="*" element={
                <main className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                  <p className="text-6xl mb-4">404</p>
                  <h1 className="font-display text-2xl font-bold text-foreground">ไม่พบหน้าที่คุณต้องการ</h1>
                  <p className="mt-2 text-sm text-muted">Page not found</p>
                  <Link to="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                    กลับหน้าแรก / Back to Home
                  </Link>
                </main>
              } />
            </Route>

            <Route path="/dashboard" element={<AdminGate><Dashboard /></AdminGate>} />
            <Route path="/ads" element={<AdsConsole />} />
            <Route path="/clients" element={<AdminGate><Tenants /></AdminGate>} />
            <Route path="/settings" element={<AdminGate><Settings /></AdminGate>} />
          </Routes>
          </Suspense>
        </Router>
        </AdminAuthProvider>
        </CatalogProvider>
        </AuthProvider>
      </ToastProvider>
    </CartProvider>
  );
}
