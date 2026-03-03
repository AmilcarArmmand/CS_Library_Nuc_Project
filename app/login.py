from nicegui import ui
from datetime import datetime

def create(on_login_success):


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
            justify-content: flex-start !important;
            padding-top: 15vh !important;
            position: relative !important;
            flex-shrink: 0 !important;
            gap: 1.5rem !important;
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


    with ui.element('div').classes('login-outer scsu-bg') as container:

        # Left panel
        with ui.element('div').classes('left-panel stripe-texture').style(
            'justify-content: flex-start !important; align-items: flex-start !important; padding: 3rem !important;'
        ):


            ui.image('/assets/scsu_logo.png').classes('brightness-0 invert').style(
                'width: 250px; height: auto; object-fit: contain; opacity: 0.95; filter: brightness(0) invert(1); margin-left: -43px;  margin-top: -60px;'
            )


            with ui.element('div').style('display:flex; flex-direction:column; align-items:flex-start; gap:4px; text-align:left; margin-top: -50px;'):
                ui.element('div').style('width:40px; height:2px; background:#3b82f6; box-shadow:0 0 12px rgba(59,130,246,0.7); margin: 0 0 16px 0;')


            ui.label('Department of Computer Science').style(
                'color:rgba(255,255,255,0.45); font-size:0.7rem; letter-spacing:0.14em; text-transform:uppercase; margin-top: -25px; margin-bottom: 3rem;'
            )
            

            with ui.element('div').style('display:flex; flex-direction:column; gap:2px; text-align:left; margin-top: 100px;'):
                ui.label('CS Library').style('font-size:2.6rem; color:white; font-weight:700; letter-spacing:-0.02em; line-height:1;')
                ui.label('Sign-in Portal').style('font-size:2.6rem; color:rgba(255,255,255,0.5); font-weight:700; letter-spacing:-0.02em; line-height:1;')
                ui.label('Sign-in to access the catalog of CS Books, checkout, return, etc.').style('color:rgba(255,255,255,0.45); font-size:0.7rem; letter-spacing:0.14em; text-transform:uppercase; max-width: 250px; line-height: 1.7; margin-top: 10px;')
                

            ui.label('© 2026 SCSU Capstone').style(
                'color:rgba(255,255,255,0.2); font-size:0.65rem; position:absolute; bottom:2.5rem; left:2.5rem;'
            )

        # Right panel
        with ui.element('div').classes('right-panel'):


            with ui.column().classes('w-[400px] gap-0'):


                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Welcome Back').classes('text-white font-black leading-none').style('font-size:3rem; letter-spacing:-0.03em;')
                    ui.label('').classes('text-white font-black leading-none').style('font-size:3rem; letter-spacing:-0.03em;')


                ui.element('div').classes('mb-5').style('width:40px; height:2px; background:#3b82f6; box-shadow:0 0 16px rgba(59,130,246,0.8);')


                ui.label('Scan your ID to enter CS Library Kiosk').classes('mb-7').style('color:rgba(148,163,184,1); font-size:0.75rem; letter-spacing:0.01em;')

                with ui.column().classes('w-full gap-1 mb-5'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('badge', size='14px').classes('text-blue-400')
                        ui.label('Student ID').classes('text-xs font-semibold text-white')
                    id_input = ui.input(placeholder='Enter or Scan your ID...').classes('w-full').props('dark standout autofocus')
                    id_input.on('keydown.enter', on_login_success)


                ui.button('Sign In', on_click=on_login_success, icon='login', color=None).classes(
                    'w-full h-11 text-sm font-bold rounded-xl text-white bg-blue-600/20 border border-blue-500/30 '
                    'hover:bg-blue-600/40 hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-all duration-300 mb-6'
                ).props('flat')


                with ui.row().classes('w-full items-center gap-3 pt-5 opacity-60').style('border-top: 1px solid rgba(51,65,85,0.6);'):
                    ui.icon('schedule', size='14px').classes('text-slate-400')
                    time_label = ui.label().classes('text-xs font-bold tracking-[0.2em] uppercase text-slate-400')
                    def update_time():
                        now = datetime.now()
                        time_label.text = now.strftime("%a, %b %d | %I:%M %p")
                    ui.timer(1.0, update_time)
                    update_time()

    return container, id_input
