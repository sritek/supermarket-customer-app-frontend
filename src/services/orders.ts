import api from './api';

export interface OrderItem {
  product: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Address {
  _id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Order {
  _id: string;
  user: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  address: Address;
  paymentMethod: 'cod' | 'razorpay';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export const orderService = {
  createOrder: async (data: {
    addressId: string;
    paymentMethod: 'cod' | 'razorpay';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }): Promise<{ success: boolean; order: Order }> => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  getOrders: async (): Promise<{ success: boolean; orders: Order[] }> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrder: async (orderId: string): Promise<{ success: boolean; order: Order }> => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  createRazorpayOrder: async (amount: number): Promise<{
    success: boolean;
    orderId: string;
    amount: number;
    currency: string;
  }> => {
    const response = await api.post('/orders/razorpay/create', { amount });
    return response.data;
  },

  verifyRazorpayPayment: async (data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<{ success: boolean }> => {
    const response = await api.post('/orders/razorpay/verify', data);
    return response.data;
  },
};

export const addressService = {
  getAddresses: async (): Promise<{ success: boolean; addresses: Address[] }> => {
    const response = await api.get('/user/addresses');
    return response.data;
  },

  addAddress: async (data: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault?: boolean;
  }): Promise<{ success: boolean; address: Address }> => {
    const response = await api.post('/user/addresses', data);
    return response.data;
  },

  updateAddress: async (
    addressId: string,
    data: Partial<Address>
  ): Promise<{ success: boolean; address: Address }> => {
    const response = await api.put(`/user/addresses/${addressId}`, data);
    return response.data;
  },

  deleteAddress: async (addressId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(`/user/addresses/${addressId}`);
    return response.data;
  },

  setDefaultAddress: async (addressId: string): Promise<{ success: boolean; address: Address }> => {
    const response = await api.patch(`/user/addresses/${addressId}/default`);
    return response.data;
  },
};

