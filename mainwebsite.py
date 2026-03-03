# WORK IN PROGRESS!

# TO DO: 
# Create a separate dashboard with intended features.
# Assign books to a user.

from nicegui import app, ui
import database as db
from app import login_email, dashboard, register
from datetime import datetime, timedelta

db.init_db()

app.add_static_files('/assets', 'assets')

ui.add_css('''
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

    body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        font-family: 'Space Grotesk', sans-serif;
    }

    .font-mono {
        font-family: 'Space Grotesk', sans-serif !important;
    }

    .nicegui-content {
        padding: 0 !important;
        margin: 0 !important;
        max-width: none !important; 
    }

    body, .scsu-bg {
        background-color: #020617;
        position: relative;
    }

    .scsu-bg::before {
        content: '';
        position: fixed;
        top: 0; left: 0;
        width: 1px;
        height: 1px;
        background: transparent;
        box-shadow:
            120px 340px #fff, 450px 89px #fff, 780px 520px #fff,
            1200px 150px #fff, 90px 670px #fff, 1500px 400px #fff,
            330px 210px #fff, 880px 760px #fff, 1650px 90px #fff,
            560px 430px #fff, 1380px 620px #fff, 210px 510px #fff,
            970px 280px #fff, 1750px 700px #fff, 640px 150px #fff,
            1100px 480px #fff, 40px 820px #fff, 1420px 250px #fff,
            730px 630px #fff, 1850px 180px #fff, 290px 740px #fff,
            1050px 390px #fff, 500px 560px #fff, 1680px 460px #fff,
            160px 120px #fff, 860px 870px #fff, 1310px 130px #fff,
            420px 680px #fff, 1590px 810px #fff, 75px 290px #fff,
            940px 50px #fff, 1230px 740px #fff, 610px 320px #fff,
            1780px 550px #fff, 350px 450px #fff, 1120px 680px #fff,
            820px 190px #fff, 1460px 360px #fff, 260px 590px #fff,
            1020px 830px #fff, 480px 710px #fff, 1720px 270px #fff,
            145px 460px #fff, 900px 590px #fff, 1350px 490px #fff,
            570px 240px #fff, 1540px 660px #fff, 310px 360px #fff,
            1080px 120px #fff, 700px 780px #fff, 1890px 430px #fff,
            230px 650px #fff, 990px 470px #fff, 1190px 290px #fff,
            660px 880px #fff, 1620px 140px #fff, 110px 740px #fff,
            830px 340px #fff, 1400px 570px #fff, 495px 160px #fff,
            1760px 630px #fff, 375px 820px #fff, 1140px 210px #fff,
            755px 490px #fff, 1490px 750px #fff, 185px 180px #fff,
            1030px 650px #fff, 625px 410px #fff, 1840px 320px #fff,
            295px 270px #fff, 910px 720px #fff, 1270px 860px #fff,
            540px 80px #fff, 1610px 510px #fff, 65px 550px #fff,
            1170px 390px #fff, 780px 660px #fff, 1440px 170px #fff,
            700px 350px #fff, 650px 400px #fff, 750px 300px #fff,
            680px 500px #fff, 720px 450px #fff, 600px 380px #fff,
            800px 420px #fff, 850px 350px #fff, 580px 460px #fff,
            760px 520px #fff, 820px 300px #fff, 690px 270px #fff,
            740px 600px #fff, 660px 320px #fff, 780px 480px #fff;
        animation: twinkle 8s infinite alternate;
        z-index: 0;
        pointer-events: none;
    }

    .scsu-bg::after {
        content: '';
        position: fixed;
        top: 0; left: 0;
        width: 2px;
        height: 2px;
        background: transparent;
        box-shadow:
            200px 500px rgba(255,255,255,0.4),
            750px 200px rgba(255,255,255,0.3),
            1300px 650px rgba(255,255,255,0.5),
            450px 350px rgba(255,255,255,0.4),
            1700px 200px rgba(255,255,255,0.3),
            600px 750px rgba(255,255,255,0.4),
            1050px 450px rgba(255,255,255,0.5),
            300px 150px rgba(255,255,255,0.3),
            1500px 550px rgba(255,255,255,0.4),
            900px 850px rgba(255,255,255,0.3),
            1800px 400px rgba(255,255,255,0.5),
            100px 600px rgba(255,255,255,0.4),
            1250px 100px rgba(255,255,255,0.3),
            680px 500px rgba(255,255,255,0.5),
            1600px 750px rgba(255,255,255,0.4);
        animation: twinkle 12s infinite alternate-reverse;
        z-index: 0;
        pointer-events: none;
    }

    @keyframes twinkle {
        0%   { opacity: 0.3; }
        50%  { opacity: 0.8; }
        100% { opacity: 0.4; }
    }

    body::before {
        content: '';
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background:
            radial-gradient(circle at 15% 50%, rgba(29, 78, 216, 0.12), transparent 30%),
            radial-gradient(circle at 85% 30%, rgba(6, 182, 212, 0.10), transparent 30%);
        z-index: 0;
        pointer-events: none;
    }

    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

    .q-field--standout .q-field__control {
        background: rgba(255, 255, 255, 0.06) !important;
    }
    .q-field--standout.q-field--highlighted .q-field__control {
        background: rgba(255, 255, 255, 0.10) !important;
    }
    .q-field--standout .q-field__native,
    .q-field--standout .q-field__native::placeholder,
    .q-field--standout input,
    .q-field--standout textarea {
        color: white !important;
        -webkit-text-fill-color: white !important;
    }

    @media (max-height: 500px) { .q-card { padding: 16px !important; } }
    @media (max-width: 500px)  { .q-card { width: 90vw !important; padding: 20px !important; } }

''', shared=True)


@ui.page('/register')
async def register_page():
    async def on_register(name: str, email: str, student_id: str, password: str):
        user = await db.register_user(name, email, student_id, password)
        if user:
            ui.notify(f"Account created! Welcome, {user['name']}. Please sign in.", type='positive')
            ui.navigate.to('/')
        else:
            ui.notify('That email is already registered. Please sign in.', type='warning')

    register.create(
        on_register_success=on_register,
        on_back_to_login=lambda: ui.navigate.to('/'),
    )


@ui.page('/')
async def main_page():

    with ui.row().classes(
        'fixed top-0 left-0 w-full h-20 items-center justify-between px-8 '
        'bg-slate-900/40 border-b border-white/10 backdrop-blur-2xl shadow-2xl '
        'z-50 transition-all rounded-[32px]'
    ) as app_header:
        app_header.visible = False

        with ui.row().classes('items-center gap-6'):
            ui.image('/assets/scsu_logo.png').classes(
                'w-28 max-h-10 object-contain brightness-0 invert opacity-90'
            )
            with ui.row().classes('items-center gap-2'):
                ui.label('CS_LIBRARY').classes(
                    'text-lg font-black tracking-widest text-white drop-shadow-sm'
                )
                ui.label('KIOSK').classes(
                    'text-lg font-light tracking-widest text-blue-400 opacity-90'
                )

        with ui.row().classes('items-center gap-4'):
            ui.icon('account_circle', size='20px').classes(
                'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
            )
            user_name_label = ui.label('Guest').classes(
                'text-sm font-bold text-slate-200 tracking-wide'
            )
            ui.button(color=None, on_click=lambda: do_logout(), icon='logout').classes(
                'ml-6 bg-red-500/10 text-red-300 rounded-full hover:bg-red-500/30 '
                'border border-red-500/20 transition-all p-2 backdrop-blur-sm'
            ).props('flat')

    cart_items   = []
    current_user = {}

    async def try_login():
        email    = id_input.value.strip()           # id_input is now the email field
        password = id_input.password_input.value    # attached in app/login.py

        user = await db.authenticate_user(email, password)
        if user and user['active']:
            current_user.update(user)
            ui.notify(f"Welcome, {user['name']}", type='positive')
            user_name_label.text = user['name']
            login_cont.visible  = False
            app_header.visible  = True
            dash_cont.visible   = True
            # Clear the fields for when the user logs out
            id_input.value                = ""
            id_input.password_input.value = ""
        else:
            ui.notify('Invalid email or password.', type='negative')
            id_input.password_input.value = ""


    async def scan_checkout_logic():
        book = await db.get_book(checkout_input.value)
        checkout_input.value = ""
        
        if book:
            if book['status'] != 'Available':
                ui.notify('Book is already checked out!', type='warning')
                return
            
            empty_cart_message.visible = False
            cart_items.append(book)
            checkout_cover.source = book['cover']
            checkout_title.text   = book['title']
            checkout_author.text  = book['author']

            due = datetime.now() + timedelta(days=14)
            checkout_due_date.text = f'Due: {due.strftime("%B %d, %Y")}'
            
            with cart_container:
                with ui.row().classes('w-full items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10'):
                    ui.image(book['cover']).classes('w-12 h-16 rounded object-cover')
                    with ui.column().classes('gap-0'):
                        ui.label(book['title']).classes('text-white font-bold')
                        ui.label(book['author']).classes('text-xs text-slate-400')
                        ui.label(f"Due: {due.strftime('%b %d, %Y')}").classes('text-xs text-blue-400 font-bold')
            
            checkout_btn.text = f'CONFIRM CHECKOUT ({len(cart_items)})'
            checkout_btn.enable()
            checkout_btn.classes(
                remove='bg-white/5 border-white/10 text-slate-500',
                add='bg-blue-500/20 border-blue-500/50 text-blue-400 '
                    'shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:bg-blue-500/30'
            )
        else:
            ui.notify('Book not found', type='negative')

    def reset_cart_ui():
        cart_items.clear()
        cart_container.clear()
        empty_cart_message.visible = True
        checkout_btn.text = 'CONFIRM CHECKOUT (0)'
        checkout_btn.disable()
        checkout_btn.classes(
            remove='bg-blue-500/20 border-blue-500/50 text-blue-400 '
                   'shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:bg-blue-500/30',
            add='bg-white/5 border-white/10 text-slate-500'
        )
        checkout_cover.source = 'https://via.placeholder.com/200x300?text=Waiting...'
        checkout_title.text   = '---'
        checkout_author.text  = '---'
        checkout_due_date.text = ''

    async def confirm_checkout():
        await db.checkout_books(cart_items, current_user['id'])
        due = datetime.now() + timedelta(days=14)
        ui.notify(
            f'Successfully checked out {len(cart_items)} item(s)! '
            f'Return by {due.strftime("%B %d, %Y")}',
            type='positive'
        )
        reset_cart_ui()
        await load_catalog_books()

    async def scan_return_logic():
        book = await db.get_book(return_input.value)
        return_input.value = ""
        if book:
            if book['status'] == 'Available':
                ui.notify('Book is already returned.', type='warning')
                return
            success = await db.return_book(book['isbn'])
            if success:
                return_cover.source = book['cover']
                return_title.text   = book['title']
                return_status.text  = 'RETURNED SUCCESSFULLY'
                return_status.classes(
                    remove='bg-slate-800 text-slate-400 border-slate-700',
                    add='bg-blue-500/20 text-blue-400 border-blue-500/50'
                )
                ui.notify('Book Returned!', type='positive')
                await load_catalog_books()
            else:
                ui.notify('Book not recognized', type='negative')

    async def handle_search(query: str):
        nonlocal current_search_query, current_page
        current_search_query = (query or '').lower().strip()
        current_page = 1  # Reset to page 1 on new search
        await load_catalog_books()

    async def load_my_books():
        if not current_user:
            return
        loans   = await db.get_user_loans(current_user['id'])
        active  = [l for l in loans if not l.get('returned')]
        history = [l for l in loans if l.get('returned')]

        active_loans_container.clear()
        
        # Add total books checked out counter
        with active_loans_container:
            ui.label(f'Total Books Checked Out: {len(active)}').classes('text-sm text-blue-400 font-bold mb-2')
            
        no_active_loans.visible = len(active) == 0
        with active_loans_container:
            for loan in active:
                due     = loan.get('due_date', 'N/A')
                overdue = False
                if isinstance(due, datetime):
                    overdue = due < datetime.now()
                    due_str = due.strftime('%B %d, %Y')
                else:
                    due_str = due
                due_color = 'text-red-400' if overdue else 'text-blue-400'
                
                with ui.row().classes('w-full items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10'):
                    ui.image(loan.get('cover', '')).classes('w-12 h-16 rounded object-cover')
                    with ui.column().classes('gap-0 flex-1'):
                        ui.label(loan['title']).classes('text-white font-bold')
                        ui.label(loan['author']).classes('text-xs text-slate-400')
                        ui.label(f"{'OVERDUE' if overdue else 'Due'}: {due_str}").classes(f'text-xs font-bold {due_color}')
                    
                    # RENEW BUTTON logic
                    async def _renew(l_id=loan['id']):
                        success = await db.renew_book(l_id)
                        if success:
                            ui.notify('Book renewed successfully for 14 more days!', type='positive')
                            await load_my_books()
                        else:
                            ui.notify('Could not renew book.', type='negative')
                    
                    # Only allow renew if not overdue
                    renew_btn = ui.button('RENEW', on_click=_renew).classes(
                        'bg-blue-600/20 text-blue-400 font-bold tracking-widest text-xs px-4 py-2 hover:bg-blue-500/30 transition-all'
                    ).props('flat rounded')
                    if overdue:
                        renew_btn.disable()
                        renew_btn.classes(remove='bg-blue-600/20 text-blue-400 hover:bg-blue-500/30', add='bg-slate-800 text-slate-500')

        history_container.clear()
        no_history.visible = len(history) == 0
        with history_container:
            for loan in history:
                returned_on = loan.get('returned_date', 'N/A')
                if isinstance(returned_on, datetime):
                    returned_on = returned_on.strftime('%B %d, %Y')
                with ui.row().classes('w-full items-center gap-4 bg-white/[0.03] p-3 rounded-xl border border-white/5 opacity-70'):
                    ui.image(loan.get('cover', '')).classes('w-10 h-14 rounded object-cover')
                    with ui.column().classes('gap-0 flex-1'):
                        ui.label(loan['title']).classes('text-white text-sm font-bold')
                        ui.label(loan['author']).classes('text-xs text-slate-400')
                    ui.label(f'Returned: {returned_on}').classes('text-xs text-slate-500')

    def do_logout():
        login_cont.visible  = True
        dash_cont.visible   = False
        app_header.visible  = False
        id_input.value                = ""
        id_input.password_input.value = ""
        current_user.clear()
        reset_cart_ui()

    login_cont, id_input = login_email.create(try_login)

    current_page = 1
    items_per_page = 12
    current_search_query = ''

    async def next_page():
        nonlocal current_page
        current_page += 1
        await load_catalog_books()

    async def prev_page():
        nonlocal current_page
        if current_page > 1:
            current_page -= 1
            await load_catalog_books()

    (dash_cont, checkout_input, checkout_cover, checkout_title, checkout_author,
     cart_container, checkout_btn, return_input, return_cover, return_title,
     return_status, empty_cart_message, catalog_grid, checkout_due_date,
     active_loans_container, no_active_loans, history_container, no_history,
     prev_btn, next_btn, page_label) = \
        dashboard.create(scan_checkout_logic, confirm_checkout, scan_return_logic, handle_search, load_my_books, next_page, prev_page)

    async def load_catalog_books():
        books = await db.get_catalog()
        
        # Filter books based on search query
        if current_search_query:
            filtered_books = [b for b in books if current_search_query in b['title'].lower() or current_search_query in b['author'].lower()]
        else:
            filtered_books = books
            
        total_books = len(filtered_books)
        total_pages = max(1, (total_books + items_per_page - 1) // items_per_page)
        
        # Pagination logic
        start_idx = (current_page - 1) * items_per_page
        end_idx = start_idx + items_per_page
        page_books = filtered_books[start_idx:end_idx]

        # Update pagination UI controls
        page_label.text = f'Page {current_page} of {total_pages}'
        
        if current_page <= 1:
            prev_btn.disable()
            prev_btn.classes(remove='bg-slate-800 text-slate-400 hover:bg-slate-700', add='bg-slate-900 text-slate-600')
        else:
            prev_btn.enable()
            prev_btn.classes(remove='bg-slate-900 text-slate-600', add='bg-slate-800 text-slate-400 hover:bg-slate-700')
            
        if current_page >= total_pages:
            next_btn.disable()
            next_btn.classes(remove='bg-slate-800 text-slate-400 hover:bg-slate-700', add='bg-slate-900 text-slate-600')
        else:
            next_btn.enable()
            next_btn.classes(remove='bg-slate-900 text-slate-600', add='bg-slate-800 text-slate-400 hover:bg-slate-700')

        catalog_grid.clear()
        with catalog_grid:
            for book in page_books:
                is_avail = book['status'] == 'Available'
                border   = 'border-slate-700/50' if is_avail else 'border-red-500/50'
                opacity  = 'opacity-100' if is_avail else 'opacity-60 grayscale'
                with ui.card().classes(
                    f'w-48 bg-[#151924]/80 {border} rounded-xl p-3 items-center '
                    f'cursor-pointer hover:scale-105 transition-all duration-300 {opacity}'
                ):
                    ui.image(book['cover']).classes('w-full h-56 object-cover rounded-lg shadow-lg mb-2')
                    ui.label(book['title']).classes('text-sm text-white font-bold text-center leading-tight mb-1')
                    ui.label(book['author']).classes('text-xs text-slate-400 text-center')
                    if is_avail:
                        ui.label('AVAILABLE').classes('text-[9px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full mt-1 font-bold tracking-widest')
                    else:
                        ui.label('CHECKED OUT').classes('text-[9px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full mt-1 font-bold tracking-widest')

    await load_catalog_books()


ui.run(host='0.0.0.0', port=8080, title="CS Library Kiosk", favicon='favicon1.ico', dark=True)