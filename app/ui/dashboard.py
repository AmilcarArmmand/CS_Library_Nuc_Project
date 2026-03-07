import inspect

from nicegui import background_tasks, ui

class DashboardUI:
    PANEL_SURFACE_CLASSES = (
        'bg-[#151924]/84 border border-slate-700/55 rounded-2xl '
        'shadow-[0_24px_44px_-22px_rgba(2,6,23,0.95),0_0_0_1px_rgba(59,130,246,0.08)] '
        'backdrop-blur-xl transition-all duration-500 hover:border-blue-400/30 '
        'hover:shadow-[0_30px_52px_-20px_rgba(2,6,23,0.98),0_0_0_1px_rgba(59,130,246,0.18)]'
    )
    PANEL_TITLE_CLASSES = (
        'text-xs md:text-sm tracking-[0.3em] font-black text-transparent bg-clip-text '
        'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 '
        'drop-shadow-[0_2px_8px_rgba(30,64,175,0.35)] text-balance'
    )

    def __init__(self, on_checkout_scan=None, on_checkout_confirm=None, on_return_scan=None, on_search=None, on_catalog_filter=None, on_my_books_load=None, on_next_page=None, on_prev_page=None, browse_only=False):
        self.on_checkout_scan = on_checkout_scan or (lambda e: None)
        self.on_checkout_confirm = on_checkout_confirm or (lambda: None)
        self.on_return_scan = on_return_scan or (lambda e: None)
        self.on_search = on_search or (lambda q: None)
        self.on_catalog_filter = on_catalog_filter or (lambda f: None)
        self.on_my_books_load = on_my_books_load or (lambda: None)
        self.on_next_page = on_next_page or (lambda: None)
        self.on_prev_page = on_prev_page or (lambda: None)
        self.browse_only = browse_only

        self.btn_refs = {}
        self.filter_btn_refs = {}
        self.current_filter = 'all'
        
        self._build_head_html()
        
        with ui.column().classes(
            'scsu-bg w-full h-screen items-center pt-[calc(6rem+env(safe-area-inset-top))] '
            'md:pt-28 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-20 overflow-y-auto'
        ) as self.container:
            self.container.visible = False

            self._build_navigation()
            self._build_catalog_workspace()
            
            if not self.browse_only:
                self._build_checkout_workspace()
                self._build_return_workspace()
            
            self._build_my_books_workspace()
        
        self.update_nav('catalog')

    def _dispatch(self, callback, *args):
        result = callback(*args)
        if inspect.isawaitable(result):
            background_tasks.create(result)
        
    def _build_head_html(self):
        ui.add_head_html('''
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
        <style>
            .dash-nav .q-btn::before { display: none !important; }
            .dash-nav .q-btn .q-icon img,
            .pagination-row .q-btn .q-icon img {
                width: 20px !important; height: 20px !important;
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
            @media (max-width: 768px) {
                .dash-nav .q-btn .q-btn__content { flex-direction: column !important; gap: 2px !important; }
                .dash-nav .q-btn .q-icon { font-size: 20px !important; margin: 0 !important; }
                .nav-search-box {
                    position: absolute !important; bottom: calc(100% + 1rem) !important;
                    left: 1.5rem !important; right: 1.5rem !important; width: auto !important; z-index: 210 !important;
                }
                .nav-search-box .q-field__control, .nav-search-box.q-field--standout .q-field__control {
                    background: #0f172a !important; backdrop-filter: blur(30px) !important;
                    border: 1px solid rgba(59,130,246,0.8) !important;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
                    border-radius: 9999px !important;
                }
                .catalog-grid .q-card { animation: mobileCardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .catalog-grid .q-card:active { transform: scale(0.98) !important; }
                .catalog-grid .q-card:nth-child(1)  { animation-delay: 0.02s; }
                .catalog-grid .q-card:nth-child(2)  { animation-delay: 0.06s; }
                .catalog-grid .q-card:nth-child(3)  { animation-delay: 0.10s; }
                .catalog-grid .q-card:nth-child(4)  { animation-delay: 0.14s; }
                .catalog-grid .q-card:nth-child(5)  { animation-delay: 0.18s; }
                .catalog-grid .q-card:nth-child(6)  { animation-delay: 0.22s; }
                .catalog-filter-row { justify-content: flex-start !important; overflow-x: auto; flex-wrap: nowrap !important; }
                ::-webkit-scrollbar { display: none !important; width: 0 !important; }
                * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
            }
            @media (max-height: 500px) and (min-width: 700px) {
                .scsu-bg.nicegui-column {
                    padding-top: calc(4.05rem + env(safe-area-inset-top)) !important;
                    padding-bottom: calc(0.35rem + env(safe-area-inset-bottom)) !important;
                }
                .dash-nav {
                    margin-bottom: 0.7rem !important;
                    padding: 0.25rem !important;
                }
                .dash-nav .q-btn {
                    min-height: 40px !important;
                    font-size: 0.68rem !important;
                    padding-top: 0.25rem !important;
                    padding-bottom: 0.25rem !important;
                }
                .workspace-col {
                    padding-bottom: 0.5rem !important;
                }
                .workspace-col > .nicegui-row:first-child {
                    margin-bottom: 0.25rem !important;
                }
                .catalog-title {
                    font-size: 1.4rem !important;
                    line-height: 1.7rem !important;
                }
                .catalog-filter-row {
                    margin-bottom: 0.45rem !important;
                    gap: 0.4rem !important;
                }
                .catalog-filter-row .q-btn {
                    min-height: 32px !important;
                    font-size: 0.64rem !important;
                    padding-top: 0.2rem !important;
                    padding-bottom: 0.2rem !important;
                }
                .catalog-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    gap: 0.62rem !important;
                }
                .catalog-grid .card-cover {
                    height: 154px !important;
                    aspect-ratio: auto !important;
                }
                .pagination-row {
                    margin-top: 0.35rem !important;
                }
                .pagination-row .q-btn { min-height: 30px !important; }
            }
        </style>
        ''')

    def update_nav(self, selected_key):
        normal_style = 'text-slate-300 hover:text-blue-100 bg-transparent border-transparent shadow-none'
        for btn in self.btn_refs.values():
            btn.classes(remove='text-white bg-white/5 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-white/10', add=normal_style)
        
        active_style = 'text-white bg-white/5 shadow-[0_0_20px_rgba(59,130,246,0.5)] border-white/10'
        if selected_key in self.btn_refs:
            self.btn_refs[selected_key].classes(remove=normal_style, add=active_style)

    def show_catalog(self):
        if not self.browse_only:
            self.checkout_workspace.visible, self.return_workspace.visible = False, False
        self.my_books_workspace.visible = False
        self.catalog_workspace.visible = True
        self.update_nav('catalog')

    def show_checkout(self):
        self.catalog_workspace.visible, self.return_workspace.visible = False, False
        self.my_books_workspace.visible = False
        self.checkout_workspace.visible = True
        self.checkout_input.run_method('focus')
        self.update_nav('checkout')

    def show_return(self):
        self.catalog_workspace.visible, self.checkout_workspace.visible = False, False
        self.my_books_workspace.visible = False
        self.return_workspace.visible = True
        self.return_input.run_method('focus')
        self.update_nav('return')

    async def show_my_books(self):
        self.catalog_workspace.visible = False
        if not self.browse_only:
            self.checkout_workspace.visible, self.return_workspace.visible = False, False
        self.my_books_workspace.visible = True
        self.update_nav('my_books')
        await self.on_my_books_load()

    def _build_navigation(self):
        with ui.row().classes(
            'dash-nav catalog-dock-nav flex-nowrap fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-auto '
            'left-4 right-4 md:left-auto md:right-auto md:sticky md:top-[calc(1.25rem+env(safe-area-inset-top))] '
            'w-auto md:w-auto items-center gap-1 p-1 md:p-1.5 rounded-full bg-slate-900/50 md:bg-slate-900/45 '
            'border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] '
            'z-[200] justify-around md:justify-center transition-[transform,opacity] mb-0 md:mb-8 mx-auto max-w-[420px] md:max-w-none '
            'mt-3 md:mt-20'
        ):
            base_classes = (
                'group flex-1 md:flex-none rounded-full px-1 md:px-6 py-2 min-h-[52px] md:min-h-0 '
                'text-[10px] md:text-xs font-bold tracking-[0.05em] md:tracking-widest '
                'transition-all duration-200 ease-out active:scale-[0.92] hover:bg-white/10 '
                'border border-transparent hover:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] '
                'flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-manipulation'
            )

            self.btn_refs['catalog'] = ui.button('BROWSE', icon='img:/assets/ph-squares-four.svg', color=None, on_click=self.show_catalog).classes(base_classes).props('flat')
            if not self.browse_only:
                self.btn_refs['checkout'] = ui.button('CHECKOUT', icon='img:/assets/ph-shopping-cart.svg', color=None, on_click=self.show_checkout).classes(base_classes).props('flat')
                self.btn_refs['return'] = ui.button('RETURN', icon='img:/assets/ph-arrow-u-down-left.svg', color=None, on_click=self.show_return).classes(base_classes).props('flat')

            self.btn_refs['my_books'] = ui.button('MY BOOKS', icon='img:/assets/ph-book-open-text.svg', color=None, on_click=self.show_my_books).classes(base_classes).props('flat')

            ui.label('|').classes('hidden md:block text-slate-700 mx-2 text-lg font-light')

            self.search_box = ui.input(placeholder='Search…').classes('nav-search-box w-full md:w-64 text-sm md:text-xs').props('dark standout rounded-full dense debounce=250')
            self.search_box.visible = False
            self.search_box.on('update:model-value', lambda e: self._dispatch(self.on_search, e.args))

            def toggle_search():
                self.show_catalog()
                self.search_box.visible = not self.search_box.visible
                if self.search_box.visible:
                    self.search_box.run_method('focus')

            ui.button('SEARCH', icon='img:/assets/ph-magnifying-glass.svg', color=None, on_click=toggle_search).classes(base_classes + ' text-slate-400 hover:text-white hover:bg-white/10').props('flat')

    def _build_catalog_workspace(self):
        with ui.column().classes('workspace-col w-full max-w-7xl items-center pb-20 px-0 md:px-6') as self.catalog_workspace:
            with ui.row().classes('w-full items-end justify-between px-6 md:px-0 mb-3 gap-2 flex-wrap'):
                ui.label('Library Catalog').classes('catalog-title text-xl text-balance md:text-2xl text-white font-bold tracking-wide text-left')
                with ui.column().classes('items-start md:items-end gap-0'):
                    self.catalog_count_label = ui.label('Showing 0 books').classes('text-xs md:text-sm text-slate-300 font-semibold tracking-wide')
                    self.catalog_page_label = ui.label('Page 1 of 1').classes('text-[11px] md:text-xs text-slate-500 font-semibold tracking-[0.08em] uppercase')

            with ui.row().classes('catalog-filter-row w-full px-4 md:px-0 mb-5 gap-2 md:gap-3 items-center'):
                self.filter_btn_refs['all'] = ui.button('ALL', color=None, on_click=lambda _=None: self.set_catalog_filter('all')).classes(
                    'rounded-full px-4 py-2 text-[11px] md:text-xs tracking-widest font-black border transition-all duration-200 active:scale-[0.95]'
                ).props('flat')
                self.filter_btn_refs['available'] = ui.button('AVAILABLE', color=None, on_click=lambda _=None: self.set_catalog_filter('available')).classes(
                    'rounded-full px-4 py-2 text-[11px] md:text-xs tracking-widest font-black border transition-all duration-200 active:scale-[0.95]'
                ).props('flat')
                self.filter_btn_refs['checked_out'] = ui.button('CHECKED OUT', color=None, on_click=lambda _=None: self.set_catalog_filter('checked_out')).classes(
                    'rounded-full px-4 py-2 text-[11px] md:text-xs tracking-widest font-black border transition-all duration-200 active:scale-[0.95]'
                ).props('flat')
            self._refresh_filter_styles()
            
            self.catalog_grid = ui.element('div').classes('catalog-grid w-full grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5 px-4 md:px-0')
            
            self.pagination_container = ui.row().classes('pagination-row w-full mt-10 items-center justify-center gap-2 px-4 flex-wrap')

    def _refresh_filter_styles(self):
        inactive = 'bg-white/[0.04] text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
        active = 'bg-blue-500/20 text-white border-blue-500/50 shadow-[0_0_12px_rgba(59,130,246,0.35)]'
        for key, btn in self.filter_btn_refs.items():
            if key == self.current_filter:
                btn.classes(remove=inactive, add=active)
            else:
                btn.classes(remove=active, add=inactive)

    def set_catalog_filter(self, filter_key: str, *, trigger: bool = True):
        self.current_filter = filter_key if filter_key in {'all', 'available', 'checked_out'} else 'all'
        self._refresh_filter_styles()
        if trigger:
            self._dispatch(self.on_catalog_filter, self.current_filter)

    def set_catalog_summary(self, shown_count: int, total_count: int, current_page: int, total_pages: int):
        self.catalog_count_label.text = f'Showing {shown_count} of {total_count} books'
        self.catalog_page_label.text = f'Page {current_page} of {total_pages}'

    def _build_checkout_workspace(self):
        with ui.row().classes('checkout-row w-full max-w-6xl gap-6 pb-20 justify-center flex-col md:flex-row px-4 md:px-0 flex-nowrap min-w-0') as self.checkout_workspace:
            self.checkout_workspace.visible = False

            with ui.card().classes(f'w-full md:flex-1 p-6 md:p-8 items-center text-center {self.PANEL_SURFACE_CLASSES} animate-[mobileSlideUp_0.4s_ease-out] md:animate-none min-w-0'):
                ui.label('SCAN TO ADD TO CART').classes(f'mb-4 md:mb-6 {self.PANEL_TITLE_CLASSES}')

                self.checkout_input = ui.input(placeholder='Scan ISBN…').classes('w-full text-center text-lg md:text-xl mb-4 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/40 focus-within:scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.15)]').props('dark standout rounded-full')
                self.checkout_input.on('keydown.enter', self.on_checkout_scan)
                self.checkout_cover = ui.image('https://via.placeholder.com/200x300?text=Waiting…').classes('checkout-cover-img w-32 md:w-40 h-48 md:h-60 shadow-xl rounded-xl object-cover border border-slate-600 mb-4')
                self.checkout_title = ui.label('---').classes('checkout-title-text text-xl md:text-2xl text-balance text-white font-bold leading-tight px-2 w-full truncate')
                self.checkout_author = ui.label('---').classes('checkout-author-text text-sm md:text-base text-slate-400 italic mt-1 w-full truncate')
                self.checkout_due_date = ui.label('').classes('text-sm md:text-base text-blue-400 font-bold mt-2 tracking-wide w-full truncate')

            with ui.card().classes(f'w-full md:flex-1 p-6 md:p-8 flex flex-col {self.PANEL_SURFACE_CLASSES} h-[400px] md:h-[500px] animate-[mobileSlideUp_0.5s_ease-out] md:animate-none'):
                ui.label('YOUR CART').classes(f'mb-4 {self.PANEL_TITLE_CLASSES}')

                with ui.column().classes('w-full flex-1 items-center justify-center') as self.empty_cart_message:
                    ui.image('/assets/ph-shopping-cart.svg').classes('w-12 h-12 md:w-16 md:h-16 brightness-0 invert opacity-30 mb-3')
                    ui.label('Cart is empty').classes('text-base text-balance md:text-lg text-slate-400 font-bold opacity-50')
                    ui.label('Scan a barcode to begin').classes('text-xs text-balance md:text-sm text-slate-500 opacity-50 mt-1')

                self.cart_container = ui.column().classes('w-full flex-1 overflow-y-auto gap-3 pr-2')

                self.checkout_btn = ui.button('CONFIRM CHECKOUT (0)', on_click=self.on_checkout_confirm, color=None).classes(
                    'w-full h-14 md:h-16 mt-4 text-base md:text-lg font-bold rounded-2xl text-slate-500 bg-white/5 border border-white/10 backdrop-blur-md transition-colors duration-300 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-manipulation'
                )
                self.checkout_btn.disable()

    def _build_return_workspace(self):
        with ui.card().classes(f'return-workspace-card min-w-0 w-full max-w-4xl p-8 md:p-12 mx-4 md:mx-0 items-center text-center {self.PANEL_SURFACE_CLASSES} animate-[mobileSlideUp_0.4s_ease-out] md:animate-none') as self.return_workspace:
            self.return_workspace.visible = False

            ui.label('QUICK RETURN').classes(f'mb-6 md:mb-8 {self.PANEL_TITLE_CLASSES}')

            self.return_input = ui.input(placeholder='Scan barcode…').classes('return-input w-full md:w-2/3 text-center text-lg md:text-2xl mb-6 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/40 focus-within:scale-[1.02] shadow-[0_0_15px_rgba(59,130,246,0.15)]').props('dark standout rounded-full')
            self.return_input.on('keydown.enter', self.on_return_scan)

            with ui.row().classes('return-layout min-w-0 w-full flex-col md:flex-row items-center gap-8 md:gap-16 justify-center'):
                self.return_cover = ui.image('https://via.placeholder.com/200x300?text=Drop+Book').classes('return-cover-img shrink-0 w-40 md:w-56 h-60 md:h-80 shadow-2xl rounded-2xl object-cover border border-slate-600')
                with ui.column().classes('items-center md:items-start text-center md:text-left flex-1 px-4 md:px-0 min-w-0'):
                    self.return_status = ui.label('WAITING FOR SCAN').classes('px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs tracking-[0.15em] md:tracking-widest font-black text-slate-400 bg-slate-800 border border-slate-600 mb-4 md:mb-6')
                    self.return_title = ui.label('---').classes('return-title-text w-full truncate text-2xl md:text-4xl text-balance text-white font-bold leading-tight md:leading-tight tracking-tight')

    def _build_my_books_workspace(self):
        with ui.card().classes(f'my-books-card w-full mx-4 md:mx-0 max-w-4xl p-6 md:p-10 {self.PANEL_SURFACE_CLASSES} max-h-[75vh] md:max-h-[85vh] overflow-y-auto animate-[mobileSlideUp_0.4s_ease-out] md:animate-none min-w-0') as self.my_books_workspace:
            self.my_books_workspace.visible = False

            ui.label('MY BORROWED BOOKS').classes(f'mb-6 md:mb-8 w-full text-center md:text-left {self.PANEL_TITLE_CLASSES}')

            ui.label('Currently Checked Out').classes('text-base md:text-lg text-white font-bold mb-4')
            self.active_loans_container = ui.column().classes('w-full gap-4 mb-8 min-w-0')

            with ui.column().classes('w-full items-center py-6') as self.no_active_loans:
                ui.image('/assets/ph-check-circle.svg').classes('w-12 h-12 brightness-0 invert opacity-30 mb-3')
                ui.label('No books currently checked out').classes('text-slate-400 opacity-60 text-sm')

            ui.element('div').classes('w-full h-px bg-slate-700/50 my-6')
            
            ui.label('Borrowing History').classes('text-base md:text-lg text-white font-bold mb-4')
            self.history_container = ui.column().classes('w-full gap-3 min-w-0')

            with ui.column().classes('w-full items-center py-6') as self.no_history:
                ui.image('/assets/ph-clock-counter-clockwise.svg').classes('w-12 h-12 brightness-0 invert opacity-30 mb-3')
                ui.label('No borrowing history yet').classes('text-slate-400 opacity-60 text-sm')
