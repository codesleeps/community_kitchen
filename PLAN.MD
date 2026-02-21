
# Community Kitchen Breakfast App — Plan (MVP)

Community ordering app for supported‑living residents in Birmingham, focused on breakfast service (8–11am) with optional delivery.

---

## 1. Goals and Constraints

- **Goals**
- Let residents see today’s breakfast menu.
- Let residents (or staff on their behalf) place simple breakfast orders.
- Support delivery to flats/rooms and collection.
- Give kitchen staff a clear, printable list of orders by time and status.

- **Scope for v1**
- No online payments (cash / donation box / card reader in person).
- No maps or rider tracking.
- Single site (one community kitchen).

- **Assumptions**
- Residents mainly have Android phones; some may have iOS or none.
- Staff can place orders from a tablet/PC for residents who can’t use the app.
- Service window: 8am–11am, 7 days or selected days.

---

## 2. Architecture Choice

For something you can ship quickly and run cheaply:

- **Frontend**: React (web app) with PWA support
- Residents can “Add to Home Screen” → app‑like feel.
- One codebase, no app‑store faff initially.

- **Backend**: Node.js + Express (or Fastify)
- Simple REST API for menu, orders, and admin views.

- **Data/Storage**:
- PostgreSQL (or SQLite for very first prototype) with a minimal schema.

- **Auth**: Very light for v1
- Option A: No formal login; residents choose their name + flat from a dropdown.
- Option B: Simple PIN per resident (stored server‑side).

You can always rebuild the frontend later in React Native if you want a full native app.

---

## 3. Data Model

### 3.1 Tables

#### `residents`
- `id` (PK)
- `name` (string)
- `flat_number` (string)
- `is_active` (boolean)
- `pin` (string, nullable) – if you go with PIN login

#### `menu_items`
- `id` (PK)
- `name` (string) — e.g. "Standard Breakfast", "Veggie Breakfast", "Porridge"
- `description` (text)
- `price_pence` (integer) — for internal budgeting, even if free to residents
- `is_active` (boolean)
- `category` (string) — e.g. "main", "side", "drink"

#### `service_days`
- `id` (PK)
- `date` (date)
- `service_start_time` (time) — e.g. 08:00
- `service_end_time` (time) — e.g. 11:00
- `is_open` (boolean)

#### `orders`
- `id` (PK)
- `resident_id` (FK → residents)
- `service_day_id` (FK → service_days)
- `created_at` (timestamp)
- `requested_time` (time) — target time within 8–11
- `fulfilment_type` (enum: `DELIVERY`, `COLLECTION`, `EAT_IN`)
- `delivery_location` (string, nullable) — e.g. “Flat 3B”
- `status` (enum: `PENDING`, `IN_PROGRESS`, `READY`, `DELIVERED`, `CANCELLED`)
- `special_notes` (text, nullable)

#### `order_items`
- `id` (PK)
- `order_id` (FK → orders)
- `menu_item_id` (FK → menu_items)
- `quantity` (integer)

To keep it lean, you can skip residents table in v1 and just capture `name` and `flat_number` as strings on `orders`, then normalise later.

---

## 4. API Design

Base URL: `/api`

### 4.1 Public / Resident‑facing

- `GET /api/service-day/today`
- Returns: service window, is_open flag.

- `GET /api/menu`
- Returns: active menu items for today.

- `POST /api/orders`
- Body:
```json
{
"name": "John Smith",
"flat_number": "3B",
"requested_time": "09:30",
"fulfilment_type": "DELIVERY",
"delivery_location": "3B",
"special_notes": "No beans",
"items": [
{ "menu_item_id": 1, "quantity": 1 },
{ "menu_item_id": 3, "quantity": 1 }
]
}
```
- Returns: order id + status.

- Optional: `GET /api/orders/:id`
- Simple status check (e.g. PENDING, IN_PROGRESS, DELIVERED).

### 4.2 Admin / Kitchen

- `GET /api/admin/orders?date=YYYY-MM-DD`
- Returns all orders for that date:
- grouped or sortable by status and requested_time.

- `PATCH /api/admin/orders/:id/status`
- Body: `{ "status": "IN_PROGRESS" }`, etc.

- Optional: `GET /api/admin/summary?date=YYYY-MM-DD`
- Returns item totals (e.g. “18 x Standard Breakfast, 2 x Veggie”) for prep.

Secure admin routes using a simple JWT / session or even a shared secret in headers for v1 (since it’s only you + staff).

---

## 5. Frontend Screens (Resident)

### 5.1 Welcome / Identify User

- Simple page:
- Title: “Community Breakfast Orders”
- If you go *no login*: fields `Name`, `Flat/Room`, `Next`.
- You can store this in `localStorage` so it doesn’t need re‑entering each time.

### 5.2 Today’s Service Status

- Shows:
- “Breakfast is served today from 8:00–11:00”
- If closed, a friendly message.
- Button: “Place an order”

### 5.3 Menu & Order Flow

- **Menu list**:
- Cards: name, short description, (optional) price.
- Each card has a `+` button or quantity stepper.

- **Order details**:
- Requested time (dropdown in 15‑min slots between 8 and 11).
- Fulfilment: radio buttons: `Delivery`, `Collect`, `Eat in`.
- Special notes text box.

- **Review screen**:
- Show chosen items + quantities.
- Show name, flat, requested time, fulfilment.
- Confirm button → POST to `/api/orders`.

- **Confirmation screen**:
- Simple order number.
- Message: “We’ve received your order for around 9:30. If you need to change it, please speak to staff.”

---

## 6. Frontend Screens (Admin / Kitchen)

### 6.1 Login

- Very basic: email + password, or just a shared admin PIN.
- Once authenticated, load admin dashboard.

### 6.2 Orders Dashboard

- Filters:
- Date selector (default today).
- Status filter (All, Pending, In progress, Ready, Delivered).

- For each order:
- Time, name, flat, fulfilment type.
- Items and quantities.
- Special notes in bold/colour.

- Actions:
- Buttons: `Start`, `Ready`, `Delivered`, `Cancel`.
- This sends `PATCH /api/admin/orders/:id/status`.

### 6.3 Prep Summary

- Optional but useful:
- Table for today:
- Standard Breakfast – 14
- Veggie Breakfast – 6
- Porridge – 3
- Button “Print summary” for the morning.

---

## 7. Implementation Steps

### 7.1 Backend Setup

1. Initialise project:
- `mkdir community-kitchen-app && cd community-kitchen-app`
- `npm init -y`
- `npm install express cors dotenv pg` (or sqlite3 / prisma if you like ORMs)

2. Basic Express server:
- Set up `/api/health` route to confirm it runs.
- Add CORS and JSON body parsing.

3. Database:
- Create tables per the schema above.
- Seed `menu_items` with a few basics:
- Standard Breakfast
- Veggie Breakfast
- Porridge
- Tea
- Coffee

4. Implement API endpoints:
- `GET /api/service-day/today`
- `GET /api/menu`
- `POST /api/orders`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`

5. Add basic validation:
- Ensure requested_time is within service window.
- Ensure requested items exist and quantities > 0.

### 7.2 Frontend Setup

1. Create React app:
- `npx create-react-app community-kitchen-frontend` (or Vite + React).
2. Setup basic routing with React Router:
- `/` – resident flow (identify + order).
- `/admin` – admin dashboard.
3. Implement screens described in section 5 & 6.
4. API calls using `fetch` or `axios`.

### 7.3 PWA Enhancements (Optional but Recommended)

1. Enable PWA:
- Add manifest.json (name, icons, theme colour).
- Register service worker for offline caching of static assets.
2. Test on Android:
- Open in Chrome, “Add to Home screen”.
- Ensure it looks like an app and opens full screen.

---

## 8. Future Enhancements (After MVP)

- Proper resident accounts:
- Unique IDs, PIN login, history of past orders.
- Dietary flags:
- Mark items as vegetarian, vegan, gluten‑free, etc.
- Simple reporting:
- Weekly totals of items and number of breakfasts served.
- Multi‑kitchen support:
- If you run this in more than one building.

---

## 9. Repo Structure (Suggestion)

```text
community-kitchen-app/
backend/
src/
index.js
routes/
public.js
admin.js
db/
connection.js
migrations/
package.json
frontend/
src/
components/
pages/
Resident/
Admin/
api/
client.js
package.json
README.md


