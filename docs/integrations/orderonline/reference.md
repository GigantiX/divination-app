# OrderOnline API reference for Divination

Captured: **22 October 2026**, Asia/Jakarta. Official API version: **1.0.0**. This is a documentation analysis; no real API key or live account was used.

Start here for future OrderOnline work. The [OpenAPI snapshot](./openapi.snapshot.json) preserves the complete endpoint definitions, parameters, schemas, examples, response codes, and authentication declarations from all **11 operations across 10 paths** in the official index. Its snapshot metadata records source URLs, page update dates, and SHA-256 hashes. The webhook guide is summarized below because it is not an OpenAPI operation.

The [Connected Apps plan](../../architecture/connected-apps-implementation-plan.md) defines the current feature. This reference records API capabilities, not permission to implement every capability. Use the saved contracts first; revisit upstream documentation when resolving an explicit gap, incompatible response, or later API change.

## Authentication and connection verification

Production base URL: `https://api.orderonline.id`.

1. Obtain a personal access token from [OrderOnline API Keys](https://app.orderonline.id/settings/api-keys). Divination may label it **API Key**.
2. Call `POST /v1/auth` with a JSON object containing `token`. Optional `meta` is a JSON-encoded **string**, not an object.
3. Read `data.access_token` from a successful response. Other documented fields are `user_id`, `name`, `email`, `username`, and `token_type`.
4. Send `Authorization: Bearer <access_token>` to protected endpoints, including `GET /v1/profile`.

Authentication succeeds with HTTP 200. HTTP 400 can mean an invalid token **or an inactive account**. Do not forward the personal access token directly as the profile bearer token. The docs do not specify JWT lifetime, refresh tokens, revocation behavior, or a refresh endpoint. For the initial connection feature, exchange the saved personal access token again for each explicit recheck rather than persisting JWTs. [Authentication source](https://developers.orderonline.id/reference/auth)

## Documented operations and future use

| Method and path | Purpose in Divination | First release |
| --- | --- | --- |
| `POST /v1/auth` | Verify a personal access token and obtain a JWT | Yes |
| `GET /v1/profile` | Preview and save the identity attached to a connection | Yes |
| `GET /v1/orders` | Future order import, reconciliation, sales and attendance input | Later |
| `GET /v1/orders/{submission_id}` | Future order lookup and detail refresh | Later |
| `POST /v1/orders` | Possible future order creation | Later |
| `GET /v1/products` | Future product selection and event/batch mapping | Later |
| `GET /v1/products/{product_id}` | Future product detail and mapping verification | Later |
| `GET /v1/subdistricts` | Future Indonesian delivery address search | Later |
| `GET /v1/subdistricts/{subdistrict_id}` | Future delivery address lookup | Later |
| `GET /v1/shipping/cost` | Future shipping estimates | Later |
| `GET /v1/shipping/track/{submission_id}` | Future shipment progress | Later |

### Profile

`GET /v1/profile` takes no documented query parameters. HTTP responses are 200, 401, and 404.

The `data` object documents these fields:

- Identity/contact: `user_id`, `name`, `email`, `username`, `phone`, `picture`.
- Access/account state: `role`, `parent_id`, `capabilities`, `is_active`.
- Store/account details: `store`, `package`, `expired_date`, `credit`, `bank_accounts`, `created_at`.

For team members, store-level values come from the parent owner. `parent_id` identifies that owner. Preserve both the authenticated user ID and owner identity; several credentials can access the same store. The `store` object and bank-account items do not have fully specified properties. Do not invent a store ID field.

Profile verification establishes identity and connectivity. It does **not** prove that every product/order endpoint is permitted. Package/expiry fields are display metadata, not a documented capability algorithm. [Profile source](https://developers.orderonline.id/reference/get_v1-profile)

### Orders: listing and detail

`GET /v1/orders` accepts optional query parameters:

| Parameter | Contract |
| --- | --- |
| `limit` | Integer; default 50, maximum 1000 |
| `page` | Integer; default 1 |
| `since`, `until` | Dates, e.g. `YYYY-MM-DD` |
| `keyword` | Buyer search, e.g. name or phone |
| `status`, `payment_status` | Order and payment filters; exhaustive values unspecified |
| `product_id` | Product filter |
| `sort_by` | Sort field; supported fields unspecified |
| `sort` | `asc` or `desc` |

The result is a `data` array. Examples include `_id`, numeric `order_id`, `product_id`, and `customer_data`. The detailed order structure is not fully constrained. The date filters do not identify whether they use creation or update time. No total-page metadata, stable ordering guarantees, or cursor contract is documented. [Order list source](https://developers.orderonline.id/reference/orders)

`GET /v1/orders/{submission_id}` accepts the submission's MongoDB ID or numeric order number and returns an order object. Its definition lists 200 and 401; absence of a documented 404 is not evidence that every lookup exists. Preserve submission ID separately from order number and scope future records by source account. [Order detail source](https://developers.orderonline.id/reference/get_v1-orders-submission-id)

### Creating orders

`POST /v1/orders` takes JSON with:

- Required `item_details`: at least one item, each requiring `price`; other documented fields are `product_id`, `name`, `quantity`, `weight`. Providing `product_id` makes the name optional.
- Required `customer_details`: requires `name` and `phone`; optional `email`, `subdistrict_name`, `subdistrict_id`, `zip`.
- Optional `payment_method`: `bank_transfer`, `cod`, or `instant`.
- Optional `courier`: `jne`, `sap`, `jnt`, `ninja`, or `idexpress`; optional `service`.

Providing a courier or service requires `subdistrict_id`. That ID overrides subdistrict name and postcode; postcode otherwise overrides name. Success is HTTP 200 with `submission_id`, `order_id`, nullable `snap_token`, and `total_price`. HTTP 400 indicates validation/processing failure; 401 indicates failed authorization.

No idempotency mechanism is documented. Future implementation must resolve duplicate-creation handling before retrying ambiguous failures. Custom fields, payment-status changes, refunds, and ticket URLs are not part of this documented request schema. [Create order source](https://developers.orderonline.id/reference/post_v1-orders)

### Products

`GET /v1/products` accepts optional `limit` (default 25, max 1000), `page` (default 1), `keyword` (product name), `status` (example: `live`), `category_slug`, `sort_by` (documented default: name), and `sort` (`asc`/`desc`). It returns a `data` array.

Examples contain `_id`, `name`, `slug`, `price`, and `type`; these examples are not a complete product schema. [Product list source](https://developers.orderonline.id/reference/get_v1-products)

`GET /v1/products/{product_id}` requires a MongoDB product ID and returns a product object; its example additionally contains `weight` and `status`. Both product definitions list 200 and 401. Future event/batch mapping should use account identity plus product ID, with names only for display. [Product detail source](https://developers.orderonline.id/reference/get_v1-products-product-id)

### Subdistricts

`GET /v1/subdistricts` accepts optional `limit` (default 20, max 1000), `page` (default 1), and `keyword` (subdistrict name). Examples contain `subdistrict_id`, `subdistrict_name`, province/city IDs and names, and `zip`. Responses: 200 or 401. [List source](https://developers.orderonline.id/reference/get_v1-subdistricts)

`GET /v1/subdistricts/{subdistrict_id}` takes a numeric ID and returns a single location. Responses: 200, 401, or 404. [Detail source](https://developers.orderonline.id/reference/get_v1-subdistricts-subdistrict-id)

### Shipping estimates

`GET /v1/shipping/cost` requires `origin_id`, `destination_id`, `couriers`, and `weight`. Origin/destination are numeric subdistrict IDs; weight is an integer in grams, minimum 1. `couriers` is a JSON-encoded array string. Known codes: `oexpress`, `jne`, `jnt`, `ninja`, `sap`, `idexpress`, `spx`, `sicepat`; an empty array uses platform defaults.

Optional parameters: `payment_method` (bank_transfer/cod/instant), JSON-string `volume` in cm, `with_fallback` (default true), `mode` (normal), repeated `exclude_couriers[]`, `origin_coordinate`, `destination_coordinate` (`lat,lng`), `ref`, and `use_cache_header` (default false).

The result groups service rates by courier, including costs in IDR, ETA text, optional insurance configuration and source. Requested `jnt` can return as `J&T`. COD changes service eligibility/fees. Responses include 200, 400, 401, and 422; the **422 validation body differs from the usual envelope**. The optional cache header advertises 300 seconds. [Shipping estimate source](https://developers.orderonline.id/reference/get_v1-shipping-cost)

### Shipping tracking

`GET /v1/shipping/track/{submission_id}` accepts a MongoDB submission ID, order number, or AWB. Non-ObjectId values first undergo receipt lookup. Optional `is_return_histories` defaults true; false omits `history` and `logistic`.

Responses include delivery status, receipt status, optional history/logistics and driver data. Documented statuses: `processing`, `manifested`, `delivered`, `returned`, `return_started`, `cancelled`, `lost`, `broken`, `failed_pickup`, and empty string. Courier timestamps vary in format.

Requests are account-scoped. For deliveries already marked delivered, tracking uses stored data; otherwise this GET queries the courier and **refreshes stored shipping status**. Treat it as having a side effect. HTTP results: 200, 400 (e.g. no AWB), 401, 404, 500. Sanitize upstream exception messages. [Tracking source](https://developers.orderonline.id/reference/get_v1-shipping-track-submission-id)

## Webhooks

The guide advertises order creation/update notifications and links to [manual webhook setup](https://app.orderonline.id/settings/webhooks). No API operation for webhook registration is present in the index.

Checkout-form examples use `type`, `action`, and nested `payload`; the storefront example shows an order directly. These are **different illustrated shapes**, not proof of a single guaranteed delivery envelope. Checkout IDs/timestamps are mostly plain values; storefront examples include MongoDB `$oid`/`$date` objects.

Illustrated order data includes account/order/product IDs, customer/address/quantity, prices/costs, payment/order status, shipping, bump/coupon, product variations, follow-up progress, metadata, and timestamps. Checkout examples use a single product; storefront examples include `products` and `cart_items` arrays.

The guide does not define signing headers/secrets, event IDs, retries, acknowledgement deadlines, ordering, replay protection, or versioning. Before future ingestion, establish authentication and reconciliation; unverified notifications must not grant attendance/payment rights. These omissions do not block profile-based connections. [Webhook source](https://developers.orderonline.id/docs/webhooks)

## Integration rules and gaps

- Most endpoint definitions use `data`, `message`, `error_code`, `request_id`. Validate HTTP status and expected data shape together: even error examples can contain `error_code: 0`.
- Authentication documents `X-Request-Id` echo/generated response IDs. Local correlation IDs should contain no credentials or buyer data.
- No numerical rate limits, retry headers, timeout promises, token TTL, or sandbox base URL are documented. Use bounded timeouts; classify 429/5xx/network failures as operational handling, not guaranteed documented responses.
- Detailed store, order, product and subdistrict response schemas are incomplete. Keep optional fields optional and reject malformed identities safely.
- Preserve external IDs as strings inside Divination. A buyer phone, order number, authenticated user ID, owner ID, product ID, and connection UUID are different identities.
- Multiple keys for one owner must not create duplicate future order datasets. Future ingestion identity should be platform + owner/account + resource ID, independently of credential rotation.
- `since`/`until`, pagination termination, update discovery, currency outside shipping, and provider timezone need live validation before synchronization. Do not infer a reliable updated-at feed.
- No documented endpoints update/delete products, modify/refund existing orders, write custom fields, manage API keys, or configure webhooks. Treat these as unavailable until separately verified.
- Saving a profile is not synchronization. This release calls only authentication/profile endpoints.

## Source and snapshot maintenance

The [official index](https://developers.orderonline.id/llms.txt) listed two guides and 11 endpoint operations when captured. The [getting-started page](https://developers.orderonline.id/docs/getting-started) links API-key creation, webhook setup, and the API reference. Public documentation pages provide `.md` versions containing their OpenAPI operation definitions.

The saved JSON is a consolidation of those definitions, not an official downloadable full specification. Keep source provenance, verify referenced schemas, and update this reference alongside any future contract changes. Real integration credentials must never be added to these documents or examples.
