বুঝতে পারছি কোথায় confusion হচ্ছে। তোমার **existing API URL একই থাকবে**:

```http
POST http://localhost:5000/api/v1/finance/payments/create
```

শুধু request body-তে **কোন gateway ব্যবহার করবে সেটা যোগ হবে**। আর `amount` এবং `studentId` client থেকে নেওয়া উচিত কি না সেটাও একটু পরিবর্তন করা ভালো।

## 1. তোমার পুরোনো API

আগে ছিল:

```json
{
  "studentId": "a75480af-af9d-454e-ad90-47aa3a1dbc2a",
  "invoiceId": "2e15cf47-1bac-42d9-8052-b283d297bd30",
  "amount": "5000.00",
  "method": "ONLINE_GATEWAY"
}
```

এখন আমি এটাকে করব:

```json
{
  "invoiceId": "2e15cf47-1bac-42d9-8052-b283d297bd30",
  "method": "CARD",
  "gateway": "STRIPE"
}
```

### কেন `studentId` বাদ?

`studentId` authenticated user থেকে নেবে:

```ts
req.user.id
```

কারণ malicious user অন্য student's invoice/payment তৈরি করার চেষ্টা করতে পারে।

### কেন `amount` বাদ?

Amount অবশ্যই Invoice থেকে আসবে:

```text
invoice.amount
```

Client যদি পাঠায়:

```json
"amount": "1.00"
```

কিন্তু invoice-এর amount যদি `5000` হয়, তাহলে security/business logic সমস্যা হবে।

তাই:

```text
Client
  ↓
invoiceId
  ↓
Backend finds Invoice
  ↓
invoice.amount = 5000
  ↓
Payment.amount = 5000
  ↓
Stripe amount = 5000
```

---

# 2. `ONLINE_GATEWAY` আর লাগবে না

তোমার এই enum:

```prisma
enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  MOBILE_BANKING
  ONLINE_GATEWAY
  OTHER
  STRIPE
  SSLCOMMERZ
  BKASH
}
```

এভাবে রেখো না।

করো:

```prisma
enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  MOBILE_BANKING
  OTHER
}

enum PaymentGateway {
  STRIPE
  SSLCOMMERZ
  BKASH
  MANUAL
}
```

তারপর Payment:

```prisma
method  PaymentMethod
gateway PaymentGateway
```

---

# 3. তোমার `/create` API-এর নতুন flow

তোমার endpoint:

```http
POST /api/v1/finance/payments/create
```

Request:

```json
{
  "invoiceId": "2e15cf47-1bac-42d9-8052-b283d297bd30",
  "method": "CARD",
  "gateway": "STRIPE"
}
```

Backend flow হবে:

```text
POST /payments/create
        │
        ▼
Authentication
        │
        ▼
req.user.id
        │
        ▼
Find Invoice
        │
        ├── invoice exists?
        ├── belongs to student?
        ├── already PAID?
        └── valid amount?
        │
        ▼
Create Payment
        │
        │ amount = invoice.amount
        │ studentId = req.user.id
        │ method = CARD
        │ gateway = STRIPE
        │ status = PENDING
        ▼
PaymentGatewayFactory
        │
        ▼
StripeGateway
        │
        ▼
Stripe Checkout Session
        │
        ▼
Save Stripe data in Payment
        │
        ▼
Return checkoutUrl
```

---

# 4. তোমার `PaymentService` কোথায় gateway handle করবে?

এটাই মূল জায়গা।

```ts
const payment = await paymentRepository.create({
  invoiceId: invoice.id,
  studentId: req.user.id,
  amount: invoice.amount,
  method: payload.method,
  gateway: payload.gateway,
  status: "PENDING",
});
```

তারপর:

```ts
const gateway = PaymentGatewayFactory.getGateway(
  payload.gateway
);
```

তারপর:

```ts
const checkout = await gateway.createPayment({
  paymentId: payment.id,
  invoiceId: invoice.id,
  studentId: payment.studentId,
  amount: Number(invoice.amount),
  currency: "bdt",
  description:
    invoice.description ??
    `Invoice ${invoice.invoiceNumber}`,
});
```

Stripe হলে:

```text
payload.gateway = STRIPE
       ↓
PaymentGatewayFactory
       ↓
StripeGateway
       ↓
Stripe API
```

---

# 5. Stripe response পাওয়ার পরে Payment update

ধরো Stripe থেকে:

```text
session.id = cs_test_123
payment_intent = pi_123
```

তখন তোমার একই `payments` table-এ:

```text
id
invoiceId
studentId
amount
method              CARD
gateway             STRIPE
status              PENDING

gatewaySessionId    cs_test_123
gatewayPaymentId    pi_123

gatewayRowData      {...full Stripe session...}
```

অর্থাৎ **আলাদা gateway table লাগছে না।**

---

# 6. API response

তোমার `/create` API থেকে frontend-এ আমি শুধু প্রয়োজনীয় data ফেরত দেব:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Payment session created successfully",
  "data": {
    "paymentId": "payment-uuid",
    "checkoutUrl": "https://checkout.stripe.com/..."
  }
}
```

Frontend:

```ts
window.location.href = data.checkoutUrl;
```

---

# 7. এরপর Stripe payment complete হলে কী হবে?

এখানে **আর `/payments/create` call হবে না।**

Stripe নিজে তোমার webhook endpoint call করবে:

```http
POST /api/v1/finance/payments/webhook/stripe
```

Flow:

```text
Stripe Checkout
      │
      ▼
Student pays
      │
      ▼
Stripe
      │
      ▼
POST /payments/webhook/stripe
      │
      ▼
Verify Stripe Signature
      │
      ▼
Get paymentId from metadata
      │
      ▼
Find Payment
      │
      ▼
status = SUCCESS
      │
      ▼
paidAt = now()
      │
      ▼
Invoice = PAID
      │
      ▼
FinancialTransaction
```

---

# 8. তোমার API দুটো হবে

শেষ পর্যন্ত তোমার Payment module-এ এই দুইটা গুরুত্বপূর্ণ endpoint থাকবে:

### Student payment শুরু করবে

```http
POST /api/v1/finance/payments/create
```

Body:

```json
{
  "invoiceId": "2e15cf47-1bac-42d9-8052-b283d297bd30",
  "method": "CARD",
  "gateway": "STRIPE"
}
```

### Stripe backend-কে notify করবে

```http
POST /api/v1/finance/payments/webhook/stripe
```

এটার body **frontend থেকে আসবে না**। Stripe পাঠাবে।

---

## 9. ভবিষ্যতে SSLCOMMERZ / bKash

একই `/create` API থাকবে।

### Stripe

```json
{
  "invoiceId": "...",
  "method": "CARD",
  "gateway": "STRIPE"
}
```

### SSLCOMMERZ

```json
{
  "invoiceId": "...",
  "method": "CARD",
  "gateway": "SSLCOMMERZ"
}
```

### bKash

```json
{
  "invoiceId": "...",
  "method": "MOBILE_BANKING",
  "gateway": "BKASH"
}
```

তখন তোমার service-এর business logic পরিবর্তন হবে না।

শুধু:

```ts
PaymentGatewayFactory.getGateway(payload.gateway)
```

এর ভিতর থেকে appropriate implementation আসবে।

---

### তোমার ক্ষেত্রে final concept

```text
                         /payments/create
                                │
                                ▼
                         PaymentService
                                │
                    ┌───────────┴───────────┐
                    │                       │
                Create Payment        Select Gateway
                    │                       │
                    │                PaymentGatewayFactory
                    │                       │
                    │          ┌────────────┼────────────┐
                    │          ▼            ▼            ▼
                    │       Stripe      SSLCOMMERZ      bKash
                    │          │            │            │
                    └──────────┴────────────┴────────────┘
                                       │
                                       ▼
                                  Payment Table
                                       │
                    ┌──────────────────┼─────────────────┐
                    ▼                  ▼                 ▼
                gateway           gatewayId       gatewayRowData
```

**অর্থাৎ তোমার `/payments/create` route বাদ দেওয়ার কোনো কারণ নেই।** বরং এটাকেই **generic payment initiation endpoint** বানাবে। `gateway` field-এর মাধ্যমে ঠিক করবে Stripe/SSLCOMMERZ/bKash-এর কোন implementation execute হবে।
