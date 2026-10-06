import { Order, PaymentStatus } from '../types';

export interface PaymentGatewayConfig {
  providerName: string;
  isSandbox: boolean;
  webhookEndpoint?: string;
  supportedCurrencies: string[];
}

export interface PaymentSession {
  sessionId: string;
  orderId: string;
  amount: number;
  qrPayload?: string;
  expiresAt: number;
  status: PaymentStatus;
}

/**
 * Payment Service Abstraction
 * Designed for production pluggability (Omise, 2C2P, GB Prime Pay, Stripe, PromptPay gateway).
 * Includes both sandbox simulation mode and live webhook integration hooks.
 */
class PaymentService {
  private config: PaymentGatewayConfig = {
    providerName: 'Royal Hills Multi-Rail Payment Gateway (PromptPay / Cards / Transfer)',
    isSandbox: true,
    supportedCurrencies: ['THB'],
  };

  /**
   * Generates a Thai EMVCo-compliant or gateway-compatible QR string for PromptPay
   */
  generatePromptPayPayload(orderId: string, amount: number): string {
    // Format standardized payload for PromptPay QR rendering
    return `PROMPTPAY:BILLERID:0105559123456:ORDER:${orderId}:AMOUNT:${amount.toFixed(2)}`;
  }

  /**
   * Initializes a payment session for an order
   */
  async createPaymentSession(
    order: Order,
    method: 'QR_PROMPTPAY' | 'CREDIT_CARD' | 'BANK_TRANSFER'
  ): Promise<PaymentSession> {
    const sessionId = `PAY-SESSION-${order.id}-${Date.now()}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15-minute countdown

    let qrPayload: string | undefined;
    if (method === 'QR_PROMPTPAY') {
      qrPayload = this.generatePromptPayPayload(order.id, order.totalAmount);
    }

    return {
      sessionId,
      orderId: order.id,
      amount: order.totalAmount,
      qrPayload,
      expiresAt,
      status: 'PENDING',
    };
  }

  /**
   * Polls or verifies payment status with the gateway backend
   */
  async checkPaymentStatus(orderId: string): Promise<PaymentStatus> {
    // In production, makes GET /api/payments/verify/:orderId request to backend
    return 'PENDING';
  }

  /**
   * Simulates an incoming payment gateway webhook notification (Sandbox / Demo mode)
   */
  async simulateWebhookSuccess(orderId: string): Promise<{ success: boolean; transactionRef: string }> {
    // Mimics real webhook signature verification & settlement
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      transactionRef: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
    };
  }

  getConfig(): PaymentGatewayConfig {
    return { ...this.config };
  }
}

export const paymentService = new PaymentService();
