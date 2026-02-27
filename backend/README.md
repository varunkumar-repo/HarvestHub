# HarvestHub Backend (MongoDB Atlas)

## 1) Setup

1. Copy `.env.example` to `.env`
2. Fill:
   - `MONGODB_URI` with your Atlas connection string
   - `JWT_SECRET` with a long random secret
3. Install dependencies:
   - `npm install`
4. Start server:
   - `npm run dev`

Server runs at `http://localhost:5000` by default.

## 2) API Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/products`
- `POST /api/products` (admin token required)
- `PUT /api/products/:id` (admin token required)
- `DELETE /api/products/:id` (admin token required)
- `GET /api/orders` (customer gets own orders, admin gets all)
- `POST /api/orders` (authenticated user)
- `DELETE /api/orders/:id` (admin token required)

## 3) Auth Header

Use:

`Authorization: Bearer <jwt_token>`
