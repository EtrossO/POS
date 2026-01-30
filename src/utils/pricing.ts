
import { PromoRule } from '../types';

/**
 * Calculates the total price using a greedy algorithm for promotions.
 * It tries to apply the largest quantity bundles first.
 */
export const calculatePrice = (
  quantity: number,
  basePrice: number,
  promos: PromoRule[]
): { total: number; applied: string[]; standardTotal: number; savings: number } => {
  if (quantity <= 0) return { total: 0, applied: [], standardTotal: 0, savings: 0 };

  const standardTotal = quantity * basePrice;
  // Only apply a promotion when the purchased quantity exactly matches a promo
  // (do NOT combine promos). Otherwise charge base price for all items.
  const matched = promos.find((p) => p.quantity === quantity);
  if (matched) {
    const applied = [`${matched.quantity}pcs Promo`];
    const savings = standardTotal - matched.price;
    return { total: matched.price, applied, standardTotal, savings };
  }

  return { total: standardTotal, applied: [], standardTotal, savings: 0 };
};
