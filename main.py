from nicegui import app, ui # import UI and APP which has login and dashboard
import mock_database as db 
from app import login, dashboard # import the login and dashboard

app.add_static_files('/assets', 'assets') # for images

# for scroll bars which I don't understand
ui.add_css('''
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
''', shared=True)

# NICEGUI defining home page of app
@ui.page('/')
async def main_page():
     

    # for the header which is invisble until logged in
    with ui.header().classes('font-mono bg-[#0f1420] text-white h-16 border-b border-slate-800/80 shadow-lg') as app_header:
        app_header.visible = False
        with ui.row().classes('w-full h-full items-center justify-between px-8'):
            
            with ui.row().classes('items-center gap-6'):
                ui.image('/assets/scsu_logo.png').classes('w-32 max-h-10 object-contain brightness-0 invert')
                with ui.row().classes('items-center gap-2'):
                    ui.label('CS_LIBRARY').classes('text-lg font-black tracking-widest text-white')
                    ui.label('KIOSK').classes('text-lg font-light tracking-widest text-blue-500 opacity-80')
                    
            with ui.row().classes('items-center gap-4'):
                ui.icon('account_circle', size='18px').classes('text-blue-400')
                user_name_label = ui.label('Guest').classes('text-sm font-medium text-slate-300 tracking-wide')

                # logout button that called do_logout to return to login
                ui.button(color=None, on_click=lambda: do_logout(), icon='logout').classes(
                    'ml-6 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/20 transition-all p-1.5'
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
        ui.notify(f'Successfully checked out {len(cart_items)} items!', type='positive')
        reset_cart_ui()

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
    
    dash_cont, checkout_input, checkout_cover, checkout_title, checkout_author, cart_container, checkout_btn, return_input, return_cover, return_title, return_status, empty_cart_message = \
        dashboard.create(scan_checkout_logic, confirm_checkout, scan_return_logic)

ui.run(title="CS Library Kiosk", dark=True)
