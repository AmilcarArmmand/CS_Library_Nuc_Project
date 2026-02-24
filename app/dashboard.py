from nicegui import ui # import the UI library again

def create(on_checkout_scan, on_checkout_confirm, on_return_scan, on_search, on_my_books_load):
    # CHANGE 1: Switched to 'scsu-bg' 
    with ui.column().classes('scsu-bg w-full h-screen items-center pt-28 overflow-y-auto') as container:
        container.visible = False # hide dashboard until signed in
        
        # --- NEW: LOGIC FOR THE "CLEAR STRIP" BUTTONS ---
        btn_refs = {} 

        def update_nav(selected_key):
            # Reset all buttons to transparent
            # No background, no border, just text.
            normal_style = 'text-slate-500 hover:text-blue-200 bg-transparent border-transparent shadow-none'
            for key, btn in btn_refs.items():
                btn.classes(remove='text-white bg-white/5 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-white/10', add=normal_style)
            
            # Highlight only the active one 
            active_style = 'text-white bg-white/5 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-white/10'
            btn_refs[selected_key].classes(remove=normal_style, add=active_style)

        # these three functions to hide until called upon to switch for buttons
        def show_catalog():
            checkout_workspace.visible, return_workspace.visible = False, False
            my_books_workspace.visible = False # NEW: also hide my_books workspace
            catalog_workspace.visible = True
            update_nav('catalog') # Update the strip

        def show_checkout():
            catalog_workspace.visible, return_workspace.visible = False, False
            my_books_workspace.visible = False # NEW: also hide my_books workspace
            checkout_workspace.visible = True
            checkout_input.run_method('focus')
            update_nav('checkout') # Update the strip

        def show_return():
            catalog_workspace.visible, checkout_workspace.visible = False, False
            my_books_workspace.visible = False # NEW: also hide my_books workspace
            return_workspace.visible = True
            return_input.run_method('focus')
            update_nav('return') # Update the strip

        # NEW: show My Books workspace and trigger data load from main.py (US006)
        # NEW: show My Books workspace and trigger data load from main.py (US006)
        async def show_my_books():
            catalog_workspace.visible, checkout_workspace.visible, return_workspace.visible = False, False, False
            my_books_workspace.visible = True
            update_nav('my_books')
            await on_my_books_load()

        
        # this is the row at the top of buttons sticky keeps it at the top while scrolling or switching
        with ui.row().classes('items-center gap-1 p-1.5 rounded-full bg-slate-900/40 border border-white/5 backdrop-blur-2xl shadow-2xl mb-8 z-10 sticky top-4 transition-all'):
            
            base_classes = 'rounded-full px-6 py-2 text-xs font-bold tracking-widest transition-all duration-300 border border-transparent'
            
            # the three buttons are now added to our 'btn_refs' dictionary so we can highlight them
            btn_refs['catalog'] = ui.button('BROWSE', icon='grid_view', on_click=show_catalog).classes(base_classes)
            btn_refs['checkout'] = ui.button('CHECKOUT', icon='shopping_cart', on_click=show_checkout).classes(base_classes)
            btn_refs['return'] = ui.button('RETURN', icon='keyboard_return', on_click=show_return).classes(base_classes)
            # NEW: My Books nav button (US006)
            btn_refs['my_books'] = ui.button('MY BOOKS', icon='menu_book', on_click=show_my_books).classes(base_classes)
            
            # Divider line
            ui.label('|').classes('text-slate-700 mx-2 text-lg font-light')
            
            search_box = ui.input(placeholder='Search by Title or Author...').classes('w-64 text-xs').props('dark standout rounded-full dense')
            search_box.visible = False
            # NEW: Wire up on_change so typing filters the catalog in real time (US005)
            search_box.on('update:model-value', lambda e: on_search(e.args))
            
            def toggle_search():
                show_catalog() 
                search_box.visible = not search_box.visible
                if search_box.visible:
                    search_box.run_method('focus')

            ui.button('SEARCH', icon='search', color=None, on_click=toggle_search).classes('rounded-full text-xs font-bold tracking-widest text-slate-400 hover:text-white hover:bg-white/10 px-4 py-2')
            
        # Set default active tab
        update_nav('catalog')

        # Mock Catalog under buttons
        with ui.column().classes('w-full max-w-6xl items-center pb-20') as catalog_workspace:
            ui.label('Current Collection').classes('text-2xl text-white font-bold mb-8 tracking-wide w-full text-left px-4')
            
            # Instead of the 'for i in range(8)' loop, we just make an empty row.
            # We name it 'catalog_grid' so main.py can fill it with real books later.
            catalog_grid = ui.row().classes('w-full justify-center gap-8 flex-wrap')

       
       # Checkout cart button is press, this is the two cards with card and scanner
        with ui.row().classes('w-full max-w-6xl gap-8 pb-20 justify-center flex-nowrap') as checkout_workspace:
            checkout_workspace.visible = False
            
            # Left Card Scanner
            with ui.card().classes('flex-1 w-full p-8 items-center text-center bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm'):
                ui.label('SCAN TO ADD TO CART').classes('text-xs tracking-[0.3em] text-blue-500 font-bold mb-6')
                
                checkout_input = ui.input(placeholder='Scan ISBN...').classes('w-full text-center text-xl mb-2').props('dark standout rounded-full')
                checkout_input.on('keydown.enter', on_checkout_scan)
                checkout_cover = ui.image('https://via.placeholder.com/200x300?text=Waiting...').classes('w-48 h-72 shadow-lg rounded-xl object-cover border border-slate-700 mb-4')
                checkout_title = ui.label('---').classes('text-3xl text-white font-bold leading-tight')
                checkout_author = ui.label('---').classes('text-xl text-slate-500 italic mt-2')
                # NEW: Due date label, shown after a book is scanned (US003)
                checkout_due_date = ui.label('').classes('text-sm text-blue-400 font-bold mt-2 tracking-wide')


           # card for Cart next to the scan card
            with ui.card().classes('flex-1 w-full p-8 flex flex-col bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm h-[600px]'):
                ui.label('YOUR CART').classes('text-xs tracking-[0.3em] text-slate-500 font-bold mb-4')
                
                # Eempty cart column iwthin card
                with ui.column().classes('w-full flex-1 items-center justify-center opacity-40') as empty_cart_message:
                    ui.icon('shopping_cart', size='64px').classes('text-slate-400 mb-2')
                    ui.label('Cart is empty').classes('text-lg text-slate-300 font-bold')
                    ui.label('Scan a barcode to begin').classes('text-xs text-slate-400')

                #this is for when books are put in cart
                cart_container = ui.column().classes('w-full flex-1 overflow-y-auto gap-4 pr-2')
                
                checkout_btn = ui.button('CONFIRM CHECKOUT (0)', on_click=on_checkout_confirm, color=None).classes(
                    'w-full h-20 mt-6 text-xl font-bold rounded-2xl text-slate-500 bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300'
                )
                checkout_btn.disable()

        # When return  buttton is pressed hidden immediately until called
        with ui.card().classes('w-full max-w-4xl p-10 items-center text-center bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm') as return_workspace:
            return_workspace.visible = False
            
            ui.label('QUICK RETURN').classes('text-xs tracking-[0.3em] text-blue-500 font-bold mb-6')
            
            return_input = ui.input(placeholder='Scan barcode to return...').classes('w-96 text-center text-xl mb-2').props('dark standout rounded-full')
            return_input.on('keydown.enter', on_return_scan)
            
            with ui.row().classes('w-full items-center gap-16 justify-center'):
                return_cover = ui.image('https://via.placeholder.com/200x300?text=Drop+Book').classes('w-56 h-80 shadow-lg rounded-xl object-cover border border-slate-700')
                with ui.column().classes('items-start text-left flex-1'):
                    return_status = ui.label('WAITING FOR SCAN').classes('px-4 py-1.5 rounded-full text-[10px] tracking-widest font-black text-slate-400 bg-slate-800 border border-slate-700 mb-4')
                    return_title = ui.label('---').classes('text-4xl text-white font-bold leading-tight tracking-tight')

        # NEW: My Books workspace - active loans and borrowing history (US006)
        # NEW: My Books workspace - active loans and borrowing history (US006)
        with ui.card().classes('w-full max-w-4xl p-10 bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm max-h-[80vh] overflow-y-auto') as my_books_workspace:
            my_books_workspace.visible = False

            ui.label('MY BORROWED BOOKS').classes('text-xs tracking-[0.3em] text-blue-500 font-bold mb-6')

            ui.label('Currently Checked Out').classes('text-lg text-white font-bold mb-3')
            active_loans_container = ui.column().classes('w-full gap-4 mb-8')

            with ui.column().classes('w-full items-center opacity-40') as no_active_loans:
                ui.icon('check_circle', size='48px').classes('text-green-400 mb-2')
                ui.label('No books currently checked out').classes('text-slate-300')

            ui.element('div').classes('w-full h-px bg-slate-700/50 my-4')
            ui.label('Borrowing History').classes('text-lg text-white font-bold mb-3')
            history_container = ui.column().classes('w-full gap-3')

            with ui.column().classes('w-full items-center opacity-40') as no_history:
                ui.icon('history', size='48px').classes('text-slate-400 mb-2')
                ui.label('No borrowing history yet').classes('text-slate-300')

    # for main.py to call upon.
    return (container, checkout_input, checkout_cover, checkout_title, checkout_author,
            cart_container, checkout_btn, return_input, return_cover, return_title,
            return_status, empty_cart_message, catalog_grid, checkout_due_date,
            active_loans_container, no_active_loans, history_container, no_history)