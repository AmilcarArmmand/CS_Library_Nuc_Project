# Database seeder file.

# Run this ONCE after setting up the project to pre-populate
# the database with all real books from the shelves and the
# three test accounts.

# It is safe to re-run — books and users that already exist are skipped (no duplicates, no errors).

import sqlite3
import bcrypt
from pathlib import Path

DB_PATH = Path(__file__).parent / "cs_library.db"


# LOCAL BOOK CACHE
# This cache contains the real books we scanned from Shelves 1-5.

BOOKS = [
    # Shelf 1
    ("0471170828",    "Applied Regression Analysis",           "Draper & Smith",       "https://covers.openlibrary.org/b/isbn/0471170828-L.jpg",    "Available", "Shelf 1"),
    ("0517887290",    "Fingerprints of the Gods",              "Graham Hancock",        "https://covers.openlibrary.org/b/isbn/0517887290-L.jpg",    "Available", "Shelf 1"),
    # Shelf 2
    ("9780073523262", "Computer Networks: A Top Down Approach","Behrouz A. Forouzan",  "https://covers.openlibrary.org/b/isbn/9780073523262-L.jpg", "Available", "Shelf 2"),
    ("0321269675",    "Using UML",                             "Perdita Stevens",       "https://covers.openlibrary.org/b/isbn/0321269675-L.jpg",    "Available", "Shelf 2"),
    ("9781491960202", "Learning Web Design",                   "Jennifer Robbins",      "https://covers.openlibrary.org/b/isbn/9781491960202-L.jpg", "Available", "Shelf 2"),
    ("9781783982141", "Kali Linux Network Scanning",           "Justin Hutchens",       "https://covers.openlibrary.org/b/isbn/9781783982141-L.jpg", "Available", "Shelf 2"),
    ("1590593898",    "Joel on Software",                      "Joel Spolsky",          "https://covers.openlibrary.org/b/isbn/1590593898-L.jpg",    "Available", "Shelf 2"),
    # Shelf 3
    ("9781782163121", "Mastering Kali Linux",                  "Robert W. Beggs",       "https://covers.openlibrary.org/b/isbn/9781782163121-L.jpg", "Available", "Shelf 3"),
    ("0471098779",    "Elements of Cartography",               "Robinson et al.",       "https://covers.openlibrary.org/b/isbn/0471098779-L.jpg",    "Available", "Shelf 3"),
    ("0131478230",    "Practical Guide to Linux",              "Mark G. Sobell",        "https://covers.openlibrary.org/b/isbn/0131478230-L.jpg",    "Available", "Shelf 3"),
    ("076372677X",    "Information Security Illuminated",      "Solomon & Chapple",     "https://covers.openlibrary.org/b/isbn/076372677X-L.jpg",    "Available", "Shelf 3"),
    ("0596005458",    "Security Warrior",                      "Peikari & Chuvakin",    "https://covers.openlibrary.org/b/isbn/0596005458-L.jpg",    "Available", "Shelf 3"),
    # Shelf 4
    ("0030977177",    "World Regional Geography",              "Wheeler & Kostbade",    "https://covers.openlibrary.org/b/id/6463996-L.jpg",         "Available", "Shelf 4"),
    ("0314004246",    "Physical Geography Manual",             "West Publishing",       "https://covers.openlibrary.org/b/id/11145828-L.jpg",        "Available", "Shelf 4"),
    # Shelf 5
    ("0671492071",    "Alan Turing: The Enigma",               "Andrew Hodges",         "https://covers.openlibrary.org/b/isbn/0671492071-L.jpg",    "Available", "Shelf 5"),
    ("0321534964",    "The Art of Computer Programming",       "Donald Knuth",          "https://covers.openlibrary.org/b/isbn/0321534964-L.jpg",    "Available", "Shelf 5"),
]


# TEST ACCOUNTS
# NEW: Added 'id' key inside each user dict so current_user['id'] works in main.py (US006)

TEST_USERS = [
    (12345, "Kenneth Molina",  "molinak4@southernct.edu",    "changeme123"),
    (11111, "Jose Gaspar",     "gasparmarij1@southernct.edu","changeme123"),
    (99999, "Professor James", "james@southernct.edu",        "changeme123"),
]


# SEEDING FUNCTION
def seed():
    if not DB_PATH.exists():
        print("X  cs_library.db not found.")
        print("   Run main.py first so init_db() creates it, then re-run this script.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    # Ensure shelf column exists (safe migration)
    cols = [row[1] for row in conn.execute("PRAGMA table_info(books)").fetchall()]
    if "shelf" not in cols:
        conn.execute("ALTER TABLE books ADD COLUMN shelf TEXT NOT NULL DEFAULT ''")
        conn.commit()
        print("  Migrated: added 'shelf' column to books table.")

    # Seed books
    books_added = 0
    books_skipped = 0
    for isbn, title, author, cover, status, shelf in BOOKS:
        existing = conn.execute(
            "SELECT isbn FROM books WHERE isbn = ?", (isbn,)
        ).fetchone()
        if existing:
            books_skipped += 1
            continue
        conn.execute(
            "INSERT INTO books (isbn, title, author, cover, status, shelf) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (isbn, title, author, cover, status, shelf),
        )
        books_added += 1

    conn.commit()
    print(f"  Books: {books_added} added, {books_skipped} already existed -- skipped.")

    # Seed test users with explicit IDs
    users_added = 0
    users_skipped = 0
    for user_id, name, email, password in TEST_USERS:
        # Skip if this ID or email already exists
        existing = conn.execute(
            "SELECT id FROM users WHERE student_id = ? OR email = ? COLLATE NOCASE",
            (user_id, email),
        ).fetchone()
        if existing:
            users_skipped += 1
            continue

        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        conn.execute(
            "INSERT INTO users (student_id, name, email, password_hash, active) "
            "VALUES (?, ?, ?, ?, 1)",
            (str(user_id), name, email.lower(), pw_hash),
        )
        users_added += 1

    conn.commit()
    conn.close()

    print(f"  Users: {users_added} added, {users_skipped} already existed -- skipped.")

    if users_added > 0:
        print()
        print("  Test account credentials:")
        print(f"  {'ID':<8} {'Name':<22} {'Email':<35} Password")
        print(f"  {'-'*8} {'-'*22} {'-'*35} {'-'*12}")
        for user_id, name, email, password in TEST_USERS:
            print(f"  {user_id:<8} {name:<22} {email:<35} {password}")

    print()
    print("Seeding complete.")


if __name__ == "__main__":
    seed()