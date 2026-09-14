import { PaymentGateway, PaymentMethod } from "../../../../generated/prisma/enums";

// export interface ICreatePaymentPayload {
//     studentId: string;
// 	invoiceId: string;
// 	amount: string | number;
// 	method: PaymentMethod;
// }


export interface CreatePaymentPayload {
  invoiceId: string;
  method: PaymentMethod;
  gateway: PaymentGateway;
}