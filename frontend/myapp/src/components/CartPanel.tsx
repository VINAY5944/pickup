import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import type { CartItem } from "../types";

interface CartPanelProps {
  cart: CartItem[];
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onAdd: (product: CartItem["product"]) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

const formatPrice = (pricePaise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(pricePaise / 100);

export default function CartPanel({
  cart,
  isOpen,
  isSubmitting,
  onClose,
  onAdd,
  onRemove,
  onCheckout,
}: CartPanelProps) {
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPaise = cart.reduce(
    (s, i) => s + i.product.pricePaise * i.quantity,
    0,
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside
        className="animate-slide-in-right absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl shadow-black/30"
        role="dialog"
        aria-label="Your order"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-gray-950 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-white">Your order</h2>
            <p className="mt-0.5 text-xs font-medium text-gray-400">
              {totalItems} {totalItems === 1 ? "item" : "items"}
              {totalItems > 0 && ` · ${formatPrice(totalPaise)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart panel"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Empty state ── */}
        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gray-100">
              <ShoppingBag size={36} className="text-gray-300" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-gray-900">
              Nothing here yet
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Browse the menu and add something you love.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 active:scale-95"
            >
              Explore menu <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <>
            {/* ── Items ── */}
            <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
              {cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-4 px-5 py-4">
                  {/* Thumbnail */}
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-3xl">🍽️</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                      {product.name}
                    </h4>
                    <p className="mt-1 text-sm font-bold text-emerald-600">
                      {formatPrice(product.pricePaise * quantity)}
                    </p>

                    {/* Qty control */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRemove(product.id)}
                        aria-label={`Remove one ${product.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 active:scale-90"
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>

                      <span className="w-6 text-center text-sm font-bold tabular-nums text-gray-900">
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => onAdd(product)}
                        disabled={quantity >= product.stockQuantity}
                        aria-label={`Add one ${product.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 active:scale-90"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Footer / checkout ── */}
            <div className="border-t border-gray-200 bg-white px-6 py-5">
              {/* Price breakdown */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal ({totalItems} items)</span>
                  <span>{formatPrice(totalPaise)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Service fee</span>
                  <span className="font-semibold text-emerald-600">Free</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-black text-gray-900">
                  {formatPrice(totalPaise)}
                </span>
              </div>

              {/* Reservation note */}
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5">
                <span className="mt-px text-base">⏱</span>
                <p className="text-xs leading-5 text-amber-800">
                  Your stock is reserved for <strong>2 minutes</strong> after
                  placing the order. Pay fast!
                </p>
              </div>

              {/* Checkout button */}
              <button
                type="button"
                id="checkout-button"
                onClick={onCheckout}
                disabled={isSubmitting || cart.length === 0}
                className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-4 text-base font-bold text-white shadow-xl shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 active:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Placing order…
                  </>
                ) : (
                  <>
                    Place order · {formatPrice(totalPaise)}
                    <ArrowRight size={17} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
