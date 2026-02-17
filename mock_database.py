import asyncio

# --- FAKE DATA (This replaces the SQL for now) ---
FAKE_USERS = {
    "123": {"name": "Taylor (Student)", "role": "Student", "active": True},
    "999": {"name": "Prof. James", "role": "Admin", "active": True},
    "000": {"name": "Banned User", "role": "Student", "active": False}
}

FAKE_BOOKS = {
    "978-0132350884": {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "cover": "https://m.media-amazon.com/images/I/41xShlnTZTL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
        "status": "Available"
    },
    "978-0262033848": {
        "title": "Introduction to Algorithms",
        "author": "Thomas H. Cormen",
        "cover": "https://m.media-amazon.com/images/I/41SNoh5ZhOL._SX218_BO1,204,203,200_QL40_FMwebp_.jpg",
        "status": "Checked Out"
    }
}

# --- ASYNC FUNCTIONS (Matches aiosqlite pattern) ---
# We use 'async' here so it feels exactly like the real database will later.

async def get_user(student_id):
    """Simulates looking up a user in the DB"""
    await asyncio.sleep(0.5) # Fake network delay (0.5s)
    return FAKE_USERS.get(student_id)

async def get_book(isbn):
    """Simulates looking up a book in the DB"""
    await asyncio.sleep(0.5) 
    return FAKE_BOOKS.get(isbn)

async def checkout_book(student_id, isbn):
    """Simulates the checkout process"""
    await asyncio.sleep(1)
    if isbn in FAKE_BOOKS:
        FAKE_BOOKS[isbn]['status'] = 'Checked Out'
        return True
    return False