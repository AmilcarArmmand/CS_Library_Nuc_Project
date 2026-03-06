from nicegui import ui
from datetime import datetime

def create(on_login_success):

    ui.add_head_html(r'''
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
            align-items: flex-start !important;
            justify-content: flex-start !important;
            padding: 3rem !important;
            position: relative !important;
            flex-shrink: 0 !important;
        }

        .right-panel {
            flex: 1 !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        @media (max-width: 768px) {
            .left-panel {
                display: none !important;
            }
            .login-outer {
                flex-direction: column !important;
                overflow: auto !important;
            }
            .right-panel {
                width: 100% !important;
                min-height: 100vh !important;
                padding: 2rem 1.5rem !important;
            }
            .right-panel .w-\[400px\] {
                width: 100% !important;
                max-width: 360px !important;
            }
            .login-welcome-text {
                font-size: 1.8rem !important;
            }
            .login-subtitle {
                font-size: 0.7rem !important;
            }
        }
    </style>
    ''')


    with ui.element('div').classes('login-outer scsu-bg') as container:


        with ui.element('div').classes('left-panel stripe-texture justify-start items-start p-12'):


            ui.image('/assets/scsu_logo.png').classes('brightness-0 invert w-[260px] h-auto object-contain opacity-95 -ml-11 -mt-6')
            with ui.column().classes('items-start gap-3 w-full -mt-6 mb-12'):
                ui.element('div').classes('w-16 h-0.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)]')
                ui.label('Department of Computer Science').classes('text-white/45 text-[0.65rem] tracking-[0.15em] uppercase font-bold')
            

            with ui.column().classes('gap-0.5 text-left mt-24'):
                ui.label('CS Library').classes('text-[2.6rem] text-white font-bold tracking-tighter leading-none')
                ui.label('Sign-in Portal').classes('text-[2.6rem] text-white/50 font-bold tracking-tighter leading-none')
                ui.label('Sign-in to access the catalog of CS Books, checkout, return, etc.').classes('text-white/45 text-[0.7rem] tracking-[0.14em] uppercase max-w-[250px] leading-relaxed mt-2.5')
                

            ui.label('© 2026 SCSU Capstone').classes(
                'text-white/20 text-[0.65rem] absolute bottom-10 left-10'
            )


        with ui.element('div').classes('right-panel'):


            with ui.column().classes('w-[400px] gap-0'):


                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Welcome Back').classes('login-welcome-text text-[3rem] tracking-[0.03em] text-white font-black leading-none')


                ui.element('div').classes('mb-5 w-10 h-0.5 bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)]')


                ui.label('Scan your ID to enter CS Library Kiosk').classes('mb-7 text-slate-400 text-xs tracking-wide')

                with ui.column().classes('w-full gap-1 mb-5'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('badge', size='14px').classes('text-blue-400')
                        ui.label('Student ID').classes('text-xs font-semibold text-white')
                    id_input = ui.input(placeholder='Enter or Scan your ID…').classes('w-full').props('dark standout autofocus')
                    id_input.on('keydown.enter', on_login_success)


                ui.button('Sign In', on_click=on_login_success, icon='login', color=None).classes(
                    'w-full max-w-sm h-14 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full font-bold '
                    'hover:bg-blue-600/40 hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-colors duration-300 mb-6'
                ).props('flat')


                with ui.row().classes('w-full items-center gap-3 pt-5 opacity-60 border-t border-slate-700/60'):
                    ui.icon('schedule', size='14px').classes('text-slate-400')
                    time_label = ui.label().classes('text-xs font-bold tracking-[0.2em] uppercase text-slate-400')
                    def update_time():
                        now = datetime.now()
                        time_label.text = now.strftime("%a, %b %d | %I:%M %p")
                    ui.timer(1.0, update_time)
                    update_time()

    return container, id_input
