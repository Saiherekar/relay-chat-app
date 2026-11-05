# Relay Chat — Real-time messaging application

Relay is a full-stack TypeScript chat application with an Express API, MySQL relational data, Firestore message storage, Socket.IO real-time events, and a responsive React interface.

## Architecture

Backend request flow is **Routes → Middleware → Controller → BL → DL → DAO → MySQL / Firestore**. Controllers contain no SQL. MySQL statements are parameterized and live in DAO modules. Firestore is accessed by the business layer through the Firebase Admin SDK in this initial implementation.

## Requirements

- Node.js 20+
- MySQL 8+
- Firebase project with Firestore enabled and a service account
- npm 10+

## Authentication

Create an account at the sign-in screen. Passwords are hashed with bcrypt. The API returns a JWT; the frontend stores it in localStorage for this starter. For a higher-security browser deployment, move authentication to secure, HttpOnly, SameSite cookies and add CSRF protection.

## APIs

All protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint                                      | Purpose                    |
| ------ | --------------------------------------------- | -------------------------- |
| POST   | `/api/user/register`                          | Register                   |
| POST   | `/api/user/login`                             | Login                      |
| GET    | `/api/user/chats`                             | List conversations         |
| GET    | `/api/user/:userId/profile`                   | User profile               |
| PUT    | `/api/user/profile`                           | Update own profile         |
| POST   | `/api/chat/create`                            | Create/get individual chat |
| POST   | `/api/chat/:chatId/message/send`              | Send message               |
| GET    | `/api/chat/:chatId/messages?limit=30&cursor=` | Paginated messages         |
| POST   | `/api/chat/:chatId/message/:messageId/read`   | Mark read                  |
| POST   | `/api/chat/:chatId/lastseen`                  | Update last seen           |

Every response uses `{ success, message, data, errors }`.

## Socket.IO events

Client events: `join_chat`, `leave_chat`, `send_message`, `typing`, `stop_typing`.
Server events: `receive_message`, `message_sent`, `message_read`, `user_typing`, `user_stop_typing`, `user_online`, `user_offline`, `last_seen_updated`, `socket_error`.

Socket connections authenticate using `socket.handshake.auth.token`. Chat room joins verify MySQL membership. REST and Socket.IO message sending share the same BL function. Supply a stable `clientId` for retry-safe sends.

## Firestore layout

`chats/{chatId}/messages/{messageId}` stores messages; `chats/{chatId}/receipts/{messageId}/users/{userId}` stores read timestamps; `chats/{chatId}/members/{userId}` stores last-seen metadata. Create a Firestore composite index if your query patterns require one.

## Setup

### Prerequisites

- Node.js 20+
- MySQL 8+
- Firebase project with Firestore enabled and a service account
- npm 10+

### Initial configuration

1. Copy `.env.example` to `backend/.env`.
2. Configure the required environment variables in `backend/.env`:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `JWT_SECRET` (minimum 32 random characters)
   - `CLIENT_URL`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Configure the frontend environment variables in `frontend/.env` if required.
4. Keep all secrets out of source control.
5. Create the MySQL database/user or allow the migration script to create the `relay_chat` database.

### Install dependencies and configure the database

Run the following command from the repository root to install dependencies:

```bash
npm install
```

### Database migration

The MySQL database schema is maintained in the SQL schema file located inside:

```text
backend/database/
```

Use the provided `.sql` schema file to create the required database tables and relationships.

1. Open the SQL schema file inside `backend/database/`.
2. Configure the MySQL connection details in `backend/.env`.
3. Execute the schema SQL against your MySQL database using MySQL Workbench or the MySQL command-line client.
4. Verify that the `relay_chat` database and its required tables have been created successfully.

If the repository's `npm run db:migrate` script executes this schema automatically, you can instead run it from the repository root:

```bash
npm run db:migrate
```

### Build and start the application

Build the frontend:

```bash
cd frontend
npm install
npm run dev
```

Build the backend:

```bash
cd ../backend
npm run build
```

Start the backend:

```bash
npm start
```

The backend starts on port `5000` by default.

If the backend is configured to serve the frontend build (`frontend/dist`), both the React frontend and backend API are available through the same port.

Open the application:

- Application: http://localhost:5000
- API health: http://localhost:5000/health
- API documentation: http://localhost:5000/api-docs

### Development mode

For frontend/backend development with hot reload, run the development script from the repository root:

```bash
npm run dev
```

In the default Vite development setup:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

The development setup may use two ports, while the built application can use one port when served by Express.

## Starting a Conversation

Relay Chat supports individual one-to-one conversations between registered users.

### Step 1: Register users

Create at least two user accounts through the registration screen.

For example:

- User A: Alice
- User B: Bob

### Step 2: Get the recipient's User ID

Log in to the application and identify the `userId` of the person you want to chat with.

The User ID is associated with each registered account and is used to identify the recipient when creating a conversation.

### Step 3: Create a conversation

Use the following API:

```http
POST /api/chat/create
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

Provide the recipient's user ID in the request body (using the field expected by the API):

```json
{
  "userId": 2
}
```

For example, if Alice (User ID 1) wants to chat with Bob (User ID 2), Alice must provide Bob's User ID.

The API creates a new individual conversation or returns the existing conversation if one already exists.

### Step 4: Open the conversation

Use the returned `chatId` to load the conversation and its messages.

```http
GET /api/chat/{chatId}/messages?limit=30
Authorization: Bearer <your_jwt_token>
```

Messages are stored in Firestore, while user accounts and chat membership are managed in MySQL.

### Step 5: Start real-time messaging

The application uses Socket.IO for real-time messaging.

Once connected and authenticated, users can join the conversation room and exchange messages without refreshing the page.

**Important:** You need the recipient's registered `userId` to initiate an individual conversation. You do not need to create a new conversation if one already exists between the same two users.
