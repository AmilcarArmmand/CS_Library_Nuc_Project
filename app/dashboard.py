from nicegui import ui

def create(on_checkout_scan, on_checkout_confirm, on_return_scan, on_search, on_my_books_load, on_next_page, on_prev_page, browse_only=False):

    ui.add_head_html('''
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <style>


        .dash-nav .q-btn::before {
            display: none !important;
        }
        .dash-nav .q-btn .q-icon img,
        .pagination-row .q-btn .q-icon img {
            width: 20px !important;
            height: 20px !important;

            filter: brightness(0) invert(47%) sepia(18%) saturate(718%) hue-rotate(178deg) brightness(95%) contrast(87%) !important;
            transition: filter 0.3s ease !important;
        }

        .dash-nav .q-btn.text-white .q-icon img,
        .dash-nav .q-btn:hover .q-icon img,
        .pagination-row .q-btn:hover .q-icon img {
            filter: brightness(0) invert(1) !important;
        }


        @keyframes mobileCardIn {
            from { opacity: 0; transform: translateY(18px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mobileSlideUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes navGlow {
            0%, 100% { box-shadow: 0 -4px 24px rgba(59,130,246,0.08), 0 -1px 0 rgba(255,255,255,0.06); }
            50%      { box-shadow: 0 -6px 32px rgba(59,130,246,0.14), 0 -1px 0 rgba(255,255,255,0.1); }
        }


        @media (max-width: 768px) {


            .dash-nav {
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                top: auto !important;
                z-index: 200 !important;
                border-radius: 1.25rem 1.25rem 0 0 !important;
                background: rgba(2, 6, 23, 0.82) !important;
                backdrop-filter: blur(40px) saturate(1.8) !important;
                -webkit-backdrop-filter: blur(40px) saturate(1.8) !important;
                border: none !important;
                border-top: 1px solid rgba(255,255,255,0.07) !important;
                animation: navGlow 4s ease-in-out infinite !important;
                padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom, 0.5rem)) !important;
                justify-content: space-around !important;
                align-items: stretch !important;
                flex-wrap: nowrap !important;
                gap: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100vw !important;
                overflow: visible !important;
            }
            .dash-nav::-webkit-scrollbar { display: none; }


            .dash-nav .q-btn {
                font-size: 0.55rem !important;
                padding: 6px 2px 4px !important;
                min-width: 0 !important;
                min-height: 48px !important;
                flex: 1 1 0 !important;
                border-radius: 0.875rem !important;
                letter-spacing: 0.06em !important;
                white-space: nowrap !important;
                transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                background: transparent !important;
                border: 1px solid transparent !important;
                box-shadow: none !important;
            }

            .dash-nav .q-btn::before {
                display: none !important;
            }
            .dash-nav .q-btn .q-btn__content {
                flex-direction: column !important;
                gap: 1px !important;
            }
            .dash-nav .q-btn .q-icon {
                font-size: 20px !important;
                margin: 0 !important;
            }

            .dash-nav .q-btn:hover {
                background: rgba(255,255,255,0.06) !important;
            }

            .dash-nav .q-btn.text-white {
                background: rgba(255,255,255,0.05) !important;
                box-shadow: 0 0 20px rgba(59,130,246,0.5) !important;
                border: 1px solid rgba(255,255,255,0.1) !important;
            }

            .dash-nav .nav-divider { display: none !important; }


            .dash-nav .nav-search-box {
                position: absolute !important;
                bottom: calc(100% + 0.6rem) !important;
                left: 0.75rem !important;
                right: 0.75rem !important;
                width: auto !important;
                z-index: 210 !important;
            }
            .dash-nav .nav-search-box .q-field__control {
                background: rgba(2, 6, 23, 0.92) !important;
                backdrop-filter: blur(30px) !important;
                border: 1px solid rgba(59,130,246,0.3) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.15) !important;
                border-radius: 1rem !important;
            }


            .mobile-pt {
                padding-top: 4rem !important;
                padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0.5rem)) !important;
                height: auto !important;
                min-height: 100vh !important;
                overflow-y: visible !important;
            }


            .catalog-title {
                font-size: 1.35rem !important;
                margin-bottom: 0.875rem !important;
                padding: 0 0.75rem !important;
                letter-spacing: 0.02em !important;
            }


            .catalog-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 0.75rem !important;
                padding: 0 0.75rem !important;
                max-width: 100vw !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
            }
            .catalog-grid .q-card {
                border-radius: 1rem !important;
                min-width: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                box-shadow: none !important;
                background: transparent !important;
                border: none !important;
                outline: none !important;
                padding: 0 !important;
                animation: mobileCardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both !important;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                overflow: hidden !important;
            }
            .catalog-grid .q-card:active {
                transform: scale(0.96) !important;
            }

            .catalog-grid .q-card:nth-child(1)  { animation-delay: 0.02s !important; }
            .catalog-grid .q-card:nth-child(2)  { animation-delay: 0.06s !important; }
            .catalog-grid .q-card:nth-child(3)  { animation-delay: 0.10s !important; }
            .catalog-grid .q-card:nth-child(4)  { animation-delay: 0.14s !important; }
            .catalog-grid .q-card:nth-child(5)  { animation-delay: 0.18s !important; }
            .catalog-grid .q-card:nth-child(6)  { animation-delay: 0.22s !important; }
            .catalog-grid .q-card:nth-child(7)  { animation-delay: 0.26s !important; }
            .catalog-grid .q-card:nth-child(8)  { animation-delay: 0.30s !important; }
            .catalog-grid .q-card:nth-child(9)  { animation-delay: 0.34s !important; }
            .catalog-grid .q-card:nth-child(10) { animation-delay: 0.38s !important; }
            .catalog-grid .q-card:nth-child(n+11) { animation-delay: 0.4s !important; }

            .catalog-grid .card-cover {
                height: 14rem !important;
            }


            .checkout-row {
                flex-direction: column !important;
                align-items: stretch !important;
                flex-wrap: wrap !important;
                gap: 1rem !important;
                padding: 0 0.6rem !important;
                animation: mobileSlideUp 0.4s ease-out both !important;
            }
            .checkout-row > * {
                width: 100% !important;
                min-width: 0 !important;
                flex: none !important;
            }
            .checkout-row .q-card {
                border-radius: 1.5rem !important;
                padding: 1.25rem !important;
                background: rgba(10, 14, 28, 0.88) !important;
                backdrop-filter: blur(24px) saturate(1.4) !important;
                border: 1px solid rgba(255,255,255,0.06) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04) !important;
            }
            .checkout-row .checkout-cover-img {
                width: 7.5rem !important;
                height: 11rem !important;
                border-radius: 0.875rem !important;
            }
            .checkout-row .checkout-title-text {
                font-size: 1.3rem !important;
            }
            .checkout-row .checkout-author-text {
                font-size: 0.85rem !important;
            }

            .checkout-row .q-card.flex-1 {
                height: auto !important;
                min-height: 200px !important;
                max-height: 50vh !important;
            }


            .return-workspace-card {
                padding: 1.5rem !important;
                border-radius: 1.5rem !important;
                max-width: 96vw !important;
                background: rgba(10, 14, 28, 0.88) !important;
                backdrop-filter: blur(24px) saturate(1.4) !important;
                border: 1px solid rgba(255,255,255,0.06) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04) !important;
                animation: mobileSlideUp 0.4s ease-out both !important;
            }
            .return-layout {
                flex-direction: column !important;
                align-items: center !important;
                gap: 1.5rem !important;
            }
            .return-cover-img {
                width: 9rem !important;
                height: 13rem !important;
                border-radius: 0.875rem !important;
            }
            .return-input {
                width: 100% !important;
                max-width: 100% !important;
            }
            .return-title-text {
                font-size: 1.4rem !important;
                text-align: center !important;
            }


            .my-books-card {
                padding: 1.25rem !important;
                border-radius: 1.5rem !important;
                max-width: 96vw !important;
                max-height: calc(100vh - 9rem) !important;
                background: rgba(10, 14, 28, 0.88) !important;
                backdrop-filter: blur(24px) saturate(1.4) !important;
                border: 1px solid rgba(255,255,255,0.06) !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04) !important;
                animation: mobileSlideUp 0.4s ease-out both !important;
            }


            .dash-header {
                padding-left: 0.75rem !important;
                padding-right: 0.75rem !important;
                height: 3.5rem !important;
            }
            .dash-header .header-title { display: none !important; }


            .workspace-col {
                max-width: 100vw !important;
                padding: 0 0.25rem !important;
                overflow-x: hidden !important;
                box-sizing: border-box !important;
            }


            .pagination-row {
                gap: 0.4rem !important;
                padding-bottom: 1.5rem !important;
                flex-wrap: nowrap !important;
            }


            ::-webkit-scrollbar { display: none !important; width: 0 !important; }
            * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
        }


        @media (max-width: 480px) {
            .catalog-grid {
                gap: 0.55rem !important;
                padding: 0 0.55rem !important;
            }
            .catalog-grid .card-cover {
                height: 12rem !important;
            }
            .dash-nav .q-btn {
                font-size: 0.48rem !important;
                padding: 5px 1px 3px !important;
                min-height: 44px !important;
            }
            .dash-nav .q-btn .q-icon {
                font-size: 18px !important;
            }
            .checkout-row .checkout-cover-img {
                width: 6.5rem !important;
                height: 9.5rem !important;
            }
            .checkout-row .checkout-title-text {
                font-size: 1.15rem !important;
            }
            .return-cover-img {
                width: 7.5rem !important;
                height: 11rem !important;
            }
            .catalog-title {
                font-size: 1.2rem !important;
            }
        }


        @media (max-width: 375px) {
            .catalog-grid .card-cover {
                height: 10rem !important;
            }
            .dash-nav .q-btn {
                font-size: 0.42rem !important;
            }
        }
    </style>
    ''')

    with ui.column().classes('scsu-bg w-full h-screen items-center pt-28 mobile-pt overflow-y-auto') as container:
        container.visible = False
        
        btn_refs = {} 

        def update_nav(selected_key):

            normal_style = 'text-slate-500 hover:text-blue-200 bg-transparent border-transparent shadow-none'
            for key, btn in btn_refs.items():
                btn.classes(remove='text-white bg-white/5 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-white/10', add=normal_style)
            

            active_style = 'text-white bg-white/5 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-white/10'
            btn_refs[selected_key].classes(remove=normal_style, add=active_style)


        def show_catalog():
            if not browse_only:
                checkout_workspace.visible, return_workspace.visible = False, False
            my_books_workspace.visible = False
            catalog_workspace.visible = True
            update_nav('catalog')

        def show_checkout():
            catalog_workspace.visible, return_workspace.visible = False, False
            my_books_workspace.visible = False
            checkout_workspace.visible = True
            checkout_input.run_method('focus')
            update_nav('checkout')

        def show_return():
            catalog_workspace.visible, checkout_workspace.visible = False, False
            my_books_workspace.visible = False
            return_workspace.visible = True
            return_input.run_method('focus')
            update_nav('return')


        async def show_my_books():
            catalog_workspace.visible = False
            if not browse_only:
                checkout_workspace.visible, return_workspace.visible = False, False
            my_books_workspace.visible = True
            update_nav('my_books')
            await on_my_books_load()

        

        with ui.row().classes('dash-nav items-center gap-1 p-1.5 rounded-full bg-slate-900/40 border border-white/5 backdrop-blur-2xl shadow-2xl mb-8 z-10 sticky top-4 transition-all'):
            
            base_classes = 'rounded-full px-6 py-2 text-xs font-bold tracking-widest transition-all duration-300 border border-transparent'
            

            btn_refs['catalog'] = ui.button('BROWSE', icon='img:/assets/ph-squares-four.svg', color=None, on_click=show_catalog).classes(base_classes).props('flat')
            if not browse_only:
                btn_refs['checkout'] = ui.button('CHECKOUT', icon='img:/assets/ph-shopping-cart.svg', color=None, on_click=show_checkout).classes(base_classes).props('flat')
                btn_refs['return'] = ui.button('RETURN', icon='img:/assets/ph-arrow-u-down-left.svg', color=None, on_click=show_return).classes(base_classes).props('flat')
            btn_refs['my_books'] = ui.button('MY BOOKS', icon='img:/assets/ph-book-open-text.svg', color=None, on_click=show_my_books).classes(base_classes).props('flat')
            

            ui.label('|').classes('nav-divider text-slate-700 mx-2 text-lg font-light')
            
            search_box = ui.input(placeholder='Search...').classes('nav-search-box w-64 text-xs').props('dark standout rounded-full dense')
            search_box.visible = False

            search_box.on('update:model-value', lambda e: on_search(e.args))
            
            def toggle_search():
                show_catalog() 
                search_box.visible = not search_box.visible
                if search_box.visible:
                    search_box.run_method('focus')

            ui.button('SEARCH', icon='img:/assets/ph-magnifying-glass.svg', color=None, on_click=toggle_search).classes('rounded-full text-xs font-bold tracking-widest text-slate-400 hover:text-white hover:bg-white/10 px-4 py-2').props('flat')
            

        update_nav('catalog')


        with ui.column().classes('workspace-col w-full max-w-6xl items-center pb-20') as catalog_workspace:
            ui.label('Current Collection').classes('catalog-title text-2xl text-white font-bold mb-8 tracking-wide w-full text-left px-4')
            
            catalog_grid = ui.element('div').classes('catalog-grid w-full').style(
                'display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 1.25rem; padding: 0 1rem;'
            )
            

            pagination_container = ui.row().classes('pagination-row w-full mt-8 items-center justify-center gap-2')

       

        checkout_input = checkout_cover = checkout_title = checkout_author = None
        checkout_due_date = cart_container = checkout_btn = empty_cart_message = None
        checkout_workspace = None
        if not browse_only:
            with ui.row().classes('checkout-row w-full max-w-6xl gap-6 pb-20 justify-center flex-nowrap') as checkout_workspace:
                checkout_workspace.visible = False

                with ui.card().classes('flex-1 w-full p-5 items-center text-center bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm'):
                    ui.label('SCAN TO ADD TO CART').classes('text-xs tracking-[0.3em] text-blue-500 font-bold mb-4')

                    checkout_input = ui.input(placeholder='Scan ISBN...').classes('w-full text-center text-lg mb-2').props('dark standout rounded-full')
                    checkout_input.on('keydown.enter', on_checkout_scan)
                    checkout_cover = ui.image('https://via.placeholder.com/200x300?text=Waiting...').classes('checkout-cover-img w-36 h-52 shadow-lg rounded-xl object-cover border border-slate-700 mb-3')
                    checkout_title = ui.label('---').classes('checkout-title-text text-xl text-white font-bold leading-tight')
                    checkout_author = ui.label('---').classes('checkout-author-text text-base text-slate-500 italic mt-1')
                    checkout_due_date = ui.label('').classes('text-sm text-blue-400 font-bold mt-1 tracking-wide')

                with ui.card().classes('flex-1 w-full p-5 flex flex-col bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm h-[420px]'):
                    ui.label('YOUR CART').classes('text-xs tracking-[0.3em] text-slate-500 font-bold mb-3')

                    with ui.column().classes('w-full flex-1 items-center justify-center') as empty_cart_message:
                        ui.image('/assets/ph-shopping-cart.svg').classes('w-14 h-14 brightness-0 invert opacity-40 mb-2')
                        ui.label('Cart is empty').classes('text-base text-slate-300 font-bold opacity-40')
                        ui.label('Scan a barcode to begin').classes('text-xs text-slate-400 opacity-40')

                    cart_container = ui.column().classes('w-full flex-1 overflow-y-auto gap-3 pr-2')

                    checkout_btn = ui.button('CONFIRM CHECKOUT (0)', on_click=on_checkout_confirm, color=None).classes(
                        'w-full h-14 mt-4 text-lg font-bold rounded-2xl text-slate-500 bg-white/5 border border-white/10 backdrop-blur-md transition-all duration-300'
                    )
                    checkout_btn.disable()


        return_input = return_cover = return_title = return_status = None
        return_workspace = None
        if not browse_only:
            with ui.card().classes('return-workspace-card w-full max-w-4xl p-10 items-center text-center bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm') as return_workspace:
                return_workspace.visible = False

                ui.label('QUICK RETURN').classes('text-xs tracking-[0.3em] text-blue-500 font-bold mb-6')

                return_input = ui.input(placeholder='Scan barcode to return...').classes('return-input w-96 text-center text-xl mb-2').props('dark standout rounded-full')
                return_input.on('keydown.enter', on_return_scan)

                with ui.row().classes('return-layout w-full items-center gap-16 justify-center'):
                    return_cover = ui.image('https://via.placeholder.com/200x300?text=Drop+Book').classes('return-cover-img w-56 h-80 shadow-lg rounded-xl object-cover border border-slate-700')
                    with ui.column().classes('items-start text-left flex-1'):
                        return_status = ui.label('WAITING FOR SCAN').classes('px-4 py-1.5 rounded-full text-[10px] tracking-widest font-black text-slate-400 bg-slate-800 border border-slate-700 mb-4')
                        return_title = ui.label('---').classes('return-title-text text-4xl text-white font-bold leading-tight tracking-tight')


        with ui.card().classes('my-books-card w-full max-w-4xl p-10 bg-[#151924]/80 border border-slate-700/50 rounded-[32px] shadow-2xl backdrop-blur-sm max-h-[80vh] overflow-y-auto') as my_books_workspace:
            my_books_workspace.visible = False

            ui.label('MY BORROWED BOOKS').classes('text-xs tracking-[0.3em] text-blue-500 font-bold mb-6')

            ui.label('Currently Checked Out').classes('text-lg text-white font-bold mb-3')
            active_loans_container = ui.column().classes('w-full gap-4 mb-8')

            with ui.column().classes('w-full items-center') as no_active_loans:
                ui.image('/assets/ph-check-circle.svg').classes('w-12 h-12 brightness-0 invert opacity-40 mb-2')
                ui.label('No books currently checked out').classes('text-slate-300 opacity-40')

            ui.element('div').classes('w-full h-px bg-slate-700/50 my-4')
            ui.label('Borrowing History').classes('text-lg text-white font-bold mb-3')
            history_container = ui.column().classes('w-full gap-3')

            with ui.column().classes('w-full items-center') as no_history:
                ui.image('/assets/ph-clock-counter-clockwise.svg').classes('w-12 h-12 brightness-0 invert opacity-40 mb-2')
                ui.label('No borrowing history yet').classes('text-slate-300 opacity-40')


    return (container, checkout_input, checkout_cover, checkout_title, checkout_author,
            cart_container, checkout_btn, return_input, return_cover, return_title,
            return_status, empty_cart_message, catalog_grid, checkout_due_date,
            active_loans_container, no_active_loans, history_container, no_history,
            pagination_container)