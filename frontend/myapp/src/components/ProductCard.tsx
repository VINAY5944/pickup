import { Minus, Plus } from "lucide-react";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  quantity: number;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
}

const formatPrice = (pricePaise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(pricePaise / 100);

export default function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
}: ProductCardProps) {
  const outOfStock = product.stockQuantity <= 0;
  const lowStock = !outOfStock && product.stockQuantity <= 3;
  const inCart = quantity > 0;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl bg-white transition-all duration-300 ${
        outOfStock
          ? "opacity-70 shadow-sm ring-1 ring-gray-200/80"
          : inCart
          ? "shadow-xl shadow-emerald-900/10 ring-2 ring-emerald-500"
          : "shadow-sm ring-1 ring-gray-200/80 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gray-900/10 hover:ring-gray-300/80"
      }`}
    >
      {/* ── Image ── */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 flex-shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-50 via-stone-100 to-amber-50">
            <span className="text-6xl drop-shadow-sm">🍽️</span>
          </div>
        )}

        {/* Bottom gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {outOfStock && (
            <span className="inline-flex items-center rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              Sold out
            </span>
          )}
          {lowStock && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              Only {product.stockQuantity} left
            </span>
          )}
        </div>

        {/* Price chip (bottom-right, on image) */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-xl bg-black/65 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
            {formatPrice(product.pricePaise)}
          </span>
        </div>

        {/* In-cart badge */}
        {inCart && (
          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              In your order
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-bold leading-snug text-gray-900">
          {product.name}
        </h3>

        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-gray-500">
            {product.description}
          </p>
        )}

        {/* ── CTA ── */}
        <div className="mt-auto pt-4">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={outOfStock}
              id={`add-${product.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all duration-150 hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.98]"
            >
              <Plus size={15} strokeWidth={2.5} />
              {outOfStock ? "Unavailable" : "Add to order"}
            </button>
          ) : (
            <div className="flex items-center justify-between overflow-hidden rounded-xl bg-gray-900 p-1.5">
              <button
                type="button"
                onClick={() => onRemove(product.id)}
                id={`remove-${product.id}`}
                aria-label={`Remove one ${product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-90"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>

              <span className="min-w-[2rem] text-center text-base font-black tabular-nums text-white">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => onAdd(product)}
                id={`plus-${product.id}`}
                disabled={quantity >= product.stockQuantity}
                aria-label={`Add one ${product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/30 active:scale-90"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
