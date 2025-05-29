# 🧪 Barrel Monitor API Tests

Automated API test suite for the **Barrel Monitor** public API using [Playwright](https://playwright.dev/).  
Covers both **positive** and **negative** scenarios for barrel 
and measurement management endpoints (`/barrels`, `/measurement`).

---

## 📦 Features

- ✅ Create / Read / Delete barrel scenarios
- ❌ Validation error tests for missing or invalid input
- 🔁 Concurrent request testing
- 🔥 Input sanitation and security edge cases
- 🔧 Eslint to assure code structure

---

## ⚙️ System Requirements
| Requirement | Version                                       |
|-------------|-----------------------------------------------|
| Node.js     | `>=18.18` (LTS recommended)                   |
| npm / yarn  | Any supported version                         |
| OS          | Windows 10+, Ubuntu 22.04+, macOS 14 or later |

---

## 🛠️ Configuration

The project uses dotenv to manage environment variables.

- The `BASE_URL` environment variable defines the root URL for the API under test.

- This value is used throughout the test suite via `process.env.BASE_URL`.

Example .env:
```
BASE_URL=https://to-barrel-monitor.azurewebsites.net
```

---

## ✅ Coverage
This test suite includes:

- Barrel and measurement creation with valid data
- Missing or malformed input scenarios
- XSS and SQLi-like input checks
- Concurrent barrel creation
- CRUD operation validation
- Request method validation
- Header/content-type validation
- Strict schema enforcement

---

## 🚀 Getting Started

1. **Clone the repo:**

   ```bash
   git clone https://github.com/your-org/barrel-api-tests.git
   cd barrel-api-tests

2. **Install dependencies:**

    ```bash
    npm install
   
3. **Run the tests:**

    ```bash
    npx playwright test

4. **Run specific test file:**

    ```bash
    npx playwright test tests/barrels.positive.spec.ts
   
Running tests will open HTML report. To open interactive mode use:
   ```bash
     npx playwright test --ui

