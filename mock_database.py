import asyncio
import httpx 
from datetime import datetime, timedelta # NEW: needed for due dates in loans (US006)


USE_LIVE_API = True 


# This cache contains the real books we scanned from Shelves 1-5.
local_book_cache = {
    # --- Shelf 1 ---
    "0471170828": {
        "title": "Applied Regression Analysis",
        "author": "Draper & Smith",
        "cover": "https://covers.openlibrary.org/b/isbn/0471170828-L.jpg",
        "status": "Available",
        "isbn": "0471170828",
        "shelf": "Shelf 1"
    },
    "0517887290": {
        "title": "Fingerprints of the Gods",
        "author": "Graham Hancock",
        "cover": "https://covers.openlibrary.org/b/isbn/0517887290-L.jpg",
        "status": "Available",
        "isbn": "0517887290",
        "shelf": "Shelf 1"
    },
    
    # --- Shelf 2 ---
    "9780073523262": {
        "title": "Computer Networks: A Top Down Approach",
        "author": "Behrouz A. Forouzan",
        "cover": "https://covers.openlibrary.org/b/isbn/9780073523262-L.jpg",
        "status": "Available",
        "isbn": "9780073523262",
        "shelf": "Shelf 2"
    },
    "0321269675": {
        "title": "Using UML",
        "author": "Perdita Stevens",
        "cover": "https://covers.openlibrary.org/b/isbn/0321269675-L.jpg",
        "status": "Available",
        "isbn": "0321269675",
        "shelf": "Shelf 2"
    },
    "9781491960202": {
        "title": "Learning Web Design",
        "author": "Jennifer Robbins",
        "cover": "https://covers.openlibrary.org/b/isbn/9781491960202-L.jpg",
        "status": "Available",
        "isbn": "9781491960202",
        "shelf": "Shelf 2"
    },
    "9781783982141": {
        "title": "Kali Linux Network Scanning",
        "author": "Justin Hutchens",
        "cover": "https://covers.openlibrary.org/b/isbn/9781783982141-L.jpg",
        "status": "Available",
        "isbn": "9781783982141",
        "shelf": "Shelf 2"
    },
    "1590593898": {
        "title": "Joel on Software",
        "author": "Joel Spolsky",
        "cover": "https://covers.openlibrary.org/b/isbn/1590593898-L.jpg",
        "status": "Checked Out", # Set to checked out for UI testing
        "isbn": "1590593898",
        "shelf": "Shelf 2"
    },
    
    # --- Shelf 3 ---
    "9781782163121": {
        "title": "Mastering Kali Linux",
        "author": "Robert W. Beggs",
        "cover": "https://covers.openlibrary.org/b/isbn/9781782163121-L.jpg",
        "status": "Available",
        "isbn": "9781782163121",
        "shelf": "Shelf 3"
    },
    "0471098779": {
        "title": "Elements of Cartography",
        "author": "Robinson et al.",
        "cover": "https://covers.openlibrary.org/b/isbn/0471098779-L.jpg",
        "status": "Available",
        "isbn": "0471098779",
        "shelf": "Shelf 3"
    },
    "0131478230": {
        "title": "Practical Guide to Linux",
        "author": "Mark G. Sobell",
        "cover": "https://covers.openlibrary.org/b/isbn/0131478230-L.jpg",
        "status": "Available",
        "isbn": "0131478230",
        "shelf": "Shelf 3"
    },
    "076372677X": {
        "title": "Information Security Illuminated",
        "author": "Solomon & Chapple",
        "cover": "https://covers.openlibrary.org/b/isbn/076372677X-L.jpg",
        "status": "Checked Out", 
        "isbn": "076372677X",
        "shelf": "Shelf 3"
    },
    "0596005458": {
        "title": "Security Warrior",
        "author": "Peikari & Chuvakin",
        "cover": "https://covers.openlibrary.org/b/isbn/0596005458-L.jpg",
        "status": "Available",
        "isbn": "0596005458",
        "shelf": "Shelf 3"
    },
    
    # --- Shelf 4 & 5 (The final 4 books) ---
    "0030977177": {
        "title": "World Regional Geography",
        "author": "Wheeler & Kostbade",
        "cover": "https://covers.openlibrary.org/b/id/6463996-L.jpg",
        "status": "Available",
        "isbn": "0030977177",
        "shelf": "Shelf 4"
    },
    "0314004246": {
        "title": "Physical Geography Manual",
        "author": "West Publishing",
        "cover": "https://covers.openlibrary.org/b/id/11145828-L.jpg",
        "status": "Available",
        "isbn": "0314004246",
        "shelf": "Shelf 4"
    },
    "0671492071": {
        "title": "Alan Turing: The Enigma",
        "author": "Andrew Hodges",
        "cover": "https://covers.openlibrary.org/b/isbn/0671492071-L.jpg",
        "status": "Available",
        "isbn": "0671492071",
        "shelf": "Shelf 5"
    },
    "0321534964": {
        "title": "The Art of Computer Programming",
        "author": "Donald Knuth",
        "cover": "https://covers.openlibrary.org/b/isbn/0321534964-L.jpg",
        "status": "Available",
        "isbn": "0321534964",
        "shelf": "Shelf 5"
    }
}

# --- 2. LOCAL USERS ---
# NEW: Added 'id' key inside each user dict so current_user['id'] works in main.py (US006)
local_users = {
    "12345": {"id": "12345", "name": "Kenneth Molina", "active": True, "email": "molinak4@southernct.edu"},
    "11111": {"id": "11111", "name": "Jose Gaspar", "active": True, "email": "gasparmarij1@southernct.edu"},
    "99999": {"id": "99999", "name": "Professor James", "active": True, "email": "james@southernct.edu"}
}

# NEW: Mock loan records for testing the My Books workspace (US006)
local_loans = [
    # Active loan - due in the future (healthy)
    {
        "user_id": "12345",
        "title": "Alan Turing: The Enigma",
        "author": "Andrew Hodges",
        "cover": "https://covers.openlibrary.org/b/isbn/0671492071-L.jpg",
        "returned": False,
        "due_date": datetime.now() + timedelta(days=9),
    },
    # Active loan - overdue (due date in the past)
    {
        "user_id": "12345",
        "title": "Joel on Software",
        "author": "Joel Spolsky",
        "cover": "https://covers.openlibrary.org/b/isbn/1590593898-L.jpg",
        "returned": False,
        "due_date": datetime.now() - timedelta(days=3),
    },
    # Completed loan - already returned
    {
        "user_id": "12345",
        "title": "Practical Guide to Linux",
        "author": "Mark G. Sobell",
        "cover": "https://covers.openlibrary.org/b/isbn/0131478230-L.jpg",
        "returned": True,
        "due_date": datetime.now() - timedelta(days=20),
        "returned_date": datetime.now() - timedelta(days=22),
    },
    # Another completed loan - returned on time
    {
        "user_id": "12345",
        "title": "Kali Linux Network Scanning",
        "author": "Justin Hutchens",
        "cover": "https://covers.openlibrary.org/b/isbn/9781783982141-L.jpg",
        "returned": True,
        "due_date": datetime.now() - timedelta(days=5),
        "returned_date": datetime.now() - timedelta(days=7),
    },
]


async def fetch_from_open_library(isbn):
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
    headers = {'User-Agent': 'SCSU_CS_Library_Kiosk/1.0 (molinak4@southernct.edu)'}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                key = f"ISBN:{isbn}"
                
                if key in data:
                    book_data = data[key]
                    new_book = {
                        "title": book_data.get('title', 'Unknown Title'),
                        "author": book_data.get('authors', [{'name': 'Unknown'}])[0]['name'],
                        "cover": book_data.get('cover', {}).get('large', 'https://via.placeholder.com/200x300?text=No+Cover'),
                        "status": "Available",
                        "isbn": isbn
                    }
                    # Save to local cache so next time it's instant
                    local_book_cache[isbn] = new_book
                    return new_book
    except Exception as e:
        print(f" [ERROR] API lookup failed: {e}")
        return None
    return None


async def get_user(student_id):
    await asyncio.sleep(0.1) 
    return local_users.get(student_id)

async def get_book(isbn):
    # Check Local First
    if isbn in local_book_cache:
        print(f" [HIT] Found {isbn} in local cache.")
        return local_book_cache[isbn]
    
    # Check Internet Second
    if USE_LIVE_API:
        print(f" [MISS] Searching Open Library for {isbn}...")
        return await fetch_from_open_library(isbn)
        
    return None

async def get_catalog():
    # Return our list of 14 books
    return list(local_book_cache.values())

async def checkout_books(cart_items, user_id):
    """
    Takes a list of books from the cart and flips their status 
    to 'Checked Out' in the database.
    """
    for book in cart_items:
        isbn = book['isbn']
        # Update the status in our local storage
        if isbn in local_book_cache:
            local_book_cache[isbn]['status'] = 'Checked Out'
            print(f" [UPDATE] Book {isbn} is now CHECKED OUT.")
        # NEW: Add a loan record so the book appears in My Books (US006)
        local_loans.append({
            "user_id": user_id,
            "title": book['title'],
            "author": book['author'],
            "cover": book['cover'],
            "returned": False,
            "due_date": datetime.now() + timedelta(days=14),
        })
            
    return True

# NEW: Marks a book as returned in both the catalog and the active loan record
async def return_book(isbn: str):
    # If the ISBN isn't in our catalog, we can't do anything
    if isbn not in local_book_cache:
        return False

    book = local_book_cache[isbn]

    # Flip the book back to Available in the catalog
    local_book_cache[isbn]['status'] = 'Available'
    print(f" [UPDATE] Book {isbn} is now AVAILABLE.")

    # Find the matching active loan and mark it as returned
    for loan in local_loans:
        if loan['title'] == book['title'] and not loan['returned']:
            loan['returned'] = True
            loan['returned_date'] = datetime.now()
            print(f" [UPDATE] Loan for '{book['title']}' marked as returned.")
            break

    return True

# NEW: Returns all loan records for a given user_id (US006)
async def get_user_loans(user_id: str):
    return [loan for loan in local_loans if loan['user_id'] == user_id]