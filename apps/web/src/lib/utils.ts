import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatUSDC(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatTimeRemaining(deadline: Date | string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: "emerald",
    in_progress: "ocean",
    completed: "coral",
    expired: "slate",
    cancelled: "slate",
    draft: "slate",
    disputed: "violet",
    pending: "amber",
    validating: "ocean",
    passed: "emerald",
    failed: "coral",
    superseded: "slate",
    active: "emerald",
    inactive: "slate",
    suspended: "coral",
    code: "ocean",
    data: "emerald",
    content: "coral",
    url: "violet",
  };
  return colors[status] || "slate";
}

export function getCriteriaTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    code: "💻",
    data: "📊",
    content: "📝",
    url: "🌐",
  };
  return icons[type] || "📋";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
