
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Order } from "../types";

interface OrderStatusPanelProps {
  order: Order;
  onClose: () => void;
  onRefresh: () => void;
}

const formatPrice = (pricePaise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(pricePaise / 100);

function getStatusDetails(status: Order["status"]) {
  switch (status) {
    case "PAID":
      return {
        title: "Payment confirmed!",
        description: "Your order is paid and ready for pickup.",
        icon: CheckCircle2,
        color: "text-emerald-700",
        background: "bg-emerald-50",
      };

    case "EXPIRED":
      return {
        title: "Reservation expired",
        description: "The payment window ended and your stock reservation has expired.",
        icon: Clock3,
        color: "text-amber-700",
        background: "bg-amber-50",
      };

    case "NEEDS_REVIEW":
      return {
        title: "Payment needs review",
        description: "We received a payment event that needs manual verification.",
        icon: ShieldAlert,
        color: "text-orange-700",
        background: "bg-orange-50",
      };

    case "PAYMENT_FAILED":
      return {
        title: "Payment failed",
        description: "Your payment was unsuccessful. Please create a new order.",
        icon: XCircle,
        color: "text-red-700",
        background: "bg-red-50",
      };

    case "PICKED_UP":
      return {
        title: "Order collected",
        description: "Your order has already been collected. Enjoy!",
        icon: PackageCheck,
        color: "text-emerald-700",
        background: "bg-emerald-50",
      };

    default:
      return {
        title: "Waiting for payment",
        description: "Complete your payment before the reservation expires.",
        icon: Clock3,
        color: "text-[#22543d]",
        background: "bg-[#edf3ed]",
      };
  }
}

export default function OrderStatusPanel({
  order,
  onClose,
  onRefresh,
}: OrderStatusPanelProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order.status !== "PENDING_PAYMENT") {
      setRemainingSeconds(0);
      return;
    }

    const expiresAt = new Date(order.expiresAt).getTime();
    const serverTime = order.serverTime
      ? new Date(order.serverTime).getTime()
      : Date.now();

    const initialRemaining = Math.max(0, expiresAt - serverTime);
    const startedAt = Date.now();

    const updateCountdown = () => {
      const elapsed = Date.now() - startedAt;
      setRemainingSeconds(
        Math.max(0, Math.ceil((initialRemaining - elapsed) / 1000)),
      );
    };

    updateCountdown();

    const timer = window.setInterval(updateCountdown, 250);

    return () => window.clearInterval(timer);
  }, [order.expiresAt, order.serverTime, order.status]);

  const details = getStatusDetails(order.status);
  const StatusIcon = details.icon;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const isPending = order.status === "PENDING_PAYMENT";

  const handleCopy = async () => {
    if (!order.pickupCode) return;

    try {
      await navigator.clipboard.writeText(order.pickupCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
            Order #{order.orderId}
          </p>

          <h2 className="mt-2 text-xl font-bold text-[#20352b]">
            Order status
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-500 hover:bg-stone-100"
        >
          Close
        </button>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className={`flex gap-4 rounded-2xl p-4 ${details.background}`}>
          <StatusIcon className={`mt-0.5 shrink-0 ${details.color}`} size={25} />

          <div>
            <h3 className={`font-bold ${details.color}`}>
              {details.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {details.description}
            </p>
          </div>
        </div>

        {isPending && (
          <div className="rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#20352b]">
                <Clock3 size={18} className="text-[#22543d]" />
                Time remaining
              </div>

              <span className="font-mono text-2xl font-bold tabular-nums text-[#22543d]">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-[#22543d] transition-[width]"
                style={{
                  width: `${Math.min(100, (remainingSeconds / 120) * 100)}%`,
                }}
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-stone-500">
              Your items are temporarily reserved. Payment confirmation is
              handled by the server.
            </p>

            {remainingSeconds === 0 && (
              <div className="mt-3 flex items-start gap-2 text-sm text-amber-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                Waiting for the server to confirm whether the reservation expired.
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#faf9f6] p-4">
          <span className="text-sm text-stone-500">Order total</span>
          <span className="text-lg font-bold text-[#20352b]">
            {formatPrice(order.totalAmountPaise)}
          </span>
        </div>

        {order.status === "PAID" && order.pickupCode && (
          <div className="rounded-2xl border border-dashed border-[#a8bca7] bg-[#f3f7f0] p-5 text-center">
            <p className="text-sm font-semibold text-[#22543d]">
              Your pickup code
            </p>

            <p className="my-3 font-mono text-4xl font-bold tracking-[0.25em] text-[#20352b]">
              {order.pickupCode}
            </p>

            <p className="text-xs text-stone-500">
              Show this code at the pickup counter.
            </p>

            <button
              type="button"
              onClick={handleCopy}
              className="mx-auto mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-[#22543d] hover:bg-stone-50"
            >
              <Copy size={15} />
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRefresh}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-[#22543d] hover:bg-stone-50"
          >
            <RefreshCw size={16} />
            Refresh status
          </button>

          {order.status !== "PICKED_UP" && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#22543d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#183c2b]"
            >
              Back to menu
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
