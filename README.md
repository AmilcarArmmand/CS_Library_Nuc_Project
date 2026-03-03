# CS-Library-Project

A secure library kiosk system built for the Computer Science Department at SCSU utilizing Python and NiceGUI. 

This project allows students to browse the library catalog, check out books, view their borrowing history, and return items. It features real-time book metadata retrieval from Open Library, and secure user authentication.

---

## Features

- **Two Authentication Systems:** 
  - Login by scanning a Student ID barcode.
  - Login via secure Email & Password (with bcrypt hashing).
- **Interactive Catalog:** 
  - Browse available books with a paginated grid layout.
  - Real-time search by Title or Author.
- **Kiosk Checkout Cart:** 
  - A self-checkout kiosk by scanning ISBN numbers.
  - Add multiple books to a cart and check them out at once.
- **My Books Dashboard:** 
  - View all active loans and exact due dates.
  - Renew books directly from the interface.
  - See complete borrowing history, including past returns.
- **Automated Book Metadata:**
  - When scanning a new book (ISBN), the system automatically queries the **Open Library API** to retrieve the title and author, saving it to the local cache for future lookups.

---

## Technology Stack

- **Frontend / UI:** [NiceGUI](https://nicegui.io/) (Vue3 & Tailwind CSS under the hood)
- **Backend Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Integrated with NiceGUI)
- **Database:** SQLite3 (`cs_library.db`)
- **Password Hashing:** `bcrypt`
- **HTTP Client for API Calls:** `httpx`

---

## Setup & Installation

### 1. Clone the Repository
Open a terminal and clone the repository, then navigate into the directory:
```bash
git clone <repository-url>
cd cs-library-kiosk
```

### 2. Create an Virtual Environment

```bash
python3 -m venv venv
```

### 3. Activate the Virtual Environment
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows:**
  ```bash
  venv\Scripts\activate
  ```

### 4. Install Dependencies
Install all required libraries using pip:
```bash
pip install -r requirements.txt
```

---

## Database Seeding (First-Time Setup)

Before running the application for the first time, you must populate the database with the initial catalog of books and pre-configured test accounts.

Run the seeder file:
```bash
python3 mock_data.py
```
*Note: This creates the `cs_library.db` file in your project directory.

### Test Accounts Available:

| Name | Email | Student ID | Password |
|---|---|---|---|
| Kenneth Molina | molinak4@southernct.edu | `12345` | `changeme123` |
| John Test | user2@example.com | `88888` | `changeme123` |
| Admin Setup | admin@example.com | `99999` | `changeme123` |

---

## Running the Kiosk

Once the dependencies are installed and the database is seeded, start the Python server:

```bash
python3 main.py
```

The terminal will launch the NiceGUI server. You can access the application by navigating to:
**[http://localhost:8080](http://localhost:8080)**

---


## Maintainers
Created as part of the SCSU Capstone.

