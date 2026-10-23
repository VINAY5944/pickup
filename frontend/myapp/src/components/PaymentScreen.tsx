import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
 
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  Utensils,
  XCircle,
} from "lucide-react";
import type { Order } from "../types";
import { claimPickup, getApiErrorMessage } from "../services/api";

/* ── Helpers ──────────────────────────────────────────────── */

const RING_R = 88;
const RING_CIRC = 2 * Math.PI * RING_R;
const ASSUMED_WINDOW_MS = 120_000; // 2 min default window

const formatPrice = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

function getTimings(order: Order) {
  const expiresAt = new Date(order.expiresAt).getTime();
  // Anchor to server-reported time so client-clock skew doesn't affect the budget
  const serverNow = order.serverTime
    ? new Date(order.serverTime).getTime()
    : Date.now();
  const initialRemainingMs = Math.max(0, expiresAt - serverNow);
  const totalMs = Math.max(initialRemainingMs, ASSUMED_WINDOW_MS);
  return { initialRemainingMs, totalMs };
}

function ringStroke(ratio: number) {
  if (ratio > 0.5) return "#10b981"; // emerald-500
  if (ratio > 0.25) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

function ringGlow(ratio: number) {
  if (ratio > 0.5) return "rgba(16,185,129,0.3)";
  if (ratio > 0.25) return "rgba(245,158,11,0.3)";
  return "rgba(239,68,68,0.3)";
}

const TERMINAL: Order["status"][] = [
  "PAID",
  "EXPIRED",
  "NEEDS_REVIEW",
  "PAYMENT_FAILED",
  "PICKED_UP",
];

/* ── Pickup code box ──────────────────────────────────────── */

function PickupCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <div className="animate-scale-in delay-200 mt-6 overflow-hidden rounded-3xl border-2 border-dashed border-emerald-300/70 bg-emerald-50">
      <div className="px-6 py-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600">
          Your pickup code
        </p>

        <p
          className="my-4 font-mono text-5xl font-black tracking-[0.3em] text-gray-900"
          aria-label={`Pickup code: ${code}`}
        >
          {code}
        </p>

        <p className="text-sm text-gray-500">
          Show this at the counter to collect your order.
        </p>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-95"
        >
          <Copy size={14} />
          {copied ? "✓ Copied!" : "Copy code"}
        </button>
      </div>
    </div>
  );
}

/* ── Terminal state result cards ──────────────────────────── */

function PaidResult({
  order,
  onNewOrder,
  onPickupClaimed,
}: {
  order: Order;
  onNewOrder: () => void;
  onPickupClaimed: () => void;
}) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [pickupMessage, setPickupMessage] = useState<string | null>(
    order.status === "PICKED_UP" ? "Pickup completed." : null,
  );
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(order.status === "PICKED_UP");

  const handleClaimPickup = async () => {
    if (!order.pickupCode || isClaiming || alreadyClaimed) return;
    setIsClaiming(true);
    setPickupError(null);
    try {
      await claimPickup(order.orderId, order.pickupCode);
      setPickupMessage("Pickup completed.");
      setAlreadyClaimed(true);
      onPickupClaimed();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setPickupMessage("This pickup was already claimed.");
        setAlreadyClaimed(true);
        onPickupClaimed();
      } else {
        setPickupError(getApiErrorMessage(error));
      }
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="animate-scale-in flex flex-col items-center">
      {/* Animated checkmark */}
      <div className="relative mb-7 flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-emerald-100" />
        <div className="absolute inset-0 animate-glow rounded-full" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="52" fill="none" stroke="#10b981" strokeWidth="4" />
          <polyline
            points="32,56 50,74 82,38"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="100"
            style={{ animation: "check-draw 0.6s 0.15s ease both" }}
          />
        </svg>
        <CheckCircle2 size={44} className="relative z-10 text-emerald-500" />
      </div>

      <h2 className="text-center text-2xl font-black text-gray-900">
        Payment confirmed! 🎉
      </h2>
      <p className="mt-2 text-center text-sm leading-6 text-gray-500">
        Your order is reserved and ready at the counter.
      </p>

      <div className="mt-5 w-full rounded-2xl bg-gray-50 px-5 py-4 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Order total
        </span>
        <p className="mt-1 text-3xl font-black text-emerald-600">
          {formatPrice(order.totalAmountPaise)}
        </p>
      </div>

      {order.pickupCode && (
        <>
          <PickupCodeBox code={order.pickupCode} />
          {pickupMessage ? (
            <p role="status" className="mt-5 w-full rounded-2xl bg-emerald-50 px-5 py-4 text-center font-semibold text-emerald-800">
              {pickupMessage}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void handleClaimPickup()}
              disabled={isClaiming || alreadyClaimed}
              className="mt-5 w-full rounded-2xl bg-emerald-600 px-6 py-4 font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isClaiming ? "Claiming pickup…" : "Claim Pickup"}
            </button>
          )}
          {pickupError && <p role="alert" className="mt-3 text-center text-sm text-red-600">{pickupError}</p>}
        </>
      )}

      <button
        type="button"
        onClick={onNewOrder}
        className="animate-slide-up delay-400 mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gray-900 px-6 py-4 font-bold text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-gray-800 active:translate-y-0"
      >
        <ShoppingBag size={17} />
        Start a new order
      </button>
    </div>
  );
}

function ExpiredResult({
  order,
  onNewOrder,
}: {
  order: Order;
  onNewOrder: () => void;
}) {
  return (
    <div className="animate-scale-in flex flex-col items-center">
      <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-full bg-amber-100">
        <Clock size={52} strokeWidth={1.5} className="text-amber-500" />
      </div>
      <h2 className="text-center text-2xl font-black text-gray-900">
        Reservation expired
      </h2>
      <p className="mt-2 text-center text-sm leading-6 text-gray-500">
        The payment window closed and your stock has been released.
        <br />Start a new order any time.
      </p>

      <div className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Order #{order.orderId}
        </span>
        <p className="mt-1 text-xl font-bold text-gray-700">
          {formatPrice(order.totalAmountPaise)}
        </p>
      </div>

      <button
        type="button"
        onClick={onNewOrder}
        className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gray-900 px-6 py-4 font-bold text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-gray-800"
      >
        <ShoppingBag size={17} />
        Start a new order
      </button>
    </div>
  );
}

function NeedsReviewResult({
  order,
  onNewOrder,
}: {
  order: Order;
  onNewOrder: () => void;
}) {
  return (
    <div className="animate-scale-in flex flex-col items-center">
      <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-full bg-orange-100">
        <ShieldAlert size={52} strokeWidth={1.5} className="text-orange-500" />
      </div>
      <h2 className="text-center text-2xl font-black text-gray-900">
        Payment needs review
      </h2>
      <p className="mt-2 text-center text-sm leading-6 text-gray-500">
        We received your payment but it requires manual verification. Show your
        order number to counter staff.
      </p>

      <div className="mt-5 w-full rounded-2xl border border-orange-200 bg-orange-50 px-5 py-5 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
          Your order number
        </span>
        <p className="mt-2 font-mono text-4xl font-black text-gray-900">
          #{order.orderId}
        </p>
      </div>

      <button
        type="button"
        onClick={onNewOrder}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-4 font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        <ArrowLeft size={17} />
        Back to menu
      </button>
    </div>
  );
}

function PaymentFailedResult({
  order,
  onNewOrder,
}: {
  order: Order;
  onNewOrder: () => void;
}) {
  return (
    <div className="animate-scale-in flex flex-col items-center">
      <div className="mb-7 flex h-28 w-28 items-center justify-center rounded-full bg-red-100">
        <XCircle size={52} strokeWidth={1.5} className="text-red-500" />
      </div>
      <h2 className="text-center text-2xl font-black text-gray-900">
        Payment failed
      </h2>
      <p className="mt-2 text-center text-sm leading-6 text-gray-500">
        Your payment was unsuccessful. Please create a new order or contact counter staff.
      </p>

      <div className="mt-5 w-full rounded-2xl bg-gray-50 px-5 py-3 text-center">
        <span className="text-sm text-gray-400">Order #{order.orderId}</span>
      </div>

      <button
        type="button"
        onClick={onNewOrder}
        className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gray-900 px-6 py-4 font-bold text-white shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-gray-800"
      >
        <ShoppingBag size={17} />
        Start a new order
      </button>
    </div>
  );
}

/* ── Pending countdown view ───────────────────────────────── */

function PendingView({
  order,
  statusError,
  onNewOrder,
  onRefresh,
}: {
  order: Order;
  statusError: string | null;
  onNewOrder: () => void;
  onRefresh: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(ASSUMED_WINDOW_MS);
  const startedAtRef = useRef(0);
  const initialRemainingRef = useRef(0);

  // Re-anchor whenever the order is refreshed (so updated serverTime is used)
  useEffect(() => {
    const { initialRemainingMs, totalMs: t } = getTimings(order);
    initialRemainingRef.current = initialRemainingMs;
    startedAtRef.current = Date.now();
    setTotalMs(t);
    setRemainingMs(initialRemainingMs);
  }, [order.expiresAt, order.serverTime]);

  // Local tick — purely tracks elapsed time since anchor, so client-clock skew is irrelevant
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      setRemainingMs(Math.max(0, initialRemainingRef.current - elapsed));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [order.expiresAt]);

  const remainingS = Math.ceil(remainingMs / 1000);
  const ratio = totalMs > 0 ? remainingMs / totalMs : 0;
  const offset = RING_CIRC * (1 - ratio);
  const stroke = ringStroke(ratio);
  const glow = ringGlow(ratio);
  const minutes = Math.floor(remainingS / 60);
  const seconds = remainingS % 60;
  const isUrgent = ratio < 0.25;
  const isExpiredLocally = remainingMs === 0;

  return (
    <div className="flex flex-col items-center">
      {/* ── Ring countdown ── */}
      <div className="animate-fade-in relative mb-8 flex items-center justify-center">
        {/* Ambient glow */}
        <div
          className="absolute inset-4 rounded-full blur-2xl transition-colors duration-700"
          style={{ background: glow }}
        />

        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          className={isUrgent ? "animate-pulse-ring" : undefined}
          aria-label={`${minutes}:${String(seconds).padStart(2, "0")} remaining`}
        >
          {/* Track */}
          <circle
            cx="110" cy="110" r={RING_R}
            fill="none" stroke="#e5e7eb" strokeWidth="12"
          />
          {/* Progress */}
          <circle
            cx="110" cy="110" r={RING_R}
            fill="none"
            stroke={stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
            transform="rotate(-90 110 110)"
            className="ring-progress"
            style={{ filter: `drop-shadow(0 0 8px ${stroke}99)` }}
          />
          {/* Time text */}
          <text
            x="110" y="100"
            textAnchor="middle" dominantBaseline="middle"
            fontSize="40" fontWeight="900"
            fontFamily="'Inter', ui-monospace, monospace"
            fill="#111827" letterSpacing="-2"
          >
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </text>
          <text
            x="110" y="132"
            textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontWeight="700"
            fontFamily="'Inter', system-ui, sans-serif"
            fill="#9ca3af" letterSpacing="2"
          >
            TIME LEFT
          </text>
        </svg>
      </div>

      {/* ── Heading ── */}
      <div className="animate-slide-up text-center">
        <h2 className="text-2xl font-black text-gray-900">Complete your payment</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Your items are reserved. Pay before the timer runs out.
        </p>
      </div>

      {/* ── Order summary ── */}
      <div className="animate-slide-up delay-100 mt-6 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
            Order #{order.orderId}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            Awaiting payment
          </span>
        </div>

        {order.items && order.items.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <li
                key={item.id ?? idx}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-600">
                    {item.quantity}×
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {item.product?.name ?? `Item ${item.productId}`}
                  </span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {formatPrice(item.unitPricePaise * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between bg-gray-50 px-5 py-4">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-xl font-black text-gray-900">
            {formatPrice(order.totalAmountPaise)}
          </span>
        </div>
      </div>

      {/* ── Locally expired notice ── */}
      {isExpiredLocally && (
        <div className="animate-fade-in mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <Clock size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm leading-5 text-amber-800">
            Timer reached zero — waiting for the server to confirm the final status.
          </p>
        </div>
      )}

      {/* ── Poll error ── */}
      {statusError && (
        <p role="alert" className="animate-fade-in mt-3 text-center text-xs text-red-600">
          {statusError}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="animate-slide-up delay-200 mt-6 flex w-full flex-col gap-3 sm:flex-row">
        <button
          type="button"
          id="refresh-status-btn"
          onClick={onRefresh}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
        >
          <RefreshCw size={15} />
          Refresh status
        </button>
        <button
          type="button"
          onClick={onNewOrder}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-400 transition hover:bg-gray-50"
        >
          <ArrowLeft size={15} />
          Cancel &amp; go back
        </button>
      </div>

      <p className="animate-fade-in delay-300 mt-4 text-center text-xs text-gray-400">
        Status refreshes automatically every 2 seconds
      </p>
    </div>
  );
}

/* ── Main PaymentScreen ───────────────────────────────────── */

interface PaymentScreenProps {
  order: Order;
  statusError: string | null;
  onNewOrder: () => void;
  onRefresh: () => void;
  onPickupClaimed: () => void;
}

export default function PaymentScreen({
  order,
  statusError,
  onNewOrder,
  onRefresh,
  onPickupClaimed,
}: PaymentScreenProps) {
  const isTerminal = TERMINAL.includes(order.status);

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Top colour stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-amber-400" />

      {/* Content card */}
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">

        {/* Back link — only while pending */}
        {!isTerminal && (
          <button
            type="button"
            onClick={onNewOrder}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 transition hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            Back to menu
          </button>
        )}

        {/* Logo mark at top of terminal states */}
        {isTerminal && (
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-900">
                <Utensils size={15} className="text-white" />
              </div>
              <span className="text-lg font-black text-gray-900">
                pickup<span className="text-emerald-500">.</span>
              </span>
            </div>
          </div>
        )}

        {/* State renders */}
        {order.status === "PENDING_PAYMENT" && (
          <PendingView
            order={order}
            statusError={statusError}
            onNewOrder={onNewOrder}
            onRefresh={onRefresh}
          />
        )}
        {(order.status === "PAID" || order.status === "PICKED_UP") && (
          <PaidResult order={order} onNewOrder={onNewOrder} onPickupClaimed={onPickupClaimed} />
        )}
        {order.status === "EXPIRED" && (
          <ExpiredResult order={order} onNewOrder={onNewOrder} />
        )}
        {order.status === "NEEDS_REVIEW" && (
          <NeedsReviewResult order={order} onNewOrder={onNewOrder} />
        )}
        {order.status === "PAYMENT_FAILED" && (
          <PaymentFailedResult order={order} onNewOrder={onNewOrder} />
        )}
      </div>
    </div>
  );
}
