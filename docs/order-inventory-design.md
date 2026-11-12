# Order Lifecycle and Inventory Management Design

## 1. Why transactions are not used

The application runs against a standalone MongoDB instance. MongoDB multi-document
transactions require a replica set (or a sharded cluster). This project must not configure
a replica set, migrate the database, or change the existing connection. Consequently, the
checkout workflow cannot use `mongoose.startSession()` or `withTransaction()`.

Instead, order creation uses two mechanisms:

- A conditional atomic update per product to reserve stock.
- Application-level compensating updates when a later step fails.

These mechanisms reduce the risk of overselling, but they are not equivalent to a
multi-document transaction.

## 2. Conditional atomic stock deduction

Stock is reserved with a single `findOneAndUpdate` operation:

```ts
ProductModel.findOneAndUpdate(
  {
    _id: productId,
    status: 'ACTIVE',
    stock: { $gte: quantity },
  },
  { $inc: { stock: -quantity } },
  { returnDocument: 'after', runValidators: true }
)
```

The availability check and the decrement are part of the same MongoDB operation. MongoDB
applies the update atomically for that document. If two customers try to buy the last unit
concurrently, at most one conditional update can match `stock >= quantity`; the other
returns `null`. Stock can never become negative through this path. The filter also prevents
inactive products from being reserved.

A pre-validation read is still performed before reservation so that missing, inactive, and
clearly insufficient products can be rejected early. That read is advisory only; the
conditional update is the final authority.

## 3. Multi-product checkout sequence

1. Normalize the submitted items.
   - Validate product IDs and quantities.
   - Aggregate duplicate product IDs while preserving first-occurrence order.
   - Enforce 1-50 submitted lines and an aggregated quantity of at most 1000 per product.
2. Pre-validate all unique products in one `$in` query.
   - Every requested product must exist, be `ACTIVE`, have enough stock at that moment, and
     have a valid `price` / `salePrice`.
3. Reserve stock one product at a time with the conditional update.
   - Every successful reservation is recorded immediately.
   - The returned updated product document is used for the order snapshot.
4. Build order item snapshots using the effective selling price:
   - `salePrice` when it is not `null`, otherwise `price`.
   - Convert INR to integer paise.
5. Calculate line totals and the order subtotal with safe-integer helpers.
6. Persist the order only after every reservation succeeds.
7. Return a safe response DTO with paise converted back to INR.

If any step before persistence fails, no order is written.

## 4. Compensating restoration

Reservations are tracked in memory as `{ productId, quantity, product }` entries.

If a later reservation fails, the service restores every earlier successful reservation.
Restoration uses an atomic increment:

```ts
ProductModel.findByIdAndUpdate(
  productId,
  { $inc: { stock: quantity } },
  { returnDocument: 'after', runValidators: true }
)
```

Restoration deliberately does not require `status: ACTIVE`, because a product may have been
marked inactive after the reservation succeeded. The repository verifies that a document
was matched and throws when it was not. Restoration is attempted in reverse reservation
order.

If all reservations succeed but order persistence fails, every reservation is restored.
All restoration attempts are made; one failed restoration does not stop the rest.

## 5. Compensation failure

If compensation itself fails, the service cannot guarantee consistent inventory. It:

- Attempts every restoration.
- Logs sanitized operational details: product ID, quantity, and failure count only.
- Returns HTTP 500 with the error code `CHECKOUT_COMPENSATION_FAILED`.
- Never reports a successful checkout.

The response message is intentionally generic. Raw MongoDB errors, credentials, and stack
details are not returned to the customer.

## 6. Process-crash limitation

Compensation is not equivalent to a transaction. If the Node.js process crashes after one
or more stock decrements but before the compensating updates or the order write complete,
some stock may remain deducted without a persisted order. Likewise, an order could be
persisted while a later cleanup step fails, although this implementation writes the order
only after all reservations succeed.

An ambiguous persistence result creates a related risk: if MongoDB accepts the order write
but the driver reports a failure to the application, compensating restoration can run even
though an order exists. The code minimizes this window by separating successful persistence
from response mapping, but it cannot eliminate the ambiguity without transactions or a
reconciliation mechanism.

Avoiding this limitation requires durable recovery mechanisms outside the scope of this
phase, such as a transactional database configuration, an outbox/reconciliation job, or an
inventory ledger. None of those are implemented here.

## 7. Unit testing versus live MongoDB concurrency testing

The automated tests use in-memory fake repositories. They verify:

- Checkout orchestration and price selection.
- Duplicate aggregation and quantity limits.
- Compensation on reservation or persistence failure.
- Compensation-failure reporting.
- In-process concurrent reservation behavior.

The fake repository enforces the same conditional rule as the real repository, so these
tests verify application logic, not MongoDB's server-side atomicity.

One focused test inspects the generated Mongoose query to confirm the real repository uses
a single conditional update with `_id`, `status: ACTIVE`, `stock: { $gte: quantity }`, and
`$inc: { stock: -quantity }`.

The tests do not connect to the development database. They do not perform HTTP requests.
A true concurrency test against a live standalone MongoDB would require a separate test
database and parallel real requests or direct parallel repository calls. That integration
test is not part of this phase.

## 8. Order status transition policy

Order status changes are constrained by an explicit transition table:

| Current | Allowed next states |
| --- | --- |
| PENDING | CONFIRMED, CANCELLED |
| CONFIRMED | PROCESSING, CANCELLED |
| PROCESSING | SHIPPED, CANCELLED |
| SHIPPED | DELIVERED |
| DELIVERED | none |
| CANCELLED | none |

Any other transition is rejected with HTTP 409 and error code
`INVALID_ORDER_STATUS_TRANSITION`. The service checks the policy before attempting an
update, and the repository enforces the expected current status in the update filter:

```ts
OrderModel.findOneAndUpdate(
  { _id: orderId, status: expectedStatus },
  { $set: { status: nextStatus } },
  { returnDocument: 'after', runValidators: true }
)
```

This conditional update prevents two administrators from both applying conflicting
transitions based on the same stale read. If the expected status no longer matches, the
request returns HTTP 409 with code `ORDER_STATUS_CONFLICT`. Non-cancellation transitions
never modify inventory.

## 9. Cancellation workflow

Cancellation is allowed only from `PENDING`, `CONFIRMED`, or `PROCESSING`. Requests from
`SHIPPED` or `DELIVERED` are rejected. Cancellation starts with one conditional atomic
update that requires the expected order status and `inventoryStatus: RESERVED`:

```ts
OrderModel.findOneAndUpdate(
  {
    _id: orderId,
    status: expectedStatus,
    inventoryStatus: 'RESERVED',
  },
  {
    $set: {
      status: 'CANCELLED',
      inventoryStatus: 'RESTORING',
    },
  },
  { returnDocument: 'after', runValidators: true }
)
```

If this update succeeds, the order is durably marked as cancelled before any stock is
restored. A conflicting cancellation or status transition cannot both start from the same
order state. If the order is already `CANCELLED`:

- `RELEASED` means cancellation is complete and the existing order is returned.
- `RESTORING` means a previous attempt did not finish and restoration resumes.
- Any other inventory state is rejected with HTTP 409.

## 10. Idempotent inventory restoration

Each reservation is restored with one per-order, per-product operation key:

```text
order-cancel:<orderId>:<productId>
```

The product repository records applied keys in an internal `stockRestorationKeys` array and
uses one atomic conditional update per item:

```ts
ProductModel.findOneAndUpdate(
  {
    _id: productId,
    stockRestorationKeys: { $ne: operationKey },
  },
  {
    $inc: { stock: quantity },
    $addToSet: { stockRestorationKeys: operationKey },
  },
  { returnDocument: 'after', runValidators: true }
)
```

The stock increment and key recording happen in the same document update. If the key is
already present, the filter does not match and stock is not incremented again. If the
product is missing, the repository reports `PRODUCT_NOT_FOUND`. The filter intentionally
does not require `status: ACTIVE`, because a product may have been made inactive after the
order reserved its stock.

After every item has been restored successfully, one final conditional update marks
inventory as released:

```ts
OrderModel.findOneAndUpdate(
  {
    _id: orderId,
    status: 'CANCELLED',
    inventoryStatus: 'RESTORING',
  },
  { $set: { inventoryStatus: 'RELEASED' } },
  { returnDocument: 'after', runValidators: true }
)
```

The order is only reported as fully cancelled after every restoration succeeds and
`inventoryStatus` becomes `RELEASED`.

## 11. Partial restoration failure and retry

All eligible items are attempted even if one restoration fails. If any item cannot be
restored:

- The order remains `CANCELLED` with `inventoryStatus: RESTORING`.
- Restored items remain protected by their operation keys.
- The API returns HTTP 500 with code `INVENTORY_RESTORATION_FAILED`.
- No claim is made that the cancellation fully completed.

Repeating the same cancellation request is safe. Restoration skips products whose operation
keys were already recorded, retries the remaining products, and marks the order `RELEASED`
only after all items succeed. This is application-level idempotency, not a substitute for a
multi-document transaction.

## 12. Customer and admin visibility

Customer order history is always scoped by the `userId` in the authenticated JWT. Customer
responses omit the customer ID and internal inventory status. Admin list and detail
responses include `customerId` and `inventoryStatus` because those fields are needed for
operational support. Admin status changes use the same transition policy as cancellation.

## 13. Limitations

- `stockRestorationKeys` grows for the lifetime of a product and is internal-only. The
  array is suitable for the order volumes in this project, but a high-volume system should
  move idempotency records to a dedicated collection with retention and indexing policies.
- A process crash can leave an order in `CANCELLED`/`RESTORING` with no active retry. An
  operator or recovery job must repeat the cancellation request to finish restoration.
- Stock restoration and order release are separate document updates. A crash between the
  final product update and `inventoryStatus: RELEASED` leaves the order in `RESTORING`;
  retries are safe because all operation keys are durable on the products.
- Inactive products are still eligible for restoration, but products deleted from the
  database cannot be restored automatically. Such orders remain in `RESTORING` until
  operational intervention.
- A true multi-document transaction would reduce these windows, but it is unavailable on
  the required standalone MongoDB deployment and is intentionally not used.

## 14. Management test coverage

`tests/orders/order.management.test.ts` uses isolated fake order and product repositories.
It covers customer scoping and pagination, admin filtering and detail access, every allowed
status transition, invalid and terminal transition rejection, cancellation from every
eligible status, rejection from `SHIPPED` and `DELIVERED`, duplicate cancellation
idempotency, partial restoration failure, retry completion without double increments,
simultaneous cancellation, and conflicting status transitions.

Focused repository tests inspect the generated Mongoose update to confirm that
`restoreStockOnce` uses a single conditional update containing the operation key in
`stockRestorationKeys: { $ne: ... }`, `$inc: { stock }`, and
`$addToSet: { stockRestorationKeys }`. They also verify the filter does not restrict
product status, so inactive products can be restored. As with checkout tests, these tests do
not connect to MongoDB and do not prove server-side atomicity; they validate the query shape
and application orchestration.
