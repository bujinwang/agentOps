# Real Estate CRM - Design Document

This document provides a comprehensive design for the custom AI-empowered mobile CRM, including the database schema and the API contracts with n8n workflow outlines.

## 1. Introduction

This system is designed to help real estate agents manage leads and streamline daily tasks. It features a PostgreSQL database, n8n for backend workflow automation and API hosting, and a React Native mobile application as the front-end. Key functionalities include user authentication, lead management (add, view, update), and AI-powered insights.

## 2. Database Schema (PostgreSQL)

The following SQL statements define the structure of the CRM database.

```sql
-- Users Table: For authentication and associating leads/tasks to users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Store hashed passwords (e.g., bcrypt)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table: Core table for storing lead information
CREATE TABLE leads (
    lead_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Associate lead with a user, SET NULL if user is deleted
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone_number VARCHAR(50),
    source VARCHAR(100), -- e.g., 'Website Form', 'Facebook Ad', 'Manual Entry', 'Referral'
    status VARCHAR(50) DEFAULT 'New', -- e.g., 'New', 'Contacted', 'Qualified', 'Showing Scheduled', 'Offer Made', 'Closed Won', 'Closed Lost', 'Archived'
    priority VARCHAR(50) DEFAULT 'Medium', -- e.g., 'High', 'Medium', 'Low'
    budget_min DECIMAL(12, 2),
    budget_max DECIMAL(12, 2),
    desired_location TEXT,
    property_type VARCHAR(100), -- e.g., 'Condo', 'House', 'Townhouse', 'Land'
    bedrooms_min INTEGER,
    bathrooms_min DECIMAL(2,1), -- e.g. 1.5 for 1 full 1 half
    notes TEXT,
    ai_summary TEXT, -- For AI-generated summary of lead's needs
    last_contacted_at TIMESTAMPTZ,
    follow_up_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Interactions Table: To log all activities related to a lead
CREATE TABLE interactions (
    interaction_id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE, -- If lead is deleted, interactions are deleted
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Who performed the interaction
    type VARCHAR(100) NOT NULL, -- e.g., 'Email Sent', 'Call Logged', 'SMS Sent', 'Note Added', 'Status Change', 'Meeting Scheduled'
    content TEXT, -- e.g., email body, call summary, SMS text, note content
    interaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table: For managing follow-ups and other to-dos related to leads or general tasks
CREATE TABLE tasks (
    task_id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(lead_id) ON DELETE CASCADE, -- Optional: link task to a specific lead
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Task assigned to user
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(50) DEFAULT 'Medium', -- e.g., 'High', 'Medium', 'Low'
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_email ON leads(email); -- If searching by email is common
CREATE INDEX idx_leads_follow_up_date ON leads(follow_up_date);

CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(type);

CREATE INDEX idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_is_completed ON tasks(is_completed);
```

## 3. API Contracts and n8n Workflow Outlines

This section outlines the API contracts for the React Native mobile application and the corresponding n8n workflow steps.

### 3.1. Authentication Workflows

#### 3.1.1. User Registration

**Purpose:** Allows a new user to create an account.
**Endpoint (n8n Webhook):** `POST /api/v1/auth/register` (React Native app will call the actual n8n webhook URL)

**API Contract (React Native App -> n8n):**
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Request Body (JSON):**
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123",
      "firstName": "John",
      "lastName": "Doe"
    }
    ```

**API Response (n8n -> React Native App):**
*   **Success (HTTP 201 Created):**
    ```json
    {
      "message": "User registered successfully.",
      "userId": 1 // The new user_id from the database
    }
    ```
*   **Error (e.g., HTTP 400 Bad Request - Validation Error):**
    ```json
    {
      "error": "Invalid email format." // Or "Password too short.", "Email is required."
    }
    ```
*   **Error (e.g., HTTP 409 Conflict - Email Exists):**
    ```json
    {
      "error": "Email already exists."
    }
    ```

**n8n Workflow Steps ("User Registration"):**
1.  **Webhook Node (Trigger):**
    *   Method: `POST`
    *   Responds: "When webhook is called" (initially) or "Using 'Respond to Webhook' node".
    *   Receives user data (`email`, `password`, `firstName`, `lastName`).
2.  **Validation (e.g., Switch Node or multiple IF Nodes):**
    *   Check for presence of `email`, `password`, `firstName`, `lastName`.
    *   Validate email format (e.g., using regex in a Function node or a dedicated validation node if available).
    *   Check password strength (e.g., minimum length in a Function node).
    *   If validation fails, use a "Respond to Webhook" node to send appropriate HTTP 400 error.
3.  **Check for Existing User (PostgreSQL Node):**
    *   Operation: Execute Query
    *   Query: `SELECT user_id FROM users WHERE email = '{{ $json.body.email }}';`
    *   Connect to your PostgreSQL database.
4.  **IF Node (Check if user exists):**
    *   Condition: Check if the PostgreSQL node returned any rows.
    *   If true (user exists), use "Respond to Webhook" node to send HTTP 409 error "Email already exists."
5.  **Hash Password (Code Node):**
    *   **Important:** Requires `bcryptjs` library. Ensure it's available in your n8n environment (e.g., via `NODE_FUNCTION_ALLOW_EXTERNAL=bcryptjs` environment variable if using self-hosted n8n).
    *   Input: `items[0].json.body.password`
    *   Script (example):
        ```javascript
        const bcrypt = require('bcryptjs');
        const saltRounds = 10; // Or configurable
        const hashedPassword = await bcrypt.hash(items[0].json.body.password, saltRounds);
        return { hashedPassword: hashedPassword };
        ```
    *   Output: `hashedPassword`.
6.  **Insert User (PostgreSQL Node):**
    *   Operation: Execute Query
    *   Query:
        ```sql
        INSERT INTO users (email, password_hash, first_name, last_name, updated_at)
        VALUES ('{{ $json.body.email }}', '{{ $item.json.hashedPassword }}', '{{ $json.body.firstName }}', '{{ $json.body.lastName }}', NOW())
        RETURNING user_id;
        ```
    *   This query also sets `updated_at` manually.
7.  **Respond Success (Respond to Webhook Node):**
    *   Status Code: `201`
    *   Response Body (JSON):
        ```json
        {
          "message": "User registered successfully.",
          "userId": "{{ $item.json.user_id }}" // Assuming user_id is returned from the INSERT query
        }
        ```

---

#### 3.1.2. User Login

**Purpose:** Authenticates an existing user and issues a JWT.
**Endpoint (n8n Webhook):** `POST /api/v1/auth/login`

**API Contract (React Native App -> n8n):**
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Request Body (JSON):**
    ```json
    {
      "email": "user@example.com",
      "password": "securePassword123"
    }
    ```

**API Response (n8n -> React Native App):**
*   **Success (HTTP 200 OK):**
    ```json
    {
      "message": "Login successful.",
      "token": "your_generated_jwt_here",
      "userId": 1,
      "email": "user@example.com",
      "firstName": "John"
    }
    ```
*   **Error (HTTP 401 Unauthorized):**
    ```json
    {
      "error": "Invalid email or password."
    }
    ```

**n8n Workflow Steps ("User Login"):**
1.  **Webhook Node (Trigger):**
    *   Receives `email` and `password`.
2.  **Validation (e.g., Switch Node or IF Nodes):**
    *   Check for presence of `email` and `password`.
    *   If missing, use "Respond to Webhook" node with HTTP 400.
3.  **Get User (PostgreSQL Node):**
    *   Operation: Execute Query
    *   Query: `SELECT user_id, email, password_hash, first_name FROM users WHERE email = '{{ $json.body.email }}';`
4.  **IF Node (User Found?):**
    *   Condition: Check if PostgreSQL node returned a user.
    *   If false (no user), use "Respond to Webhook" node with HTTP 401 "Invalid email or password."
5.  **Verify Password (Code Node):**
    *   **Important:** Requires `bcryptjs`.
    *   Input: `items[0].json.body.password` (plain password), `items[0].json.password_hash` (from DB).
    *   Script (example):
        ```javascript
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(items[0].json.body.password, items[0].json.password_hash);
        return { isPasswordMatch: isMatch };
        ```
    *   Output: `isPasswordMatch` (boolean).
6.  **IF Node (Password Match?):**
    *   Condition: `{{ $item.json.isPasswordMatch }}` is true.
    *   If false, use "Respond to Webhook" node with HTTP 401 "Invalid email or password."
7.  **Generate JWT (Code Node):**
    *   **Important:** Requires `jsonwebtoken`. Store `JWT_SECRET` securely (n8n credential or environment variable).
    *   Input: `items[0].json.user_id`, `items[0].json.email` (from DB query result).
    *   Script (example):
        ```javascript
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET; // Or use n8n credentials: $credentials.JwtSecret.secret
        const expiresIn = '7d'; // Or configurable

        const payload = {
          userId: items[0].json.user_id,
          email: items[0].json.email
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn });
        return { jwtToken: token };
        ```
    *   Output: `jwtToken`.
8.  **Respond Success (Respond to Webhook Node):**
    *   Status Code: `200`
    *   Response Body (JSON):
        ```json
        {
          "message": "Login successful.",
          "token": "{{ $item.json.jwtToken }}",
          "userId": "{{ $item.json.user_id }}",
          "email": "{{ $item.json.email }}",
          "firstName": "{{ $item.json.first_name }}"
        }
        ```

---

### 3.2. Protecting Endpoints with JWT Verification

Any n8n workflow that handles sensitive data or actions (e.g., adding leads, fetching user-specific data) must be protected. The React Native app will send the JWT in the `Authorization` header for these requests.

**Standard JWT Verification Steps (to be added at the beginning of protected n8n workflows):**

1.  **Extract Token (Code Node or Core Node):**
    *   Get the `Authorization` header from the webhook request: `{{ $request.headers.authorization }}`.
    *   Check if the header exists and starts with "Bearer ".
    *   Extract the token part.
    *   If no token or invalid format, use "Respond to Webhook" node with HTTP 401 "Unauthorized: Missing or malformed token."
    *   Script (example in Code Node):
        ```javascript
        const authHeader = items[0].json.request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          // This error should ideally be caught and responded to by a Respond to Webhook node
          // For simplicity in this step, we might just let it error or set a flag
          // A more robust way is to branch to a Respond to Webhook node.
          throw new Error("Missing or malformed token");
        }
        const token = authHeader.split(' ')[1];
        return { token: token };
        ```

2.  **Verify JWT (Code Node):**
    *   **Important:** Requires `jsonwebtoken`. Use the same `JWT_SECRET` as in the Login workflow (from n8n credential or environment variable).
    *   Input: `items[0].json.token` (extracted token).
    *   Script (example):
        ```javascript
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET; // Or $credentials.JwtSecret.secret

        try {
          const decoded = jwt.verify(items[0].json.token, JWT_SECRET);
          // The decoded payload (e.g., { userId: 1, email: 'user@example.com', iat: ..., exp: ... })
          // is now available. We can pass it on.
          return { decodedToken: decoded, isAuthenticated: true };
        } catch (err) {
          // Token is invalid (e.g., expired, wrong signature)
          // This error should also lead to an HTTP 401 response.
          return { isAuthenticated: false, error: err.message };
        }
        ```
    *   Output: `decodedToken` (containing `userId`, `email`, etc.) and `isAuthenticated` (boolean).

3.  **IF Node (Check Authentication):**
    *   Condition: `{{ $item.json.isAuthenticated }}` is true.
    *   If false, use "Respond to Webhook" node with HTTP 401 "Unauthorized: Invalid or expired token."
    *   If true, the workflow can proceed. The `decodedToken.userId` can be used to fetch/modify data specific to the authenticated user.

---

### 3.3. MVP Feature Workflows

#### 3.3.1. Add Lead (Protected)

*   **Endpoint (n8n Webhook):** `POST /api/v1/leads`
*   **API Contract (React Native App -> n8n):**
    *   **Method:** `POST`
    *   **Headers:**
        *   `Content-Type: application/json`
        *   `Authorization: Bearer <your_jwt_here>`
    *   **Request Body (JSON):** (Lead details, e.g., `firstName`, `email`, `budget_min`, etc.)
        ```json
        {
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane.smith@example.com",
          "phone": "555-1234",
          "source": "Referral",
          // ... other lead fields
        }
        ```
*   **n8n Workflow Steps ("Add Lead"):**
    1.  **Webhook Node (Trigger):** Receives lead data and `Authorization` header.
    2.  **JWT Verification Steps (as outlined above):**
        *   Extract Token
        *   Verify JWT
        *   IF Node (Check Authentication)
            *   If not authenticated, respond 401.
            *   If authenticated, `decodedToken.userId` is available as `authUserId`.
    3.  **Validation of Lead Data (Switch/IF Nodes).**
    4.  **(Optional) AI Processing (OpenAI Node):**
        *   Generate `ai_summary`, suggest `priority` for the lead.
    5.  **Insert Lead (PostgreSQL Node):**
        *   Query:
            ```sql
            INSERT INTO leads (user_id, first_name, ..., ai_summary, priority, updated_at, created_at)
            VALUES ('{{ $item(-3).json.decodedToken.userId }}', '{{ $json.body.firstName }}', ..., '{{ $item(-1).json.ai_summary_output }}', '{{ $item(-1).json.ai_priority_output }}', NOW(), NOW())
            RETURNING lead_id;
            ```
            *(Note: `user_id` comes from the `decodedToken`. `updated_at` and `created_at` are set manually.)*
    6.  **Log Interaction (PostgreSQL Node):**
        *   Insert into `interactions` table (e.g., type "Lead Created", content "Lead added via mobile app").
    7.  **Respond Success (Respond to Webhook Node):**
        *   Status Code: `201`
        *   Response Body: `{ "message": "Lead added successfully.", "leadId": ... }`

This structure ensures that only authenticated users can access protected resources and perform actions. The `authUserId` from the JWT is crucial for associating data (like leads) with the correct user.

---

#### 3.3.2. View Leads (List - Protected)

**Purpose:** Allows an authenticated user to retrieve a list of their leads.
**Endpoint (n8n Webhook):** `GET /api/v1/leads`
    *   Optional Query Parameters: `?status=New&priority=High&page=1&limit=20&sortBy=created_at&sortOrder=DESC`

**API Contract (React Native App -> n8n):**
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <your_jwt_here>`
*   **Query Parameters (Optional):**
    *   `status`: Filter by lead status.
    *   `priority`: Filter by lead priority.
    *   `searchTerm`: For basic text search across name, email, notes.
    *   `page`: For pagination.
    *   `limit`: Number of items per page.
    *   `sortBy`: Field to sort by (e.g., `created_at`, `priority`, `last_name`).
    *   `sortOrder`: `ASC` or `DESC`.

**API Response (n8n -> React Native App):**
*   **Success (HTTP 200 OK):**
    ```json
    {
      "message": "Leads retrieved successfully.",
      "data": [
        {
          "leadId": 1,
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane.smith@example.com",
          "status": "New",
          "priority": "High",
          "aiSummary": "Interested in 3BR condos in downtown, budget $700k-$800k.",
          "createdAt": "2023-10-26T10:00:00Z"
        }
        // ... other leads
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 5,
        "totalItems": 98,
        "limit": 20
      }
    }
    ```
*   **Error (HTTP 401 Unauthorized):** (If JWT is invalid/missing)
    ```json
    { "error": "Unauthorized" }
    ```

**n8n Workflow Steps ("View Leads List"):**
1.  **Webhook Node (Trigger):** Receives GET request.
2.  **JWT Verification Steps (as outlined previously):**
    *   Extract Token, Verify JWT, IF Node (Check Auth).
    *   If not authenticated, respond 401. `authUserId` is available.
3.  **Build Query (Code Node or multiple Set Nodes):**
    *   Dynamically construct the `SELECT` query based on query parameters (`status`, `priority`, `searchTerm`, `sortBy`, `sortOrder`).
    *   Always include `WHERE user_id = '{{ $item(-1).json.decodedToken.userId }}'`.
    *   Handle pagination (`LIMIT` and `OFFSET`).
    *   Example for WHERE clause part:
        ```javascript
        let whereClauses = [`user_id = ${items[0].json.decodedToken.userId}`];
        const queryParams = items[0].json.request.query;
        if (queryParams.status) whereClauses.push(`status = '${queryParams.status}'`);
        // ... add other filters
        items[0].json.sqlWhereClause = whereClauses.join(' AND ');
        // Similar logic for ORDER BY, LIMIT, OFFSET
        ```
4.  **Get Leads (PostgreSQL Node):**
    *   Execute the dynamically constructed `SELECT` query.
    *   Example: `SELECT lead_id, first_name, last_name, email, status, priority, ai_summary, created_at FROM leads WHERE {{ $item.json.sqlWhereClause }} ORDER BY ... LIMIT ... OFFSET ...;`
5.  **Get Total Count for Pagination (PostgreSQL Node - Optional but good for UI):**
    *   Execute a `SELECT COUNT(*) FROM leads WHERE {{ $item.json.sqlWhereClauseWithoutPagination }};`
6.  **Format Response (Set Node / Respond to Webhook Node):**
    *   Construct the JSON response including `data` (array of leads) and `pagination` object.
    *   Status Code: `200`.

---

#### 3.3.3. View Lead Details (including AI Summary - Protected)

**Purpose:** Allows an authenticated user to retrieve full details for a specific lead.
**Endpoint (n8n Webhook):** `GET /api/v1/leads/{leadId}`

**API Contract (React Native App -> n8n):**
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <your_jwt_here>`
*   **Path Parameter:** `leadId` (the ID of the lead to retrieve).

**API Response (n8n -> React Native App):**
*   **Success (HTTP 200 OK):**
    ```json
    {
      "message": "Lead details retrieved successfully.",
      "data": {
        "leadId": 1,
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@example.com",
        "phone": "555-1234",
        "source": "Referral",
        "status": "New",
        "priority": "High",
        "budgetMin": 700000,
        "budgetMax": 800000,
        "desiredLocation": "Downtown",
        "propertyType": "Condo",
        "bedroomsMin": 3,
        "notes": "Looking for a quick move.",
        "aiSummary": "Interested in 3BR condos in downtown, budget $700k-$800k.",
        "createdAt": "2023-10-26T10:00:00Z",
        "updatedAt": "2023-10-26T10:00:00Z"
        // ... all relevant fields from leads table
      }
    }
    ```
*   **Error (HTTP 401 Unauthorized):**
*   **Error (HTTP 404 Not Found):** If lead doesn't exist or doesn't belong to the user.

**n8n Workflow Steps ("View Lead Detail"):**
1.  **Webhook Node (Trigger):** Receives GET request. Path parameter `leadId` available via `{{ $request.params.leadId }}`.
2.  **JWT Verification Steps.** `authUserId` is available.
3.  **Get Lead Detail (PostgreSQL Node):**
    *   Query: `SELECT * FROM leads WHERE lead_id = '{{ $request.params.leadId }}' AND user_id = '{{ $item(-1).json.decodedToken.userId }}';`
4.  **IF Node (Lead Found and Belongs to User?):**
    *   Condition: Check if PostgreSQL node returned a result.
    *   If false, use "Respond to Webhook" node with HTTP 404.
5.  **Respond Success (Respond to Webhook Node):**
    *   Status Code: `200`.
    *   Response Body: Construct JSON with `message` and `data` (the lead object).

---

#### 3.3.4. Update Lead Status (Protected)

**Purpose:** Allows an authenticated user to update the status of one of their leads.
**Endpoint (n8n Webhook):** `PUT /api/v1/leads/{leadId}/status` (or `PATCH /api/v1/leads/{leadId}`)

**API Contract (React Native App -> n8n):**
*   **Method:** `PUT` (or `PATCH`)
*   **Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <your_jwt_here>`
*   **Path Parameter:** `leadId`.
*   **Request Body (JSON):**
    ```json
    {
      "status": "Contacted" // New status
    }
    ```

**API Response (n8n -> React Native App):**
*   **Success (HTTP 200 OK):**
    ```json
    {
      "message": "Lead status updated successfully.",
      "data": { // Optionally return the updated lead
        "leadId": 1,
        "status": "Contacted",
        "updatedAt": "2023-10-27T11:00:00Z"
      }
    }
    ```
*   **Error (HTTP 400 Bad Request):** If status is invalid.
*   **Error (HTTP 401 Unauthorized):**
*   **Error (HTTP 404 Not Found):**

**n8n Workflow Steps ("Update Lead Status"):**
1.  **Webhook Node (Trigger):** Receives PUT/PATCH request. `leadId` from path, `status` from body.
2.  **JWT Verification Steps.** `authUserId` is available.
3.  **Validate New Status (IF/Switch Node or Function Node):**
    *   Check if `{{ $json.body.status }}` is a valid status value (e.g., from a predefined list).
    *   If invalid, use "Respond to Webhook" node with HTTP 400.
4.  **Update Lead Status (PostgreSQL Node):**
    *   Query:
        ```sql
        UPDATE leads
        SET status = '{{ $json.body.status }}', updated_at = NOW()
        WHERE lead_id = '{{ $request.params.leadId }}' AND user_id = '{{ $item(-1).json.decodedToken.userId }}'
        RETURNING lead_id, status, updated_at;
        ```
        *(Ensure `updated_at` is set manually.)*
5.  **IF Node (Update Successful?):**
    *   Check if the UPDATE query affected any rows (i.e., lead existed and belonged to user). PostgreSQL `RETURNING` clause helps here. If `RETURNING` has data, it was successful.
    *   If no rows affected (or `RETURNING` is empty), respond with HTTP 404.
6.  **Log Interaction (PostgreSQL Node):**
    *   Insert into `interactions` table: `type = 'Status Change'`, `content = 'Status changed to {{ $json.body.status }}'`, `lead_id` from path, `user_id` from JWT.
7.  **Respond Success (Respond to Webhook Node):**
    *   Status Code: `200`.
    *   Response Body: Construct JSON with `message` and `data` (updated lead info).

This covers the core MVP features. Further enhancements could include more complex filtering, full CRUD for leads, task management, etc.
