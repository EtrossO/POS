
export enum PaymentMethod {
  CASH = 'CASH',
  QR = 'QR'
}

export interface PromoRule {
  id: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  customerName: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  timestamp: number;
  appliedPromos: string[];
}

export interface BusinessStats {
  totalRevenue: number;
  totalQuantity: number;
  totalOrders: number;
  cashRevenue: number;
  qrRevenue: number;
}
