import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import { orderService, type Order } from "../services/orders";

const Orders = () => {
  const { orderId } = useParams<{ orderId?: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    } else {
      loadOrders();
    }
  }, [orderId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getOrders();
      setOrders(response.orders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrder = async (id: string) => {
    setLoading(true);
    try {
      const response = await orderService.getOrder(id);
      setSelectedOrder(response.order);
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600";
      case "processing":
      case "shipped":
        return "text-blue-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (orderId && selectedOrder) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Link to="/orders">
          <Button variant="outline" className="mb-6">
            ← Back to Orders
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Order #{selectedOrder._id.slice(-8)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Order Status</h3>
              <p className={getStatusColor(selectedOrder.orderStatus)}>
                {selectedOrder.orderStatus.charAt(0).toUpperCase() +
                  selectedOrder.orderStatus.slice(1)}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <div className="space-y-2">
                {selectedOrder.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between p-2 border rounded"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ₹{item.price * item.quantity}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Delivery Address</h3>
              <div className="p-4 border rounded-md">
                <p className="font-medium">{selectedOrder.address.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.address.phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.address.addressLine1}
                  {selectedOrder.address.addressLine2 &&
                    `, ${selectedOrder.address.addressLine2}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.address.city}, {selectedOrder.address.state} -{" "}
                  {selectedOrder.address.pincode}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Payment</h3>
              <p className="text-sm text-muted-foreground">
                Method: {selectedOrder.paymentMethod.toUpperCase()}
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {selectedOrder.paymentStatus}
              </p>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>₹{selectedOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>₹{selectedOrder.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                <span>Total</span>
                <span>₹{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No orders yet</p>
          <Link to="/products">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order._id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Link to={`/orders/${order._id}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors">
                        Order #{order._id.slice(-8)}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${getStatusColor(
                        order.orderStatus
                      )}`}
                    >
                      {order.orderStatus.charAt(0).toUpperCase() +
                        order.orderStatus.slice(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ₹{order.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{order.items.length - 3} more items
                    </p>
                  )}
                </div>

                <Link to={`/orders/${order._id}`} className="block mt-4">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
