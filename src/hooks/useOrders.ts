import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  orderService,
  addressService,
  type Order,
  type Address,
} from "../services/orders";

export const useOrders = () => {
  return useQuery<{ success: boolean; orders: Order[] }>({
    queryKey: ["orders"],
    queryFn: () => orderService.getOrders(),
  });
};

export const useOrder = (orderId: string) => {
  return useQuery<{ success: boolean; order: Order }>({
    queryKey: ["order", orderId],
    queryFn: () => orderService.getOrder(orderId),
    enabled: !!orderId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      addressId: string;
      paymentMethod: "cod" | "razorpay";
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
    }) => orderService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
};

export const useAddresses = () => {
  return useQuery<{ success: boolean; addresses: Address[] }>({
    queryKey: ["addresses"],
    queryFn: () => addressService.getAddresses(),
  });
};

export const useAddAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      pincode: string;
      isDefault?: boolean;
    }) => addressService.addAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      addressId,
      data,
    }: {
      addressId: string;
      data: Partial<Address>;
    }) => addressService.updateAddress(addressId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => addressService.deleteAddress(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
  });
};

export const useCreateRazorpayOrder = () => {
  return useMutation({
    mutationFn: (amount: number) => orderService.createRazorpayOrder(amount),
  });
};

export const useVerifyRazorpayPayment = () => {
  return useMutation({
    mutationFn: (data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => orderService.verifyRazorpayPayment(data),
  });
};
