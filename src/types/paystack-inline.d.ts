declare module "@paystack/inline-js" {
  interface PaystackCallbacks {
    onSuccess?: (transaction: {
      id: number;
      reference: string;
      message: string;
    }) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
  }

  class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): unknown;
  }

  export default PaystackPop;
}
