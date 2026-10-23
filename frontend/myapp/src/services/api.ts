
import axios from "axios";
import type {
  ApiResponse,
  CreateOrderItem,
  Order,
  Product,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

function unwrap<T>(response: T | ApiResponse<T>): T {
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response
  ) {
    return response.data as T;
  }

  return response as T;
}

export async function getProducts(): Promise<Product[]> {
  const response = await api.get<Product[] | ApiResponse<Product[]>>(
    "/products",
  );

  return unwrap(response.data);
}

export async function createOrder(
  items: CreateOrderItem[],
): Promise<Order> {
  const response = await api.post<Order | ApiResponse<Order>>(
    "/orders",
    { items },
  );

  return unwrap(response.data);
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      (error.code === "ECONNABORTED"
        ? "The request timed out. Please try again."
        : "Unable to connect to the server. Please try again.")
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
export async function getOrder(orderId: number): Promise<Order> {
  const response = await api.get<Order | ApiResponse<Order>>(
    `/orders/${orderId}`,
  );

  return unwrap(response.data);
}

export async function claimPickup(orderId: number, pickupCode: string): Promise<void> {
  await api.post(`/orders/${orderId}/pickup-claim`, { pickupCode });
}

export default api;
