import { ShoppingBag, UtensilsCrossed } from "lucide-react";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
}

export default function Header({ cartCount, onCartClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm shadow-black/[0.04]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* ── Logo ── */}
        <a href="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-emerald-500/20 transition-all duration-200 group-hover:scale-105 group-hover:shadow-emerald-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700" />
            <UtensilsCrossed size={17} className="relative z-10 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-none">
            <p className="text-[17px] font-black tracking-tight text-gray-900">
              pickup<span className="text-emerald-500">.</span>
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Fresh · Fast · Simple
            </p>
          </div>
        </a>

        {/* ── Cart button ── */}
        <button
          type="button"
          id="cart-button"
          onClick={onCartClick}
          aria-label={`Open cart, ${cartCount} items`}
          className="group relative flex items-center gap-2.5 rounded-xl bg-gray-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition-all duration-150 hover:bg-gray-800 hover:shadow-gray-900/30 active:scale-[0.97]"
        >
          <ShoppingBag size={16} strokeWidth={2.2} />
          <span className="hidden sm:block">Your order</span>
          <span
            className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums transition-all duration-200 ${
              cartCount > 0
                ? "bg-emerald-400 text-gray-900 scale-110"
                : "bg-white/15 text-white/60"
            }`}
          >
            {cartCount}
          </span>
        </button>
      </div>
    </header>
  );
}