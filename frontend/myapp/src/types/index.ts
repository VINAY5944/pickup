
export interface Product {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  stockQuantity: number;
  imageUrl: string | null;
  isActive?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CreateOrderItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  id?: number;
  productId: string;
  quantity: number;
  unitPricePaise: number;
  product?: Product;
}

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "EXPIRED"
  | "NEEDS_REVIEW"
  | "PAYMENT_FAILED"
  | "PICKED_UP";

export interface Order {
  orderId: number;
  status: OrderStatus;
  totalAmountPaise: number;
  expiresAt: string;
  pickupCode?: string | null;
  items?: OrderItem[];
  serverTime?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
