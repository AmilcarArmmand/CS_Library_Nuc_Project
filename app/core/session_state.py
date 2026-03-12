import os
from typing import Any

DEFAULT_STORAGE_SECRET = 'cs-library-kiosk-storage-v1'
VALID_STATUS_FILTERS = {'all', 'available', 'checked_out'}


def get_storage_secret() -> str:
    return (
        os.environ.get('CS_LIBRARY_KIOSK_STORAGE_SECRET')
        or os.environ.get('NICEGUI_STORAGE_SECRET')
        or DEFAULT_STORAGE_SECRET
    )


def normalize_user_snapshot(raw_user: Any) -> dict:
    if not isinstance(raw_user, dict):
        return {}
    try:
        user_id = int(raw_user.get('id'))
    except (TypeError, ValueError):
        return {}

    return {
        'id': user_id,
        'name': str(raw_user.get('name') or '').strip(),
        'student_id': str(raw_user.get('student_id') or '').strip(),
        'email': str(raw_user.get('email') or '').strip().lower(),
        'active': bool(raw_user.get('active', True)),
    }


def normalize_dashboard_state(raw_state: Any, *, browse_only: bool) -> dict:
    state = raw_state if isinstance(raw_state, dict) else {}
    allowed_views = {'catalog', 'my_books'} if browse_only else {'catalog', 'checkout', 'return', 'my_books'}

    try:
        current_page = max(1, int(state.get('current_page', 1)))
    except (TypeError, ValueError):
        current_page = 1

    current_search_query = str(state.get('current_search_query') or '').strip().lower()
    current_status_filter = str(state.get('current_status_filter') or 'all').strip()
    if current_status_filter not in VALID_STATUS_FILTERS:
        current_status_filter = 'all'

    active_view = str(state.get('active_view') or 'catalog').strip()
    if active_view not in allowed_views:
        active_view = 'catalog'

    return {
        'active_view': active_view,
        'current_page': current_page,
        'current_search_query': current_search_query,
        'current_status_filter': current_status_filter,
        'search_visible': bool(state.get('search_visible', bool(current_search_query))),
    }


def normalize_cart_items(raw_items: Any) -> list[dict]:
    if not isinstance(raw_items, list):
        return []

    normalized = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        isbn = str(item.get('isbn') or '').strip()
        title = str(item.get('title') or '').strip()
        author = str(item.get('author') or '').strip()
        cover = str(item.get('cover') or '').strip()
        status = str(item.get('status') or '').strip() or 'Available'
        if not isbn or not title:
            continue
        normalized.append({
            'isbn': isbn,
            'title': title,
            'author': author,
            'cover': cover,
            'status': status,
        })
    return normalized
