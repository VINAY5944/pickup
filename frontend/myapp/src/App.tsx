import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Leaf,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
  Utensils,
  Zap,
} from "lucide-react";

import Header from "./components/Header";
import ProductGrid from "./components/ProductGrid";
import CartPanel from "./components/CartPanel";
import PaymentScreen from "./components/PaymentScreen";

import {
  createOrder,
  getApiErrorMessage,
  getOrder,
  getProducts,
} from "./services/api";
import type { CartItem, Order, OrderStatus, Product } from "./types";

/* ── Constants ────────────────────────────────────────────── */

const TERMINAL_STATUSES: OrderStatus[] = [
  "PAID",
  "EXPIRED",
  "NEEDS_REVIEW",
  "PAYMENT_FAILED",
  "PICKED_UP",
];

/* ── Helpers ──────────────────────────────────────────────── */

function formatPrice(pricePaise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(pricePaise / 100);
}

/* ── Skeleton loader ──────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-200/80">
      <div className="skeleton h-52 w-full" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 w-3/4 rounded-lg" />
        <div className="skeleton h-3.5 w-full rounded-lg" />
        <div className="skeleton h-3.5 w-2/3 rounded-lg" />
        <div className="skeleton mt-2 h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── App ──────────────────────────────────────────────────── */

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  /* ── Data fetching ── */

  const loadProducts = useCallback(async () => {
    try {
      setError(null);
      const data = await getProducts();
      console.log("Fetched products:", data); // Log the fetched products
      setProducts(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  /* ── Cart management ── */

  const addToCart = (product: Product) => {
    setCart((cur) => {
      const existing = cur.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return cur;
        return cur.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (product.stockQuantity <= 0) return cur;
      return [...cur, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((cur) =>
      cur
        .map((i) => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter((i) => i.quantity > 0),
    );
  };

  const cartCount = cart.reduce((t, i) => t + i.quantity, 0);
  const cartTotalPaise = cart.reduce(
    (t, i) => t + i.product.pricePaise * i.quantity,
    0,
  );

  /* ── Checkout ── */

  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setError(null);
      setStatusError(null);
      const createdOrder = await createOrder(
        cart.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      );
      setOrder(createdOrder);
      setCart([]);
      setIsCartOpen(false);
      void loadProducts();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Order polling ── */

  const refreshOrder = useCallback(async () => {
    if (!order) return;
    try {
      setStatusError(null);
      const latest = await getOrder(order.orderId);
      setOrder(latest);
    } catch (err) {
      setStatusError(getApiErrorMessage(err));
    }
  }, [order?.orderId]);

  useEffect(() => {
    if (!order || TERMINAL_STATUSES.includes(order.status)) return;
    const id = window.setInterval(() => { void refreshOrder(); }, 2000);
    return () => window.clearInterval(id);
  }, [order?.orderId, order?.status, refreshOrder]);

  /* ── Navigation ── */

  const startNewOrder = () => {
    setOrder(null);
    setStatusError(null);
    setError(null);
    setIsCartOpen(false);
    void loadProducts();
  };

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ── Render ── */

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafaf8] font-[Inter,system-ui,sans-serif]">
      <Header cartCount={cartCount} onCartClick={() => setIsCartOpen(true)} />

      <main>
        {/* ════════════════════════════════════════════════
            CUSTOMER FLOW — only shown before an order exists
        ════════════════════════════════════════════════ */}
        {!order && (
          <>
            {/* ── HERO ─────────────────────────────────── */}
            <section className="relative overflow-hidden bg-[#0d1f14]">

              {/* Decorative ambient blobs */}
              <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-emerald-600/10 blur-[100px]" />
              <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-800/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-0 h-64 w-64 rounded-full bg-amber-800/10 blur-3xl" />

              <div className="relative mx-auto max-w-7xl px-4 pb-0 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">

                  {/* ── Left copy ── */}
                  <div className="text-center lg:text-left">
                    {/* Badge */}
                    <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Open now · Serving fresh daily
                    </div>

                    {/* Headline */}
                    <h1 className="animate-slide-up delay-50 mt-7 text-5xl font-black leading-[1.02] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.2rem]">
                      Your cravings,
                      <br />
                      <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                        made real.
                      </span>
                    </h1>

                    {/* Sub */}
                    <p className="animate-slide-up delay-100 mt-6 max-w-md text-base leading-8 text-gray-400 sm:text-lg lg:mx-0 mx-auto">
                      Browse the menu, build your cart, and pick up your order at
                      the counter — no waiting, no hassle.
                    </p>

                    {/* CTAs */}
                    <div className="animate-slide-up delay-200 mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                      <button
                        type="button"
                        id="hero-cta"
                        onClick={scrollToMenu}
                        className="group inline-flex items-center gap-3 rounded-2xl bg-emerald-500 px-7 py-4 text-sm font-bold text-white shadow-2xl shadow-emerald-500/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-emerald-500/60 active:translate-y-0"
                      >
                        Browse the menu
                        <ArrowRight
                          size={17}
                          strokeWidth={2.5}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </button>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        No account needed
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="animate-slide-up delay-300 mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8">
                      {[
                        { value: "~2 min", label: "Avg prep time" },
                        { value: "100%", label: "Fresh daily" },
                        { value: "₹0 fee", label: "No extras" },
                      ].map(({ value, label }) => (
                        <div key={label} className="bg-white/5 px-4 py-4 text-center lg:text-left">
                          <p className="text-xl font-black text-white sm:text-2xl">{value}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Right imagery ── */}
                  <div className="animate-fade-in delay-200 relative mx-auto flex justify-center lg:justify-end">
                    {/* Main food image */}
                    <div className="relative h-[400px] w-[340px] sm:h-[460px] sm:w-[400px]">
                      <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] shadow-2xl shadow-black/60">
                        <img
                          src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=85"
                          alt="Gourmet cheeseburger"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      </div>

                      {/* Glass card — bottom left */}
                      <div className="animate-float absolute -left-8 bottom-12 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3.5 shadow-2xl backdrop-blur-xl sm:-left-10">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                          <ShoppingBag size={18} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Easy pickup</p>
                          <p className="text-[10px] text-gray-400">Order · Pay · Collect</p>
                        </div>
                      </div>

                      {/* Glass card — top right */}
                      <div className="animate-float delay-500 absolute -right-8 top-10 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:-right-10">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
                            <Zap size={17} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white">Fast</p>
                            <p className="text-[10px] text-gray-400">In 2 minutes</p>
                          </div>
                        </div>
                      </div>

                      {/* Rotating badge */}
                      <div className="absolute right-4 bottom-6 flex h-16 w-16 -rotate-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-center text-[9px] font-extrabold uppercase leading-4 tracking-wide text-white shadow-xl sm:h-20 sm:w-20">
                        Made
                        <br />
                        for you
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Feature strip ── */}
              <div className="relative mt-14 border-t border-white/8">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { Icon: Leaf, label: "Fresh favourites", desc: "A menu worth exploring" },
                      { Icon: Clock3, label: "Quick pickup", desc: "Less waiting, more enjoying" },
                      { Icon: CheckCircle2, label: "Stock reserved", desc: "Your items held for you" },
                    ].map(({ Icon, label, desc }) => (
                      <div
                        key={label}
                        className="flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-colors hover:bg-white/5"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-400">
                          <Icon size={19} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── ERROR BANNER ─────────────────────────── */}
            {error && (
              <div
                role="alert"
                className="mx-auto mt-6 flex max-w-7xl flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadProducts()}
                  className="flex shrink-0 items-center gap-2 font-semibold"
                >
                  <RefreshCw size={14} /> Try again
                </button>
              </div>
            )}

            {/* ── MENU SECTION ─────────────────────────── */}
            <section
              id="menu"
              className="mx-auto max-w-[1440px] scroll-mt-20 px-4 pb-32 pt-12 sm:px-6 lg:px-10"
            >
              {/* Section header */}
              <div className="mb-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600">
                  Fresh from the kitchen
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
                  What sounds good?
                  <span className="text-amber-500">.</span>
                </h2>
                <p className="mt-2.5 text-sm leading-6 text-gray-500 sm:text-base">
                  Pick your favourites, add them to your bag, and we'll have
                  them ready for you.
                </p>
              </div>

              {/* Grid / skeleton */}
              {isLoading ? (
                <SkeletonGrid />
              ) : (
                <ProductGrid
                  products={products}
                  cart={cart}
                  search={search}
                  onSearchChange={setSearch}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                />
              )}

              {/* Loading spinner fallback */}
              {isLoading && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                  <LoaderCircle size={18} className="animate-spin" />
                  Preparing your menu…
                </div>
              )}
            </section>

            {/* ── FLOATING CART BAR (mobile) ────────────── */}
            {cartCount > 0 && (
              <div className="fixed bottom-4 left-4 right-4 z-20 sm:hidden">
                <button
                  type="button"
                  id="mobile-cart-bar"
                  onClick={() => setIsCartOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl bg-gray-950 px-4 py-3.5 text-white shadow-2xl shadow-black/40 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20">
                      <ShoppingBag size={17} className="text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">
                        {cartCount} {cartCount === 1 ? "item" : "items"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatPrice(cartTotalPaise)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white">
                    View order <ArrowRight size={14} strokeWidth={2.5} />
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════
            PAYMENT SCREEN — shown after order is placed
        ════════════════════════════════════════════════ */}
        {order && (
          <PaymentScreen
            order={order}
            statusError={statusError}
            onNewOrder={startNewOrder}
            onRefresh={() => void refreshOrder()}
            onPickupClaimed={() => setOrder((current) => current ? { ...current, status: "PICKED_UP" } : current)}
          />
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="bg-[#0d1f14] border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Utensils size={18} />
            </div>
            <div>
              <p className="font-black tracking-tight text-white">
                pickup<span className="text-emerald-400">.</span>
              </p>
              <p className="text-xs text-gray-600">Good food, right on time.</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Made for easy ordering. Built for convenient pickup.
          </p>
        </div>
      </footer>

      {/* ── CART PANEL ─────────────────────────────────── */}
      <CartPanel
        cart={cart}
        isOpen={isCartOpen}
        isSubmitting={isSubmitting}
        onClose={() => setIsCartOpen(false)}
        onAdd={addToCart}
        onRemove={removeFromCart}
        onCheckout={() => void handleCheckout()}
      />
    </div>
  );
}
