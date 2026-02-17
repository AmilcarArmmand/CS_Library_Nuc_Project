from nicegui import ui # import the UI library again

def create(on_checkout_scan, on_checkout_confirm, on_return_scan):
    with ui.column().classes('font-mono w-full h-screen bg-gradient-to-br from-slate-900 via-[#0f1420] to-black items-center pt-8 overflow-y-auto') as container:
        container.visible = False # hide dashboard until signed in
        
        # these three functions to hide until called upon to switch for buttons
        def show_catalog():
            checkout_workspace.visible, return_workspace.visible = False, False
            catalog_workspace.visible = True

        def show_checkout():
            catalog_workspace.visible, return_workspace.visible = False, False
            checkout_workspace.visible = True
            checkout_input.run_method('focus')

        def show_return():
            catalog_workspace.visible, checkout_workspace.visible = False, False
            return_workspace.visible = True
            return_input.run_method('focus')

        # this is the row at the top of buttons sticky keeps it at the top while scrolling or switching
        with ui.row().classes('items-center gap-2 p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl mb-8 z-10 sticky top-4 transition-all'):
            # this is css for the buttons to easily call it again
            bubble_classes = 'rounded-full px-6 py-2.5 text-sm font-bold tracking-wider text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-300'
            
            # the three buttons with the bubble clear look when clicked the toggle functions are called uptop
            ui.button('BROWSE CATALOG', icon='grid_view', color=None, on_click=show_catalog).classes(bubble_classes)
            ui.button('CHECK OUT', icon='add_shopping_cart', color=None, on_click=show_checkout).classes(bubble_classes)
            ui.button('RETURN BOOK', icon='keyboard_return', color=None, on_click=show_return).classes(bubble_classes)
            
            search_box = ui.input(placeholder='Type title or author...').classes('w-64 mx-2').props('dark standout rounded-full dense')
            search_box.visible = False
            
            def toggle_search():
                show_catalog() 
                search_box.visible = not search_box.visible
                if search_box.visible:
                    search_box.run_method('focus')

            ui.button('SEARCH', icon='search', color=None, on_click=toggle_search).classes(bubble_classes)

        # Mock Catalog under buttons
        with ui.column().classes('w-full max-w-6xl items-center pb-20') as catalog_workspace:
            ui.label('Current Collection').classes('text-2xl text-white font-bold mb-8 tracking-wide w-full text-left px-4')
            with ui.row().classes('w-full justify-center gap-8 flex-wrap'):
                for i in range(8):
                    with ui.card().classes('w-56 bg-[#151924]/80 border border-slate-700/50 rounded-2xl p-5 items-center cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] transition-all duration-300'):
                        ui.image(f'https://via.placeholder.com/150x220?text=Book+{i+1}').classes('w-full h-64 object-cover rounded-xl shadow-lg mb-4')
                        ui.label('Example Book Title').classes('text-lg text-white font-bold text-center leading-tight mb-1')
                        ui.label('Author Name').classes('text-sm text-slate-400')

       
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

    # for main.py to call upon 
    return container, checkout_input, checkout_cover, checkout_title, checkout_author, cart_container, checkout_btn, return_input, return_cover, return_title, return_status, empty_cart_message