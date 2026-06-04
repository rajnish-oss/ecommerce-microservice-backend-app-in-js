# E-Commerce Microservices (Local Development)

This repository contains a small microservices-based e-commerce reference system implemented with Node.js/TypeScript, Prisma, gRPC, Kafka, PostgreSQL and MongoDB. Services are arranged under `services/` and are orchestrated with Docker Compose for local development.

## Repo layout

- `api_gateway/` — HTTP gateway and router for frontend clients.
- `proto/` — gRPC protobuf definitions used across services.
- `services/` — individual microservices (user, prodCatalog, cart, order, payment, inventory).
- `docker-compose.yml` — local orchestration for services and backing stores.

Key files to inspect:

- [docker-compose.yml](docker-compose.yml)
- [proto/inventory.proto](proto/inventory.proto)
- [services/inventory/src/api/controllers.ts](services/inventory/src/api/controllers.ts)
- [services/inventory/src/application/commands.ts](services/inventory/src/application/commands.ts)

## Architecture overview

- Each service exposes a gRPC API defined in `proto/` and provides a lightweight server started by `services/*/src/api/client.ts`.
- Services use Prisma for PostgreSQL-backed models (see `services/*/prisma/schema.prisma`).
- Kafka is used for event-driven flows between services (topics and producers/consumers under `services/*/kafka`).
- `api_gateway` acts as a façade, forwarding requests to the appropriate gRPC services.

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (if running services locally outside Docker)
- `npx` (comes with Node.js)

## Local development: start everything

From the repository root:

```bash
docker compose up --build
```

This will:
- Build service images and start database containers (Postgres, MongoDB where used).
- Run Prisma migrations for services that call `prisma migrate deploy` (see each service entry in `docker-compose.yml`).

Ports exposed by services (defaults from compose):

- api_gateway: 8080 (HTTP)
- user_service: 50051
- prodcatalog_service: 50056
- cart_service: 50054
- payment_service: 50052
- order_service: 50058
- inventory_service: 50059

Adjust environment variables or ports in `docker-compose.yml` as needed.

## Running a single service (fast dev loop)

To run a single service locally (without Docker) you'll generally:

1. Install dependencies: `npm install`
2. Generate Prisma client (if schema changed): `npx prisma generate --schema=services/<service>/prisma/schema.prisma`
3. Start the service entrypoint, e.g.: `npx tsx services/inventory/src/api/client.ts`

Note: The repository uses `tsx` in dev commands to run TypeScript directly.

## Protobufs & gRPC

- Protos are in `proto/`. When you change a `.proto` file you may need to regenerate any generated client code you rely on.
- The repo uses dynamic loading via `@grpc/proto-loader` in many services, so explicit code generation is not strictly required for all runtime setups.
- Example: `services/inventory` loads `proto/inventory.proto`. The `product_id` field has been aligned to a string UUID to match the Prisma `productId` model.

## Database / Prisma

- Each service has its own Prisma schema under `services/<service>/prisma/schema.prisma`.
- To apply migrations locally for a single service (when developing outside Docker):

```bash
cd services/inventory
npx prisma migrate deploy --schema=prisma/schema.prisma
```

- To push schema changes to a dev DB (use with caution):

```bash
npx prisma db push --schema=prisma/schema.prisma
```

## Kafka

- Kafka configuration is read from environment variables (e.g., `KAFKA_BROKERS`). Local compose setups may require a running Kafka broker; in this repo Kafka may be expected to run externally or in your development environment.

## Environment and Secrets

- Compose references service-specific environment files like `services/payment/.env` and Docker secrets like `secretKeys/private_key.pem`.
- Ensure any required `.env` files exist before starting services.

## Development notes & gotchas

- The repository mixes dynamic proto loading with Prisma UUID IDs. We updated `proto/inventory.proto` to use `string product_id` (UUID) so RPC payloads match the DB model.
- The inventory service implements atomic stock reservation using a transaction + `updateMany` pattern to avoid race conditions; see [services/inventory/src/application/commands.ts](services/inventory/src/application/commands.ts).
- If you see Prisma P2025 errors when trying to update with complex where conditions, ensure your `where` keys match the schema and use transactions when you need atomicity.

## Troubleshooting

- Docker compose fails: run `docker compose pull` then `docker compose up --build` to refresh images.
- Ports conflict: verify no other local services are bound to the same ports (e.g., 50059 for inventory).
- Prisma errors: verify `DATABASE_URL` for the specific service points to the expected DB and run `npx prisma generate` to refresh the client.

## Testing & Linting

- There are no centralized test runners in the repo root. Each service may include its own tests (inspect `services/*/src` for test files).

## Next steps & recommendations

- Consider centralizing environment variable definitions and a `.env.example` for each service.
- Add CI steps for linting, tests, and proto validation.
- Add health-check endpoints for each service so the gateway and orchestrator can detect readiness.

----

## API Gateway Endpoints

The API Gateway exposes a set of HTTP endpoints that forward requests to the backend gRPC services. The routes are mounted in `api_gateway/src/main.ts` under these prefixes:

- `/api/user` — user service
- `/api/inventory` — inventory service
- `/api/cart` — cart service
- `/api/product-cat` — product catalog service (protected by `authMiddleware`)
- `/api/order` — order service
- `/api/payment` — payment service

Reference (method, path, request shape → gRPC method):

- **User** (`/api/user`)
	- `POST /login` — Authenticate user (email/password) → `UserService.Login`
	- `POST /register` — Create new user account → `UserService.Register`
	- `POST /google-auth` — Initiate Google OAuth (passport)
	- `GET /google/callback` — Google OAuth callback → `UserService.GoogleCallback`

- **Product Catalog** (`/api/product-cat`) — protected
	- `POST /products` — Create a product → `ProductCatalogService.AddProduct`
	- `PUT /products` — Update product fields → `ProductCatalogService.UpdateProduct`
	- `POST /products/archive` — Archive (soft-delete) a product → `ProductCatalogService.ArchiveProduct`
	- `POST /sync/algolia` — Sync product data to Algolia → `ProductCatalogService.SyncToAlgolia`
	- `GET /categories/tree/:productId` — Get category tree for product → `ProductCatalogService.GetCategoryTree` (params: `productId`)
	- `GET /categories/filters/:categoryId` — Get filter attributes for a category → `ProductCatalogService.GetFilterAttributes` (params: `categoryId`)
	- `GET /search/:query` — Full-text search for products → `ProductCatalogService.SearchProducts` (params: `query`)
	- `GET /category/:categorySlug` — List products in a category → `ProductCatalogService.GetProductsByCategory` (params: `categorySlug`)
	- `GET /related/:productId` — Get related/recommended products → `ProductCatalogService.GetRelatedProducts` (params: `productId`)
	- `GET /featured` — Get featured products → `ProductCatalogService.GetFeaturedProducts`
	- `GET /products/:productId` — Get product details → `ProductCatalogService.GetProductDetails` (params: `productId`)

- **Payment** (`/api/payment`)
	- `POST /products` — Create a payment product/pricing entry → `PaymentService.CreateProduct`
	- `PUT /products` — Update payment product/pricing → `PaymentService.UpdateProduct`
	- `POST /checkout` — Create a checkout session → `PaymentService.CreateCheckoutSession`

- **Order** (`/api/order`)
	- `POST /` — Create a new order → `OrderService.CreateOrder`
	- `PATCH /status` — Update an order's status → `OrderService.UpdateStatus`
	- `GET /:orderId` — Get order details → `OrderService.GetOrder`
	- `DELETE /` — Delete an order → `OrderService.DeleteOrder`

- **Inventory** (`/api/inventory`)
	- `POST /add-product` — Add a product to inventory → `InventoryService.AddProduct`
	- `PUT /update-product` — Update inventory product fields → `InventoryService.UpdateProduct`
	- `POST /reserve-stock` — Reserve a quantity of stock → `InventoryService.ReserveStock`
	- `GET /low-stock/:threshold` — List products below threshold → `InventoryService.GetLowStockProducts`

- **Cart** (`/api/cart`)
	- `POST /items` — Add an item to user's cart → `CartService.AddItem`
	- `DELETE /items` — Remove an item from cart → `CartService.RemoveItem`
	- `GET /total/:userId` — Get cart total for user → `CartService.TotalSum` (sent as `user_id`)
	- `GET /:userId` — Get current cart for user → `CartService.GetCart` (sent as `user_id`)


	### Examples: `curl` and `grpcurl`

	Below are quick copy-paste examples for calling the API Gateway with `curl` (HTTP -> gateway) and calling services directly with `grpcurl` (gRPC). Adjust hostnames/ports if you run services differently.

	Notes:
	- Gateway base URL: `http://localhost:8080`
	- gRPC service ports (default compose mappings): user=50051, payment=50052, cart=50054, prodCatalog=50056, order=50058, inventory=50059

	1) User

	curl (gateway):
	```bash
	curl -X POST http://localhost:8080/api/user/register \
		-H 'Content-Type: application/json' \
		-d '{"email":"alice@example.com","password":"s3cr3t","name":"Alice"}'
	```

	grpcurl (direct):
	```bash
	grpcurl -plaintext -d '{"email":"alice@example.com","password":"s3cr3t","name":"Alice"}' localhost:50051 user.UserService/Register
	```

	Sample response (gateway):
	```json
	{ "user": { "id": "123", "email": "alice@example.com", "name": "Alice" } }
	```

	2) Product Catalog (examples)

	curl (add product):
	```bash
	curl -X POST http://localhost:8080/api/product-cat/products \
		-H 'Content-Type: application/json' \
		-d '{"product":{"name":"Guitar","price":499.99,"stock":10,"category":"instruments","description":"Acoustic guitar"}}'
	```

	grpcurl (direct AddProduct):
	```bash
	grpcurl -plaintext -d '{"product":{"name":"Guitar","price":499.99,"stock":10,"category":"instruments","description":"Acoustic guitar"}}' localhost:50056 productcatalog.ProductCatalogService/AddProduct
	```

	Sample response:
	```json
	{ "product": { "product_id": "<uuid>", "name":"Guitar","price":499.99,"stock":10,"category":"instruments","description":"Acoustic guitar" } }
	```

	3) Inventory

	curl (add product via gateway):
	```bash
	curl -X POST http://localhost:8080/api/inventory/add-product \
		-H 'Content-Type: application/json' \
		-d '{"name":"Guitar","price":499.99,"stock":10,"category":"instruments","description":"Acoustic guitar"}'
	```

	grpcurl (direct AddProduct):
	```bash
	grpcurl -plaintext -d '{"name":"Guitar","price":499.99,"stock":10,"category":"instruments","description":"Acoustic guitar"}' localhost:50059 inventory.InventoryService/AddProduct
	```

	Reserve stock (gateway):
	```bash
	curl -X POST http://localhost:8080/api/inventory/reserve-stock \
		-H 'Content-Type: application/json' \
		-d '{"product_id":"<uuid>","amount":2}'
	```

	grpcurl (direct ReserveStock):
	```bash
	grpcurl -plaintext -d '{"product_id":"<uuid>","amount":2}' localhost:50059 inventory.InventoryService/ReserveStock
	```

	Sample ReserveStock response:
	```json
	{ "product": { "product_id": "<uuid>", "stock": 8, "name": "Guitar" } }
	```

	4) Cart

	Add item (gateway):
	```bash
	curl -X POST http://localhost:8080/api/cart/items \
		-H 'Content-Type: application/json' \
		-d '{"user_id":123,"product_id":"<uuid>","quantity":2}'
	```

	Get cart:
	```bash
	curl http://localhost:8080/api/cart/123
	```

	grpcurl (direct AddItem):
	```bash
	grpcurl -plaintext -d '{"user_id":123,"product_id":"<uuid>","quantity":2}' localhost:50054 cart.CartService/AddItem
	```

	Sample GetCart response:
	```json
	{ "user_id": 123, "items": [{ "product_id":"<uuid>", "quantity":2, "price":499.99 }] }
	```

	5) Order

	Create order (gateway):
	```bash
	curl -X POST http://localhost:8080/api/order \
		-H 'Content-Type: application/json' \
		-d '{"orderDetail": {"user_id":123, "items":[{"product_id":"<uuid>","quantity":2}]}}'
	```

	grpcurl (direct CreateOrder):
	```bash
	grpcurl -plaintext -d '{"orderDetail": {"user_id":123, "items":[{"product_id":"<uuid>","quantity":2}]}}' localhost:50058 order.OrderService/CreateOrder
	```

	Sample CreateOrder response:
	```json
	{ "order": { "orderId": 987, "status": "created" } }
	```

	6) Payment

	Create checkout (gateway):
	```bash
	curl -X POST http://localhost:8080/api/payment/checkout \
		-H 'Content-Type: application/json' \
		-d '{"amount":999.98,"currency":"usd","order_id":987}'
	```

	grpcurl (direct CreateCheckoutSession):
	```bash
	grpcurl -plaintext -d '{"amount":999.98,"currency":"usd","order_id":987}' localhost:50052 payment.PaymentService/CreateCheckoutSession
	```

	Sample response:
	```json
	{ "sessionId": "cs_test_...", "checkoutUrl": "https://checkout.example/pay" }
	```

	---

	If you'd like, I can add a short `scripts/` folder with `curl` wrappers or a Postman/Insomnia collection for quick manual testing.

