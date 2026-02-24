from nicegui import ui # import nicegui and its UI library
from datetime import datetime # importing the date and time library to see live clock

def create(on_login_success): # define function called create, for NICEGUI its used to hand off the login page to main

    # inject left panel stripe texture
    ui.add_head_html('''
    <style>
        .stripe-texture {
            background-image: repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 8px,
                rgba(255,255,255,0.015) 8px,
                rgba(255,255,255,0.015) 16px
            );
        }

        /* Force the two panels to sit side by side and fill the screen */
        .login-outer {
            display: flex !important;
            flex-direction: row !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .left-panel {
            width: 42% !important;
            min-width: 42% !important;
            height: 100% !important;
            background-color: #0a1f44 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important; /* Pushes content to the top */
            padding-top: 15vh !important; /* Drops the logo down a bit from the top edge */
            position: relative !important; /* Traps the absolute footer inside this panel */
            flex-shrink: 0 !important;
            gap: 1.5rem !important; /* Tightens the spacing between text elements */
        }

        .right-panel {
            flex: 1 !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
    </style>
    ''')

    # creating the outer two-panel container
    with ui.element('div').classes('login-outer scsu-bg') as container:

        # ── LEFT PANEL ─────────────────────────────────────────────────────
        # justify-content: flex-start and align-items: flex-start moves everything top-left
        with ui.element('div').classes('left-panel stripe-texture').style(
            'justify-content: flex-start !important; align-items: flex-start !important; padding: 3rem !important;'
        ):

            # Fixed Logo: 250px width as requested
            ui.image('/assets/scsu_logo.png').classes('brightness-0 invert').style(
                'width: 250px; height: auto; object-fit: contain; opacity: 0.95; filter: brightness(0) invert(1); margin-left: -43px;  margin-top: -60px;'
            )

            # Fixed Underline: -50px margin-top to pull it tight to the 250px logo
            with ui.element('div').style('display:flex; flex-direction:column; align-items:flex-start; gap:4px; text-align:left; margin-top: -50px;'):
                ui.element('div').style('width:40px; height:2px; background:#3b82f6; box-shadow:0 0 12px rgba(59,130,246,0.7); margin: 0 0 16px 0;')

            # Department Label: -25px margin-top as requested
            ui.label('Department of Computer Science').style(
                'color:rgba(255,255,255,0.45); font-size:0.7rem; letter-spacing:0.14em; text-transform:uppercase; margin-top: -25px; margin-bottom: 3rem;'
            )
            
            # Titles: Left-aligned to match the logo group
            with ui.element('div').style('display:flex; flex-direction:column; gap:2px; text-align:left; margin-top: 100px;'):
                ui.label('CS Library').style('font-size:2.6rem; color:white; font-weight:700; letter-spacing:-0.02em; line-height:1;')
                ui.label('Sign-in Portal').style('font-size:2.6rem; color:rgba(255,255,255,0.5); font-weight:700; letter-spacing:-0.02em; line-height:1;')
                ui.label('Sign-in to access the catalog of CS Books, checkout, return, etc.').style('color:rgba(255,255,255,0.45); font-size:0.7rem; letter-spacing:0.14em; text-transform:uppercase; max-width: 250px; line-height: 1.7; margin-top: 10px;')
                
            # Fixed Footer: Pinned to bottom-left
            ui.label('© 2026 SCSU Capstone').style(
                'color:rgba(255,255,255,0.2); font-size:0.65rem; position:absolute; bottom:2.5rem; left:2.5rem;'
            )

        # ── RIGHT PANEL ────────────────────────────────────────────────────
        # reuse the existing scsu-bg starry background
        with ui.element('div').classes('right-panel'):

            # floating form — no card, sits directly on the stars
            with ui.column().classes('w-[400px] gap-0'):

                # Welcome / Back. heading
                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Welcome Back').classes('text-white font-black leading-none').style('font-size:3rem; letter-spacing:-0.03em;')
                    ui.label('').classes('text-white font-black leading-none').style('font-size:3rem; letter-spacing:-0.03em;')

                # glowing blue accent bar
                ui.element('div').classes('mb-5').style('width:40px; height:2px; background:#3b82f6; box-shadow:0 0 16px rgba(59,130,246,0.8);')

                # subtitle
                ui.label('Scan your ID to enter CS Library Kiosk').classes('mb-7').style('color:rgba(148,163,184,1); font-size:0.75rem; letter-spacing:0.01em;')

                # Student ID field
                with ui.column().classes('w-full gap-1 mb-5'):
                    with ui.row().classes('items-center gap-2 mb-1'): # within column create a row to put a image next to label
                        ui.icon('badge', size='14px').classes('text-blue-400')
                        ui.label('Student ID').classes('text-xs font-semibold text-white')
                    # create the input box, with dark look, placeholder in input box
                    id_input = ui.input(placeholder='Enter or Scan your ID...').classes('w-full').props('dark standout autofocus')
                    id_input.on('keydown.enter', on_login_success) # when you press the enter key it sends the signal to main.py to login

                # Sign In button
                ui.button('Sign In', on_click=on_login_success, icon='login', color=None).classes(
                    'w-full h-11 text-sm font-bold rounded-xl text-white bg-blue-600/20 border border-blue-500/30 '
                    'hover:bg-blue-600/40 hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-all duration-300 mb-6'
                ).props('flat')

                # still in the card, add a row to put a border to separate time
                with ui.row().classes('w-full items-center gap-3 pt-5 opacity-60').style('border-top: 1px solid rgba(51,65,85,0.6);'):
                    ui.icon('schedule', size='14px').classes('text-slate-400')
                    # css for the time label
                    time_label = ui.label().classes('text-xs font-bold tracking-[0.2em] uppercase text-slate-400')
                    # small function for the clock to work
                    def update_time():
                        # getting the current time and date
                        now = datetime.now()
                        time_label.text = now.strftime("%a, %b %d | %I:%M %p") # Format: MON, FEB 16 | 10:30 PM
                    # tells UI to auto update every 1 second
                    ui.timer(1.0, update_time)
                    update_time() # Run once immediately

    return container, id_input # take the whole container and input and return it to who calls it