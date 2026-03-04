

from nicegui import app, ui
import database as db
from app import login_email, dashboard, register
from datetime import datetime

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

    html { overflow-x: hidden; }

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
        animation: twinkle 8s infinite alternate, drift 60s linear infinite;
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
            200px 500px rgba(255,255,255,0.5),
            750px 200px rgba(255,255,255,0.4),
            1300px 650px rgba(255,255,255,0.6),
            450px 350px rgba(255,255,255,0.5),
            1700px 200px rgba(255,255,255,0.3),
            600px 750px rgba(255,255,255,0.5),
            1050px 450px rgba(255,255,255,0.6),
            300px 150px rgba(255,255,255,0.4),
            1500px 550px rgba(255,255,255,0.5),
            900px 850px rgba(255,255,255,0.3),
            1800px 400px rgba(255,255,255,0.5),
            100px 600px rgba(255,255,255,0.4),
            1250px 100px rgba(255,255,255,0.6),
            680px 500px rgba(255,255,255,0.5),
            1600px 750px rgba(255,255,255,0.4),
            50px 200px rgba(200,220,255,0.6),
            1400px 80px rgba(200,220,255,0.5),
            550px 600px rgba(200,220,255,0.7),
            1150px 320px rgba(200,220,255,0.4),
            850px 50px rgba(200,220,255,0.5);
        animation: twinkle2 10s infinite alternate-reverse, drift 45s linear infinite reverse;
        z-index: 0;
        pointer-events: none;
    }

    .star-layer-3 {
        position: fixed;
        top: 0; left: 0;
        width: 3px;
        height: 3px;
        background: transparent;
        border-radius: 50%;
        box-shadow:
            400px 100px rgba(180,200,255,0.7),
            950px 300px rgba(180,200,255,0.5),
            1550px 500px rgba(180,200,255,0.8),
            250px 800px rgba(180,200,255,0.6),
            1300px 200px rgba(180,200,255,0.5),
            700px 700px rgba(200,220,255,0.7),
            1750px 600px rgba(180,200,255,0.4),
            100px 400px rgba(200,220,255,0.6),
            1100px 750px rgba(180,200,255,0.7),
            500px 250px rgba(200,220,255,0.5);
        animation: twinkle3 14s infinite alternate, drift 80s linear infinite;
        z-index: 0;
        pointer-events: none;
    }

    @keyframes twinkle {
        0%   { opacity: 0.4; }
        25%  { opacity: 0.7; }
        50%  { opacity: 0.9; }
        75%  { opacity: 0.5; }
        100% { opacity: 0.6; }
    }

    @keyframes twinkle2 {
        0%   { opacity: 0.3; }
        33%  { opacity: 0.8; }
        66%  { opacity: 0.5; }
        100% { opacity: 0.9; }
    }

    @keyframes twinkle3 {
        0%   { opacity: 0.5; }
        50%  { opacity: 1.0; }
        100% { opacity: 0.3; }
    }

    @keyframes drift {
        from { transform: translateY(0px); }
        to   { transform: translateY(-200px); }
    }

    body::before {
        content: '';
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background:
            radial-gradient(ellipse at 15% 50%, rgba(29, 78, 216, 0.15), transparent 35%),
            radial-gradient(ellipse at 85% 30%, rgba(6, 182, 212, 0.12), transparent 35%),
            radial-gradient(ellipse at 50% 80%, rgba(88, 28, 135, 0.08), transparent 40%),
            radial-gradient(ellipse at 70% 10%, rgba(59, 130, 246, 0.06), transparent 30%);
        z-index: 0;
        pointer-events: none;
        animation: nebulaPulse 20s ease-in-out infinite alternate;
    }

    @keyframes nebulaPulse {
        0%   { opacity: 0.8; }
        50%  { opacity: 1.0; }
        100% { opacity: 0.7; }
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

    @media (max-width: 768px) {
        .q-card { width: auto !important; padding: 16px !important; }

        .nicegui-content { padding: 0 !important; }
    }

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

    ui.add_body_html('''
    <div class="star-layer-3"></div>
    ''')
    with ui.row().classes(
        'dash-header fixed top-0 left-0 w-full h-20 items-center justify-between px-8 '
        'bg-slate-900/40 border-b border-white/10 backdrop-blur-2xl shadow-2xl '
        'z-50 transition-all rounded-[32px]'
    ) as app_header:
        app_header.visible = False

        with ui.row().classes('items-center gap-4'):
            ui.image('/assets/scsu_logo.png').classes(
                'w-20 max-h-8 object-contain brightness-0 invert opacity-90'
            )
            with ui.row().classes('items-center gap-1.5'):
                ui.label('CS_LIBRARY').classes(
                    'text-md font-black tracking-widest text-white drop-shadow-sm'
                )
                ui.label('KIOSK').classes(
                    'text-md font-light tracking-widest text-blue-400 opacity-90'
                )

        with ui.row().classes('items-center gap-3'):
            ui.icon('account_circle', size='20px').classes('text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]')
            user_name_label = ui.label('Guest').classes('text-sm font-bold text-slate-200 tracking-wide')


            ui.button(color=None, on_click=lambda: do_logout(), icon='logout').classes(
            'ml-4 bg-red-500/10 text-red-300 rounded-full hover:bg-red-500/30 border border-red-500/20 transition-all p-1.5 backdrop-blur-sm'
            ).props('flat size=small')

    current_user = {}

    async def try_login():
        email    = id_input.value.strip()
        password = id_input.password_input.value

        user = await db.authenticate_user(email, password)
        if user and user['active']:
            current_user.update(user)
            ui.notify(f"Welcome, {user['name']}", type='positive')
            user_name_label.text = user['name']
            login_cont.visible  = False
            app_header.visible  = True
            dash_cont.visible   = True

            id_input.value                = ""
            id_input.password_input.value = ""
        else:
            ui.notify('Invalid email or password.', type='negative')
            id_input.password_input.value = ""



    async def handle_search(query: str):
        nonlocal current_search_query, current_page
        current_search_query = (query or '').lower().strip()
        current_page = 1
        await load_catalog_books()

    async def load_my_books():
        if not current_user:
            return
        loans   = await db.get_user_loans(current_user['id'])
        active  = [l for l in loans if not l.get('returned')]
        history = [l for l in loans if l.get('returned')]

        active_loans_container.clear()
        

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
                    

                    async def _renew(l_id=loan['id']):
                        success = await db.renew_book(l_id)
                        if success:
                            ui.notify('Book renewed successfully for 14 more days!', type='positive')
                            await load_my_books()
                        else:
                            ui.notify('Could not renew book.', type='negative')
                    

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

    (dash_cont, _co_in, _co_cov, _co_ti, _co_au,
     _cart, _co_btn, _ret_in, _ret_cov, _ret_ti,
     _ret_st, _empty, catalog_grid, _co_due,
     active_loans_container, no_active_loans, history_container, no_history,
     pagination_container) = \
        dashboard.create(None, None, None, handle_search, load_my_books, next_page, prev_page, browse_only=True)

    async def go_to_page(page_num):
        nonlocal current_page
        current_page = page_num
        await load_catalog_books()

    def _build_pagination(total_pages):
        pagination_container.clear()

        circle = (
            'w-9 h-9 min-w-0 min-h-0 p-0 rounded-full text-xs font-semibold '
            'transition-all duration-200 border '
        )
        active_style = circle + 'bg-blue-500/20 text-white border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.35)]'
        normal_style = circle + 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
        disabled_style = circle + 'bg-transparent text-slate-600 border-white/5 opacity-40'
        arrow_style = circle + 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'

        with pagination_container:
            prev = ui.button(icon='img:/assets/ph-caret-left.svg', on_click=lambda: go_to_page(current_page - 1), color=None).classes(
                arrow_style if current_page > 1 else disabled_style
            ).props('flat dense')
            if current_page <= 1:
                prev.disable()

            pages_to_show = []
            if total_pages <= 7:
                pages_to_show = list(range(1, total_pages + 1))
            else:
                pages_to_show = [1]
                if current_page > 3:
                    pages_to_show.append('...')
                start = max(2, current_page - 1)
                end = min(total_pages - 1, current_page + 1)
                for p in range(start, end + 1):
                    if p not in pages_to_show:
                        pages_to_show.append(p)
                if current_page < total_pages - 2:
                    pages_to_show.append('...')
                if total_pages not in pages_to_show:
                    pages_to_show.append(total_pages)

            for p in pages_to_show:
                if p == '...':
                    ui.label('···').classes('w-9 h-9 flex items-center justify-center text-slate-500 text-sm font-bold')
                else:
                    page_num = p
                    style = active_style if page_num == current_page else normal_style
                    ui.button(str(page_num), on_click=lambda pn=page_num: go_to_page(pn), color=None).classes(
                        style
                    ).props('flat dense')

            nxt = ui.button(icon='img:/assets/ph-caret-right.svg', on_click=lambda: go_to_page(current_page + 1), color=None).classes(
                arrow_style if current_page < total_pages else disabled_style
            ).props('flat dense')
            if current_page >= total_pages:
                nxt.disable()

    async def load_catalog_books():
        books = await db.get_catalog()

        if current_search_query:
            filtered_books = [b for b in books if current_search_query in b['title'].lower() or current_search_query in b['author'].lower()]
        else:
            filtered_books = books

        total_books = len(filtered_books)
        total_pages = max(1, (total_books + items_per_page - 1) // items_per_page)

        start_idx = (current_page - 1) * items_per_page
        end_idx = start_idx + items_per_page
        page_books = filtered_books[start_idx:end_idx]

        _build_pagination(total_pages)

        catalog_grid.clear()
        with catalog_grid:
            for book in page_books:
                is_avail = book['status'] == 'Available'
                border   = 'border-slate-700/50' if is_avail else 'border-red-500/50'
                opacity  = 'opacity-100' if is_avail else 'opacity-60 grayscale'
                with ui.card().classes(
                    f'bg-[#151924]/80 {border} rounded-2xl overflow-hidden '
                    f'cursor-pointer hover:scale-[1.03] transition-all duration-300 {opacity}'
                ).style('padding: 0; position: relative;'):
                    ui.image(book['cover']).classes('card-cover w-full h-72 object-cover')
                    with ui.element('div').style(
                        'position: absolute; bottom: 0; left: 0; right: 0; '
                        'background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.9) 100%); '
                        'padding: 2rem 0.75rem 0.75rem;'
                    ):
                        ui.label(book['title']).classes('text-sm text-white font-bold leading-snug mb-1')
                        ui.label(book['author']).classes('text-xs text-slate-300')
                        if is_avail:
                            ui.label('AVAILABLE').classes('text-[9px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full mt-2 font-bold tracking-widest inline-block')
                        else:
                            ui.label('CHECKED OUT').classes('text-[9px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full mt-2 font-bold tracking-widest inline-block')

    await load_catalog_books()


ui.run(host='0.0.0.0', port=8080, title="CS Library Kiosk", favicon='favicon1.ico', dark=True)