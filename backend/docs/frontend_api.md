# EasyCom Frontend API Reference

This document provides a detailed API reference for frontend developers to integrate with the EasyCom backend.

---

## 1. Global Setup & Authentication

### Base URL
All API paths listed in this document are relative to the base URL:
```
http://localhost:3000/api/v1
```

### Authentication Header
Most endpoints require authentication. Firebase Authentication is used to secure these routes. Include the Firebase ID token in the `Authorization` header as a Bearer token:
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

> [!NOTE]
> When a request with a valid Firebase Token is first received:
> 1. If a profile does not exist for the Firebase UID, one is automatically created (role defaults to `'CUSTOMER'`).
> 2. If a profile already exists, the `lastLogin` timestamp is updated.
> 3. The user profile details are attached internally to the request context.

### Standard Response Formats

#### Success Response
All successful responses return a JSON payload with a `status: "success"` property:
```json
{
  "status": "success",
  "data": {
    "...": "endpoint-specific fields"
  }
}
```

#### Error Response
Standard HTTP status codes are used alongside a structured error body:
```json
{
  "status": "error",
  "statusCode": 404,
  "errorCode": "PRODUCT_NOT_FOUND",
  "message": "Product not found"
}
```

---

## 2. Products API

### List Products
Retrieves a list of available catalog products.

*   **URL:** `/products`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Query Parameters:**
    *   `category` (optional, string): Filter products by category slug/ID.
    *   `search` (optional, string): Search query to filter products by name or description.
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "products": [
          {
            "id": "prod_12345",
            "name": "Super Coffee Mug",
            "slug": "super-coffee-mug",
            "description": "A high-quality ceramic mug.",
            "price": { "amount": 14.99, "currency": "USD" },
            "imageUrl": "https://example.com/images/mug.jpg",
            "inventoryMode": "SIMPLE",
            "stockQuantity": 42,
            "status": "ACTIVE",
            "createdAt": "2026-07-14T12:00:00.000Z"
          }
        ]
      }
    }
    ```

### Get Product Details
Retrieves detailed information for a specific product by ID.

*   **URL:** `/products/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "product": {
          "id": "prod_12345",
          "name": "Super Coffee Mug",
          "slug": "super-coffee-mug",
          "description": "A high-quality ceramic mug.",
          "price": { "amount": 14.99, "currency": "USD" },
          "imageUrl": "https://example.com/images/mug.jpg",
          "inventoryMode": "SIMPLE",
          "stockQuantity": 42,
          "status": "ACTIVE",
          "variants": []
        }
      }
    }
    ```

---

## 3. Cart API

### Get Cart
Retrieves the current authenticated user's cart.

*   **URL:** `/cart`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "cart_version": 1,
        "items": [
          {
            "sku": "MUG-RED-01",
            "qty": 2,
            "price": 14.99
          }
        ]
      }
    }
    ```

### Update Cart
Replaces or updates the items in the user's cart.

*   **URL:** `/cart`
*   **Method:** `POST`
*   **Auth Required:** Yes
*   **Request Body:**
    *   `items` (array of objects, required):
        *   `sku` (string, required)
        *   `qty` (number, required)
        *   `price` (number, required)
    ```json
    {
      "items": [
        {
          "sku": "MUG-RED-01",
          "qty": 3,
          "price": 14.99
        }
      ]
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "cart_version": 2,
        "items": [
          {
            "sku": "MUG-RED-01",
            "qty": 3,
            "price": 14.99
          }
        ]
      }
    }
    ```

---

## 4. Checkout API

### Initialize Checkout
Locks the cart version and takes a snapshot of the current cart to prevent prices from altering mid-transaction.

*   **URL:** `/checkout/init`
*   **Method:** `POST`
*   **Auth Required:** Yes
*   **Request Body:**
    *   `source_cart_version` (number, required): The current `cart_version` known by the client.
    ```json
    {
      "source_cart_version": 2
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "checkout_id": "chk_a1b2c3d4e5f6g7h8",
        "status": "active",
        "expires_at": "2026-07-15T12:18:16.000Z",
        "snapshot": {
          "source_cart_version": 2,
          "locked_items": [
            {
              "sku": "MUG-RED-01",
              "qty": 3,
              "locked_price": 14.99
            }
          ],
          "locked_total": 44.97
        }
      }
    }
    ```

### Get Checkout Session Details
Retrieves details of an existing active checkout session.

*   **URL:** `/checkout/:checkout_id`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "checkout_id": "chk_a1b2c3d4e5f6g7h8",
        "status": "active",
        "expires_at": "2026-07-15T12:18:16.000Z",
        "snapshot": {
          "source_cart_version": 2,
          "locked_items": [
            {
              "sku": "MUG-RED-01",
              "qty": 3,
              "locked_price": 14.99
            }
          ],
          "locked_total": 44.97
        }
      }
    }
    ```

---

## 5. Orders API

### Place Order
Finalizes checkout and creates an order.

*   **URL:** `/orders`
*   **Method:** `POST`
*   **Auth Required:** Yes
*   **Request Body:**
    *   `checkout_id` (string, required): The identifier from initialized checkout.
    *   `payment_method_id` (string, required): ID of processed payment.
    ```json
    {
      "checkout_id": "chk_a1b2c3d4e5f6g7h8",
      "payment_method_id": "pm_mock12345"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "status": "success",
      "data": {
        "order_id": "ord_890123",
        "status": "success",
        "processed_items": [
          {
            "sku": "MUG-RED-01",
            "quantity": 3
          }
        ]
      }
    }
    ```

### List Orders
Retrieves historical orders placed by the user.

*   **URL:** `/orders`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "orders": [
          {
            "id": "ord_890123",
            "status": "PROCESSING",
            "currency": "USD",
            "totalAmount": { "amount": 44.97, "currency": "USD" },
            "createdAt": "2026-07-15T12:05:00.000Z",
            "items": [
              {
                "productId": "prod_12345",
                "sku": "MUG-RED-01",
                "name": "Super Coffee Mug",
                "quantity": 3,
                "unitPrice": { "amount": 14.99, "currency": "USD" },
                "lineTotal": { "amount": 44.97, "currency": "USD" }
              }
            ]
          }
        ]
      }
    }
    ```

---

## 6. User Profiles & Address Book

### Get Profile
Gets profile information for the authenticated user.

*   **URL:** `/users/me`
*   **Method:** `GET`
*   **Auth Required:** Yes
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "profile": {
          "id": "usr_9999",
          "uid": "firebase_uid_123",
          "email": "customer@example.com",
          "role": "CUSTOMER",
          "firstName": "Jane",
          "lastName": "Doe",
          "addresses": []
        }
      }
    }
    ```

### Update Profile
Updates user contact details (e.g., name, phone number).

*   **URL:** `/users/me`
*   **Method:** `POST`
*   **Auth Required:** Yes
*   **Request Body:**
    ```json
    {
      "firstName": "Janet",
      "lastName": "Doe",
      "phoneNumber": "+15550199"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "profile": {
          "id": "usr_9999",
          "uid": "firebase_uid_123",
          "email": "customer@example.com",
          "role": "CUSTOMER",
          "firstName": "Janet",
          "lastName": "Doe",
          "phoneNumber": "+15550199",
          "addresses": []
        }
      }
    }
    ```

### Add Address
Adds a new entry to the user's address book.

*   **URL:** `/users/me/addresses`
*   **Method:** `POST`
*   **Auth Required:** Yes
*   **Request Body:**
    *   `recipientName` (string, required)
    *   `addressLine1` (string, required)
    *   `addressLine2` (string, optional)
    *   `city` (string, required)
    *   `stateProvince` (string, optional)
    *   `postalCode` (string, required)
    *   `countryCode` (string, required, e.g. "US")
    *   `label` (string, optional, e.g. "Home")
    ```json
    {
      "recipientName": "Janet Doe",
      "addressLine1": "123 Main St",
      "city": "Seattle",
      "stateProvince": "WA",
      "postalCode": "98101",
      "countryCode": "US",
      "label": "Home"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "profile": {
          "id": "usr_9999",
          "addresses": [
            {
              "id": "addr_f5f6a7",
              "recipientName": "Janet Doe",
              "addressLine1": "123 Main St",
              "city": "Seattle",
              "stateProvince": "WA",
              "postalCode": "98101",
              "countryCode": "US",
              "label": "Home",
              "isDefaultShipping": false,
              "isDefaultBilling": false
            }
          ]
        }
      }
    }
    ```

### Delete Address
Removes an address from the user's address book.

*   **URL:** `/users/me/addresses/:addressId`
*   **Method:** `POST` (maps to delete)
*   **Auth Required:** Yes
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "profile": {
          "id": "usr_9999",
          "addresses": []
        }
      }
    }
    ```

### Set Default Address
Sets a specific address as the default for shipping or billing.

*   **URL:** `/users/me/addresses/:addressId/default`
*   **Method:** `POST`
*   **Auth Required:** Yes
*   **Request Body:**
    *   `type` (string, required): Must be either `"shipping"` or `"billing"`.
    ```json
    {
      "type": "shipping"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "status": "success",
      "data": {
        "profile": {
          "id": "usr_9999",
          "addresses": [
            {
              "id": "addr_f5f6a7",
              "recipientName": "Janet Doe",
              "addressLine1": "123 Main St",
              "city": "Seattle",
              "stateProvince": "WA",
              "postalCode": "98101",
              "countryCode": "US",
              "label": "Home",
              "isDefaultShipping": true,
              "isDefaultBilling": false
            }
          ]
        }
      }
    }
    ```

---

## 7. Payments Routing & Simulation

### Stripe Integration

#### Create Checkout Session
Creates a Stripe Checkout Session based on the active `checkout_id`.

*   **URL:** `/payments/stripe/create-checkout-session`
*   **Method:** `POST`
*   **Auth Required:** Yes (indirectly, references user profile)
*   **Request Body:**
    *   `checkout_id` (string, required)
    ```json
    {
      "checkout_id": "chk_a1b2c3d4e5f6g7h8"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "url": "https://checkout.stripe.com/..."
    }
    ```
    The frontend client should catch this response and set `window.location.href = data.url` to redirect the user to the Stripe Checkout page.
    Upon success, Stripe redirects to `/api/v1/payments/stripe/success` which serves the success web view.

---

### PayPal Simulation

#### Create Order (Simulator)
Simulates creating and authorizing an order with PayPal.

*   **URL:** `/payments/paypal/create-order`
*   **Method:** `POST`
*   **Auth Required:** No
*   **Response (303 See Other):**
    Redirects the client to `/api/v1/payments/paypal/success` to complete the simulated checkout flow.
