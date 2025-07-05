export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  ORDERED = 'ordered',
  RECEIVED = 'received',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PurchaseInvoiceStatus {
  DRAFT = 'draft',
  UNPAID = 'unpaid',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export enum PaymentMethod {
  TRANSFER = 'transfer',
  QRIS = 'qris',
  MIDTRANS = 'midtrans',
  MANUAL = 'manual',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
