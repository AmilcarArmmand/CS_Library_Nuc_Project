# Database module.
# Uses SQLite with bcrypt for password hashing.
# The SQLite file (cs_library.db) is created on first run.

import sqlite3
import httpx
import bcrypt
import asyncio
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DB_PATH = PROJECT_ROOT / "data" / "cs_library.db"
ASSETS_DIR = PROJECT_ROOT / "assets"
COVER_CACHE_DIR = ASSETS_DIR / "covers"

# set False to disable live Open Library lookups (offline/testing mode)
USE_LIVE_API = True


# helpers

def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _row(row) -> Optional[dict]:
    return dict(row) if row else None


def _normalize_cover_url(cover: str, isbn: str = "") -> str:
    """Normalize remote cover URLs for faster card rendering."""
    url = (cover or "").strip()
    if url.startswith("/assets/"):
        if isbn and not _cover_cache_file(isbn).exists():
            return f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"
        return url
    if not url and isbn:
        return f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg"

    if "covers.openlibrary.org" in url:
        url = re.sub(r"-(?:L|S)(\.[A-Za-z0-9]+)$", r"-M\1", url)

    return url


def _cover_cache_name(isbn: str) -> str:
    safe = re.sub(r"[^0-9A-Za-zXx-]", "", (isbn or "").strip())
    return f"{safe or 'unknown'}.jpg"


def _cover_cache_file(isbn: str) -> Path:
    return COVER_CACHE_DIR / _cover_cache_name(isbn)


def _cover_asset_path(isbn: str) -> str:
    return f"/assets/covers/{_cover_cache_name(isbn)}"


def _resolve_cover_for_output(cover: str, isbn: str = "") -> str:
    url = _normalize_cover_url(cover, isbn)
    if isbn and _cover_cache_file(isbn).exists():
        return _cover_asset_path(isbn)
    return url


def _write_bytes_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(content)
    tmp.replace(path)


async def _download_cover(url: str, isbn: str, client: httpx.AsyncClient) -> bool:
    if not isbn:
        return False
    dest = _cover_cache_file(isbn)
    if dest.exists():
        return True
    if not url.startswith(("http://", "https://")):
        return False

    try:
        response = await client.get(url)
    except Exception:
        return False

    if response.status_code != 200 or not response.content:
        return False

    content_type = (response.headers.get("content-type") or "").lower()
    if content_type and not content_type.startswith("image/"):
        return False

    try:
        await asyncio.to_thread(_write_bytes_atomic, dest, response.content)
    except Exception:
        return False

    return True


async def warm_cover_cache(max_concurrency: int = 6) -> dict:
    """Best-effort cover cache warmup to reduce runtime card image latency."""

    def _fetch():
        with _connect() as conn:
            rows = conn.execute("SELECT isbn, cover FROM books").fetchall()
        return [dict(r) for r in rows]

    rows = await _run(_fetch)
    if not rows:
        return {"total": 0, "cached": 0, "downloaded": 0, "failed": 0, "skipped": 0}

    COVER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(max(1, int(max_concurrency)))
    stats = {"total": len(rows), "cached": 0, "downloaded": 0, "failed": 0, "skipped": 0}

    headers = {"User-Agent": "SCSU_CS_Library_Kiosk/1.0 (cover-cache)"}
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=headers) as client:

        async def _worker(book: dict) -> None:
            isbn = (book.get("isbn") or "").strip()
            if not isbn:
                stats["skipped"] += 1
                return

            if _cover_cache_file(isbn).exists():
                stats["cached"] += 1
                return

            url = _normalize_cover_url(book.get("cover", ""), isbn)
            if not url.startswith(("http://", "https://")):
                stats["skipped"] += 1
                return

            async with semaphore:
                ok = await _download_cover(url, isbn, client)
            if ok:
                stats["downloaded"] += 1
            else:
                stats["failed"] += 1

        await asyncio.gather(*(_worker(row) for row in rows))

    return stats


async def _run(fn):
    """Run a blocking SQLite call off the event loop thread."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn)


# initial schema setup

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


# authentication method

async def register_user(name: str, email: str, student_id: str, password: str) -> Optional[dict]:
    """Hash the password and insert a new user. Returns user dict or None if email/student_id taken."""

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
            return None

    return await _run(_insert)


async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """Check email + password. Returns user dict on success, else None."""

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
    """Look up a user by their student_id for scanner login."""
    def _fetch():
        with _connect() as conn:
            row = conn.execute(
                "SELECT id, name, email, student_id, active FROM users WHERE student_id = ?",
                (str(student_id_input).strip(),)
            ).fetchone()
        return _row(row)

    return await _run(_fetch)


async def get_user_by_account_id(user_id: int) -> Optional[dict]:
    """Look up a user by their primary key for session restoration."""

    def _fetch():
        with _connect() as conn:
            row = conn.execute(
                "SELECT id, name, email, student_id, active FROM users WHERE id = ?",
                (int(user_id),)
            ).fetchone()
        return _row(row)

    return await _run(_fetch)



# BOOKS

async def _fetch_from_open_library(isbn: str) -> Optional[dict]:
    """Fetch book metadata from Open Library and cache it locally."""

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
        cover_data = book_data.get("cover") or {}
        book = {
            "isbn":   isbn,
            "title":  book_data.get("title", "Unknown Title"),
            "author": (book_data.get("authors") or [{"name": "Unknown"}])[0]["name"],
            "cover":  _normalize_cover_url(
                cover_data.get("medium")
                or cover_data.get("large")
                or f"https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg",
                isbn,
            ),
            "status": "Available",
            "shelf":  "",
        }


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
        book["cover"] = _resolve_cover_for_output(book["cover"], isbn)
        return book

    except httpx.TimeoutException:
        print(f" [API] Timeout looking up ISBN {isbn}.")
        return None
    except Exception as e:
        print(f" [API] Error looking up ISBN {isbn}: {e}")
        return None


async def get_book(isbn: str) -> Optional[dict]:
    """Fetch a single book by ISBN. Checks local DB first, then Open Library."""
    isbn = isbn.strip()


    def _fetch():
        with _connect() as conn:
            row = conn.execute(
                "SELECT * FROM books WHERE isbn = ?", (isbn,)
            ).fetchone()
        return _row(row)

    book = await _run(_fetch)

    if book:
        book["cover"] = _resolve_cover_for_output(book.get("cover", ""), isbn)
        print(f" [DB] Found ISBN {isbn} in local database.")
        return book


    if USE_LIVE_API:
        print(f" [MISS] ISBN {isbn} not in DB — querying Open Library...")
        return await _fetch_from_open_library(isbn)

    return None


async def get_catalog() -> list:
    """Return all books ordered by title."""
    def _fetch():
        with _connect() as conn:
            rows = conn.execute("SELECT * FROM books ORDER BY title").fetchall()
        books = [dict(r) for r in rows]
        for book in books:
            book["cover"] = _resolve_cover_for_output(book.get("cover", ""), book.get("isbn", ""))
        return books

    return await _run(_fetch)


async def add_book(isbn: str, title: str, author: str, cover: str = "") -> bool:
    """Insert a new book. Returns True on success, False if the ISBN already exists."""
    normalized_cover = _normalize_cover_url(cover, isbn)

    def _insert():
        try:
            with _connect() as conn:
                conn.execute(
                    "INSERT INTO books (isbn, title, author, cover) VALUES (?, ?, ?, ?)",
                    (isbn, title, author, normalized_cover),
                )
                conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    return await _run(_insert)



# check out / return system

async def checkout_books(books: list, user_id: int) -> int:
    """Mark available books as checked out and create loan records. Returns the number successfully checked out."""

    due = datetime.now() + timedelta(days=14)

    def _checkout() -> int:
        checked_out = 0
        seen_isbns = set()

        with _connect() as conn:
            for book in books:
                isbn = str(book.get("isbn") or "").strip()
                if not isbn or isbn in seen_isbns:
                    continue
                seen_isbns.add(isbn)

                row = conn.execute(
                    "SELECT status FROM books WHERE isbn = ?",
                    (isbn,),
                ).fetchone()
                if row is None or row["status"] != "Available":
                    continue

                updated = conn.execute(
                    "UPDATE books SET status = 'Checked Out' WHERE isbn = ? AND status = 'Available'",
                    (isbn,),
                )
                if updated.rowcount != 1:
                    continue

                conn.execute(
                    "INSERT INTO loans (user_id, isbn, due_date) VALUES (?, ?, ?)",
                    (user_id, isbn, due)
                )
                checked_out += 1

            conn.commit()

        return checked_out

    return await _run(_checkout)


async def return_book(isbn: str) -> bool:
    """Mark a book as Available and close its open loan."""

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


# my books

async def get_user_loans(user_id: int) -> list:
    """Return all loans for a user, joined with book info."""

    def _fetch():
        with _connect() as conn:
            rows = conn.execute('''
                SELECT
                    l.id, l.returned, l.due_date, l.returned_date,
                    b.isbn, b.title, b.author, b.cover
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
            d["cover"] = _resolve_cover_for_output(d.get("cover", ""), d.get("isbn", ""))
            result.append(d)
        return result

    return await _run(_fetch)
