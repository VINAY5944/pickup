import { Search, SlidersHorizontal } from "lucide-react";
import type { Product, CartItem } from "../types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  cart: CartItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
}

export default function ProductGrid({
  products,
  cart,
  search,
  onSearchChange,
  onAdd,
  onRemove,
}: ProductGridProps) {
  const query = search.trim().toLowerCase();

  const filteredProducts = products.filter(
    (p) =>
      // The products API currently omits isActive for active products.
      // Only hide a product when the API explicitly marks it inactive.
      p.isActive !== false &&
      (p.name.toLowerCase().includes(query) ||
        (p.description ?? "").toLowerCase().includes(query)),
  );

  const inStockCount = filteredProducts.filter((p) => p.stockQuantity > 0).length;

  return (
    <section>
      {/* ── Toolbar ── */}
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <label
          htmlFor="menu-search"
          className="group flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm ring-0 transition-all duration-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 hover:border-gray-300 sm:w-72"
        >
          <Search size={16} className="shrink-0 text-gray-400 transition-colors group-focus-within:text-emerald-500" />
          <input
            id="menu-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search menu…"
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </label>

        {/* Results count */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <SlidersHorizontal size={15} className="text-gray-400" />
          <span>
            <span className="font-semibold text-gray-900">{inStockCount}</span>
            {" "}item{inStockCount !== 1 ? "s" : ""} available
            {search && ` · "${search}"`}
          </span>
        </div>
      </div>

      {/* ── Grid / Empty state ── */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <span className="text-5xl">🔍</span>
          <p className="mt-4 font-bold text-gray-900">Nothing matched</p>
          <p className="mt-1.5 text-sm text-gray-500">
            Try a different search term or clear the filter.
          </p>
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cart.find((i) => i.product.id === product.id)?.quantity ?? 0}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </section>
  );
}
