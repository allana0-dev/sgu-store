# SGU E-Commerce Backend Prototype

NestJS + Prisma + SQLite backend prototype for the St. George's University campus retail e-commerce platform.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Run Prisma migrations:

```bash
npm run prisma:deploy
```

4. Start the API:

```bash
npm run start:dev
```

The API defaults to `http://localhost:4000`.

## Auth Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Use `Authorization: Bearer <accessToken>` for protected routes such as `/auth/me`.

## User Endpoints (Admin Protected)

- `GET /users?limit=250&page=1` - list users (without password hashes)
- `GET /users/:id` - get one user
- `PATCH /users/:id` - update `fullName`, `email`, and/or `role`
- `DELETE /users/:id` - delete a user

All `/users` endpoints require an admin JWT (`role: ADMIN`).

## Cart Endpoints (Protected)

- `GET /cart` - fetch logged-in user's cart
- `POST /cart/items` - add item or increase quantity
- `PATCH /cart/items/:productId` - set quantity (`0` removes the item)
- `DELETE /cart/items/:productId` - remove one item completely
- `DELETE /cart` - clear the full cart
- `POST /cart/checkout` - create an order with fulfillment/payment details and then clear cart

## Cart Endpoints (Public)

- `POST /cart/guest-checkout` - create an order without signing in (requires `items` in request body)

## Product Catalog Endpoints

- `POST /products` - create catalog product
- `PATCH /products/:id` - update catalog product
- `GET /products` - list catalog products
- `GET /products/search?query=hoodie&limit=20&onlyInStock=true` - general product search

## Recommendation Endpoint

- `POST /recommendations` - AI-ranked product recommendations based on user intent and current DB catalog

Example body for `POST /cart/items`:

```json
{
  "productId": "hoodie-001",
  "productName": "SGU Hoodie",
  "productImageUrl": "https://example.com/hoodie.jpg",
  "unitPrice": 29.99,
  "quantity": 1
}
```

For demo UX, the frontend can still mirror this cart in local storage for instant UI hydration, while treating the API as source of truth after login.

Example body for `POST /cart/checkout`:

```json
{
  "fulfillmentMethod": "PICKUP",
  "paymentMethod": "CARD",
  "pickupLocation": "Campus Store",
  "contactPhone": "+1 473 555 1234",
  "notes": "Please text me when ready.",
  "cardholderName": "Alex Student",
  "cardLast4": "4242",
  "items": [
    {
      "productId": "hoodie-001",
      "productName": "SGU Hoodie",
      "productImageUrl": "/images/hoodie.png",
      "unitPrice": 29.99,
      "quantity": 1
    }
  ]
}
```

Use `fulfillmentMethod: "DELIVERY"` with `deliveryAddress` for delivery orders, or `paymentMethod: "PAY_ON_ARRIVAL"` when no card payment is collected during checkout. Only store the card last four digits; do not send or persist raw card numbers.

Example body for `POST /products`:

```json
{
  "id": "sgu-water-bottle",
  "name": "SGU Water Bottle",
  "subtitle": "Insulated stainless steel",
  "description": "Keep your drinks cold for 24 hours or hot for 12 hours with this premium insulated stainless steel water bottle. Features the SGU crest.",
  "images": ["/images/waterbottle.png"],
  "image": "/images/waterbottle.png",
  "href": "/store/sgu-water-bottle",
  "pricing": {
    "currency": "USD",
    "basePrice": 20,
    "salePrice": 18,
    "compareAtPrice": 20
  },
  "inventoryStatus": "low_stock",
  "inventoryLabel": "Only 3 left",
  "category": "essentials",
  "department": "Apparel & Accessories",
  "tags": ["drinkware", "merch", "essentials"],
  "gender": "unisex",
  "dietary": null,
  "variants": [
    {
      "label": "Size",
      "options": ["18 oz", "32 oz", "40 oz"]
    }
  ]
}
```

Example body for `POST /recommendations`:

```json
{
  "query": "I need something warm for late study sessions",
  "limit": 6,
  "userId": 1
}
```

If `OPENAI_API_KEY` is not set or the OpenAI call fails, the endpoint returns deterministic DB-based fallback matches.

## Deployment Notes

For Render or Railway, use a build command like:

```bash
npm install && npm run prisma:deploy && npm run build
```

Use a start command like:

```bash
npm run start:prod
```

Set these additional environment variables for AI recommendations:

- `OPENAI_API_KEY` - your OpenAI API key
- `OPENAI_MODEL` - optional, defaults to `gpt-5.2`

## Quick Publish Link (Render)

1. Push this repo to GitHub.
2. Go to [Render](https://render.com) and click **New +** -> **Blueprint**.
3. Select this repository. Render will detect `render.yaml`.
4. Set `JWT_SECRET` to a long random value.
5. Click **Apply**.

Render will publish your API at a URL like:
`https://sgu-ecommerce-backend.onrender.com`
