import { Cart, Order } from '@commercetools/platform-sdk';
import { paymentSDK } from '../../payment-sdk';
import { OrderPaymentState } from '../types/stripe-payment.type';
import { generateOrderNumberFromCartId } from './generate-order-number';
import { log } from '../../libs/logger';

const apiClient = paymentSDK.ctAPI.client;

export const createOrderFromCart = async (cart: Cart, paymentState: OrderPaymentState = OrderPaymentState.PAID) => {
  const latestCart = await paymentSDK.ctCartService.getCart({ id: cart.id });

  let orderNumber = '';
  try {
    orderNumber = await generateOrderNumberFromCartId(latestCart.id, latestCart.createdAt, 0);
  } catch (error) {
    log.error('Error generating order number from cart', {
      error,
      cartId: latestCart.id,
      cartCreatedAt: latestCart.createdAt,
    });
    throw error;
  }

  const res = await apiClient
    .orders()
    .post({
      body: {
        cart: {
          id: cart.id,
          typeId: 'cart',
        },
        // shipmentState: 'Pending',
        orderState: 'Open',
        version: latestCart.version,
        orderNumber,
        paymentState,
      },
    })
    .execute();
  return res.body;
};

export const addOrderPayment = async (order: Order, paymentId: string) => {
  const response = await apiClient
    .orders()
    .withId({ ID: order.id })
    .post({
      body: {
        version: order.version,
        actions: [
          {
            action: 'addPayment',
            payment: {
              id: paymentId,
              typeId: 'payment',
            },
          },
        ],
      },
    })
    .execute();
  return response.body;
};
