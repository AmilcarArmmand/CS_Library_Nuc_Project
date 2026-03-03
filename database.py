# The database.
# New dependency. bcrypt. This is used to hash the passwords. I have added it to the requirements.txt file.
# Note that the SQLite file (cs_library.db) is automatically created on first run.
# It will be stored in the same directory as this file.

import sqlite3
import httpx
import bcrypt
import asyncio
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

DB_PATH = Path(__file__).parent / "cs_library.db"

# Set False to disable live Open Library lookups (offline/testing mode)
USE_LIVE_API = True


# HELPERS

def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _row(row) -> Optional[dict]:
    return dict(row) if row else None


async def _run(fn):
    """Run a blocking SQLite call off the event loop thread."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn)


# INITIAL SCHEMA SETUP

def init_db() -> None:
    with _connect() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id    TEXT    NOT NULL UNIQUE,
                name          TEXT    NOT NULL,
                email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT    NOT NULL,
                active        INTEGER NOT NULL DEFAULT 1,
                created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS books (
                isbn    TEXT PRIMARY KEY,
                title   TEXT NOT NULL,
                author  TEXT NOT NULL,
                cover   TEXT NOT NULL DEFAULT "",
                status  TEXT NOT NULL DEFAULT "Available",
                shelf   TEXT NOT NULL DEFAULT ""
            );

            CREATE TABLE IF NOT EXISTS loans (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id       INTEGER NOT NULL REFERENCES users(id),
                isbn          TEXT    NOT NULL REFERENCES books(isbn),
                checked_out   DATETIME DEFAULT CURRENT_TIMESTAMP,
                due_date      DATETIME NOT NULL,
                returned      INTEGER  NOT NULL DEFAULT 0,
                returned_date DATETIME
            );
        ''')
        conn.commit()


# AUTHENTICATION METHOD

async def register_user(name: str, email: str, student_id: str, password: str) -> Optional[dict]:
    # Hash the password and insert a new user row.
    # Returns the user dict on success, or None if the email or student ID is already taken.

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def _insert():
        try:
            with _connect() as conn:
                cur = conn.execute(
                    "INSERT INTO users (name, email, student_id, password_hash) VALUES (?, ?, ?, ?)",
                    (name.strip(), email.strip().lower(), student_id.strip(), pw_hash),
                )
                conn.commit()
                row = conn.execute(
                    "SELECT id, name, email, student_id, active FROM users WHERE id = ?",
                    (cur.lastrowid,)
                ).fetchone()
                return _row(row)
        except sqlite3.IntegrityError:
            return None  # email already exists

    return await _run(_insert)


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    
    # Check email + password.
    # Returns user dict on success (with keys: id, name, email, active), else None.

    def _check():
        with _connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ?",
                (email.strip().lower(),)
            ).fetchone()
        if row is None:
            return None
        if bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
            return {"id": row["id"], "name": row["name"], "student_id": row["student_id"],
                    "email": row["email"], "active": bool(row["active"])}
        return None

    return await _run(_check)


async def get_user_by_id(student_id_input: str) -> Optional[dict]:
    
    # Look up a user by their student_id (used by the student ID scanner login).
    # Returns user dict with keys: id, name, email, student_id, active — or None if not found.
    def _fetch():
        with _connect() as conn:
            row = conn.execute(
                "SELECT id, name, email, student_id, active FROM users WHERE student_id = ?",
                (str(student_id_input).strip(),)
            ).fetchone()
        return _row(row)

    return await _run(_fetch)



# BOOKS

async def _fetch_from_open_library(isbn: str) -> Optional[dict]:
    # Hit the Open Library Books API for a single ISBN.
    # On success, saves the result to the local DB so future lookups are instant.
    # Returns a book dict or None if not found / network error.

    url = (
        f"https://openlibrary.org/api/books"
        f"?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    )
    headers = {"User-Agent": "SCSU_CS_Library_Kiosk/1.0 (molinak4@southernct.edu)"}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, headers=headers)

        if response.status_code != 200:
            print(f" [API] Non-200 response for {isbn}: {response.status_code}")
            return None

        data = response.json()
        key = f"ISBN:{isbn}"

        if key not in data:
            print(f" [API] ISBN {isbn} not found in Open Library.")
            return None

        book_data = data[key]
        book = {
            "isbn":   isbn,
            "title":  book_data.get("title", "Unknown Title"),
            "author": (book_data.get("authors") or [{"name": "Unknown"}])[0]["name"],
            "cover":  book_data.get("cover", {}).get(
                          "large",
                          f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
                      ),
            "status": "Available",
            "shelf":  "",
        }

        # Persist to the DB so the next scan is instant
        def _save():
            try:
                with _connect() as conn:
                    conn.execute(
                        "INSERT OR IGNORE INTO books "
                        "(isbn, title, author, cover, status, shelf) "
                        "VALUES (?, ?, ?, ?, ?, ?)",
                        (book["isbn"], book["title"], book["author"],
                         book["cover"], book["status"], book["shelf"]),
                    )
                    conn.commit()
            except Exception as e:
                print(f" [DB] Could not cache book {isbn}: {e}")

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _save)

        print(f" [API] Fetched and cached '{book['title']}' from Open Library.")
        return book

    except httpx.TimeoutException:
        print(f" [API] Timeout looking up ISBN {isbn}.")
        return None
    except Exception as e:
        print(f" [API] Error looking up ISBN {isbn}: {e}")
        return None

# Fetch a single book by ISBN.
async def get_book(isbn: str) -> Optional[dict]:
    
    # Lookup order:
    # 1. Local SQLite DB  (instant)
    # 2. Open Library API (if USE_LIVE_API is True and book not in DB)
    # Results are saved to DB automatically for next time

    # Returns a book dict or None.
    isbn = isbn.strip()

    # 1. Check the local DB first
    def _fetch():
        with _connect() as conn:
            row = conn.execute(
                "SELECT * FROM books WHERE isbn = ?", (isbn,)
            ).fetchone()
        return _row(row)

    book = await _run(_fetch)

    if book:
        print(f" [DB] Found ISBN {isbn} in local database.")
        return book

    # 2. Fall back to Open Library
    if USE_LIVE_API:
        print(f" [MISS] ISBN {isbn} not in DB — querying Open Library...")
        return await _fetch_from_open_library(isbn)

    return None


async def get_catalog() -> list:
    """Return all books ordered by title."""
    def _fetch():
        with _connect() as conn:
            rows = conn.execute("SELECT * FROM books ORDER BY title").fetchall()
        return [dict(r) for r in rows]

    return await _run(_fetch)


async def add_book(isbn: str, title: str, author: str, cover: str = "") -> bool:
    """Insert a new book. Returns True on success, False if the ISBN already exists."""
    def _insert():
        try:
            with _connect() as conn:
                conn.execute(
                    "INSERT INTO books (isbn, title, author, cover) VALUES (?, ?, ?, ?)",
                    (isbn, title, author, cover),
                )
                conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    return await _run(_insert)



# CHECK OUT / RETURN SYSTEM

async def checkout_books(books: list, user_id: int) -> None:
    # Mark each book as 'Checked Out' and create a loan record.
    # Default Due date: 14 days from now. Change as needed.

    due = datetime.now() + timedelta(days=14)

    def _checkout():
        with _connect() as conn:
            for book in books:
                conn.execute(
                    "UPDATE books SET status = 'Checked Out' WHERE isbn = ?",
                    (book["isbn"],)
                )
                conn.execute(
                    "INSERT INTO loans (user_id, isbn, due_date) VALUES (?, ?, ?)",
                    (user_id, book["isbn"], due)
                )
            conn.commit()

    await _run(_checkout)


async def return_book(isbn: str) -> bool:

    # Mark a book as Available and close its open loan.
    # Returns True if a loan was found and closed, False otherwise.

    def _return():
        now = datetime.now()
        with _connect() as conn:
            loan = conn.execute(
                "SELECT id FROM loans WHERE isbn = ? AND returned = 0 "
                "ORDER BY checked_out DESC LIMIT 1",
                (isbn,)
            ).fetchone()
            if loan is None:
                return False
            conn.execute(
                "UPDATE loans SET returned = 1, returned_date = ? WHERE id = ?",
                (now, loan["id"])
            )
            conn.execute(
                "UPDATE books SET status = 'Available' WHERE isbn = ?", (isbn,)
            )
            conn.commit()
        return True

    return await _run(_return)


async def renew_book(loan_id: int) -> bool:
    """Extend the due date of an active loan by 14 days from today."""
    def _renew():
        now = datetime.now()
        new_due_date = now + timedelta(days=14)
        with _connect() as conn:
            # First, check if the loan exists and is active (not returned)
            loan = conn.execute(
                "SELECT id FROM loans WHERE id = ? AND returned = 0",
                (loan_id,)
            ).fetchone()
            
            if loan is None:
                return False
                
            conn.execute(
                "UPDATE loans SET due_date = ? WHERE id = ?",
                (new_due_date, loan_id)
            )
            conn.commit()
        return True

    return await _run(_renew)


# MY BOOKS

async def get_user_loans(user_id: int) -> list:

    # Return all loans for a user, joined with book info.
    # Each dict has: title, author, cover, due_date (datetime),
    # returned (bool), returned_date (datetime | None).

    def _fetch():
        with _connect() as conn:
            rows = conn.execute('''
                SELECT
                    l.id, l.returned, l.due_date, l.returned_date,
                    b.title, b.author, b.cover
                FROM loans l
                JOIN books b ON l.isbn = b.isbn
                WHERE l.user_id = ?
                ORDER BY l.checked_out DESC
            ''', (user_id,)).fetchall()

        result = []
        for r in rows:
            d = dict(r)
            for col in ("due_date", "returned_date"):
                val = d.get(col)
                if isinstance(val, str) and val:
                    try:
                        d[col] = datetime.fromisoformat(val)
                    except ValueError:
                        pass
            d["returned"] = bool(d["returned"])
            result.append(d)
        return result

    return await _run(_fetch)