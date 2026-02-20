from nicegui import app, ui # import UI and APP which has login and dashboard
import mock_database as db 
from app import login, dashboard # import the login and dashboard

app.add_static_files('/assets', 'assets') # for images

# for scroll bars which I don't understand (and the new starry background/fonts)
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

    /* Blue/cyan ambient glow blobs */
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


''', shared=True)

# NICEGUI defining home page of app
@ui.page('/')
async def main_page():
   
    # for the header which is invisible until logged in
    with ui.header().classes('bg-slate-900/40 backdrop-blur-md border-b border-white/10 shadow-lg rounded-b-2xl h-20 z-50') as app_header:
        app_header.visible = False
        
        # Standard Row inside
        with ui.row().classes('w-full h-full items-center justify-between px-8'):
            
            # --- LEFT: LOGO ---
            with ui.row().classes('items-center gap-6'):
                ui.image('/assets/scsu_logo.png').classes('w-28 max-h-10 object-contain brightness-0 invert opacity-90')
                with ui.row().classes('items-center gap-2'):
                    ui.label('CS_LIBRARY').classes('text-lg font-black tracking-widest text-white drop-shadow-sm')
                    ui.label('KIOSK').classes('text-lg font-light tracking-widest text-blue-400 opacity-90')
                    
            # --- RIGHT: USER INFO ---
            with ui.row().classes('items-center gap-4'):
                ui.icon('account_circle', size='20px').classes('text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]')
                user_name_label = ui.label('Guest').classes('text-sm font-bold text-slate-200 tracking-wide')

                # logout button that called do_logout to return to login
                ui.button(color=None, on_click=lambda: do_logout(), icon='logout').classes(
                    'ml-6 bg-red-500/10 text-red-300 rounded-full hover:bg-red-500/30 border border-red-500/20 transition-all p-2 backdrop-blur-sm'
                ).props('flat')

    # for the cart to hold items until logged out/checked out
    cart_items = []

    # Logic function
    async def try_login():
        user = await db.get_user(id_input.value)
        if user and user['active']:
            ui.notify(f"Welcome, {user['name']}", type='positive')
            user_name_label.text = user['name']
            login_cont.visible = False
            app_header.visible = True
            dash_cont.visible = True
        else:
            ui.notify('Invalid ID', type='negative')
            id_input.value = ""

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
            checkout_title.text = book['title']
            checkout_author.text = book['author']
            
            with cart_container:
                with ui.row().classes('w-full items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10'):
                    ui.image(book['cover']).classes('w-12 h-16 rounded object-cover')
                    with ui.column().classes('gap-0'):
                        ui.label(book['title']).classes('text-white font-bold')
                        ui.label(book['author']).classes('text-xs text-slate-400')
            
            checkout_btn.text = f'CONFIRM CHECKOUT ({len(cart_items)})'
            checkout_btn.enable()
            checkout_btn.classes(remove='bg-white/5 border-white/10 text-slate-500', add='bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:bg-blue-500/30')
        else:
            ui.notify('Book not found', type='negative')


    def reset_cart_ui():
        cart_items.clear()
        cart_container.clear()
        empty_cart_message.visible = True
        checkout_btn.text = 'CONFIRM CHECKOUT (0)'
        checkout_btn.disable()
        checkout_btn.classes(remove='bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] hover:bg-blue-500/30', add='bg-white/5 border-white/10 text-slate-500')
        checkout_cover.source = 'https://via.placeholder.com/200x300?text=Waiting...'
        checkout_title.text, checkout_author.text = '---', '---'

    async def confirm_checkout():
        # Updates the DB to mark the cart items as checked out
        await db.checkout_books(cart_items)
        ui.notify(f'Successfully checked out {len(cart_items)} items!', type='positive')
        reset_cart_ui()
        # Reloads the catalog grid so checked out books show up red
        await load_catalog_books() 

    async def scan_return_logic():
        book = await db.get_book(return_input.value)
        return_input.value = ""
        if book:
            return_cover.source = book['cover']
            return_title.text = book['title']
            return_status.text = 'RETURNED SUCCESSFULLY'
            return_status.classes(remove='bg-slate-800 text-slate-400 border-slate-700', add='bg-blue-500/20 text-blue-400 border-blue-500/50')
            ui.notify('Book Returned!', type='positive')
        else:
            ui.notify('Book not recognized', type='negative')

    def do_logout():
        login_cont.visible, dash_cont.visible, app_header.visible = True, False, False
        id_input.value = ""
        reset_cart_ui() 

    login_cont, id_input = login.create(try_login)
    
    # unpacking variables from dashboard
    dash_cont, checkout_input, checkout_cover, checkout_title, checkout_author, cart_container, checkout_btn, return_input, return_cover, return_title, return_status, empty_cart_message, catalog_grid = \
        dashboard.create(scan_checkout_logic, confirm_checkout, scan_return_logic)

    # Function to build the catalog UI with real books from database
    async def load_catalog_books():
        books = await db.get_catalog()
        catalog_grid.clear()
        
        with catalog_grid:
            for book in books:
                
                is_avail = book['status'] == 'Available'
                border = 'border-slate-700/50' if is_avail else 'border-red-500/50'
                opacity = 'opacity-100' if is_avail else 'opacity-60 grayscale'
                
                with ui.card().classes(f'w-56 bg-[#151924]/80 {border} rounded-2xl p-5 items-center cursor-pointer hover:scale-105 transition-all duration-300 {opacity}'):
                    ui.image(book['cover']).classes('w-full h-64 object-cover rounded-xl shadow-lg mb-4')
                    ui.label(book['title']).classes('text-lg text-white font-bold text-center leading-tight mb-1')
                    ui.label(book['author']).classes('text-sm text-slate-400 text-center')
                    
                    if is_avail:
                        ui.label('AVAILABLE').classes('text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full mt-2 font-bold tracking-widest')
                    else:
                        ui.label('CHECKED OUT').classes('text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full mt-2 font-bold tracking-widest')

    # Load books immediately on startup
    await load_catalog_books()

ui.run(title="CS Library Kiosk", favicon='favicon1.ico', dark=True)
