from nicegui import ui
from datetime import datetime


def create(on_login_success):

    ui.add_head_html(r'''
    <style>
        .login-outer {
            display: flex !important;
            flex-direction: row !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .dark-stripe-bg {
            background-color: #020617;
            background-image:
                repeating-linear-gradient(
                    -45deg,
                    transparent,
                    transparent 8px,
                    rgba(255,255,255,0.015) 8px,
                    rgba(255,255,255,0.015) 16px
                ),
                radial-gradient(ellipse at 15% 20%, rgba(37, 99, 235, 0.4) 0%, transparent 60%);
            position: relative;
            overflow: hidden;
            width: 45% !important;
            min-width: 45% !important;
            display: flex !important;
            flex-direction: column !important;
            flex-shrink: 0 !important;
        }

        .right-panel {
            flex: 1 !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        .left-login-header {
            top: 1.35rem !important;
            left: 1.5rem !important;
        }
        .left-login-accent {
            width: 1.35rem !important;
            margin-left: 0.95rem !important;
            margin-top: -1.15rem !important;
            align-self: flex-start !important;
        }
        .left-login-dept {
            margin-left: 0.95rem !important;
        }

        @media (max-width: 768px) {
            .dark-stripe-bg {
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

        @media (max-height: 500px) and (min-width: 700px) {
            .dark-stripe-bg {
                width: 40% !important;
                min-width: 40% !important;
            }
            .left-login-header {
                top: 1rem !important;
                left: 0.45rem !important;
            }
            .left-login-accent {
                width: 1.2rem !important;
                margin-left: 1.2rem !important;
                margin-top: -1.35rem !important;
            }
            .left-login-dept {
                margin-left: 1.2rem !important;
            }
            .left-login-copy {
                left: 1.3rem !important;
            }
            .left-login-footer {
                left: 1.3rem !important;
            }
            .login-left-logo {
                width: 120px !important;
            }
            .left-login-dept {
                font-size: 0.42rem !important;
            }
            .left-login-display {
                font-size: 1.95rem !important;
            }
            .left-login-display-kiosk {
                font-size: 2.45rem !important;
            }
            .left-login-tagline {
                font-size: 0.4rem !important;
                max-width: 148px !important;
                margin-top: 0.55rem !important;
            }
            .left-login-footer {
                font-size: 0.4rem !important;
            }

            .right-panel {
                align-items: center !important;
                padding-top: 0 !important;
                justify-content: center !important;
            }
            .right-panel .w-\[400px\] {
                width: 256px !important;
            }
            .login-welcome-text {
                font-size: 1.4rem !important;
                line-height: 1.35rem !important;
            }
            .login-subtitle {
                font-size: 0.5rem !important;
                margin-bottom: 0.45rem !important;
            }
            .right-panel .q-field__control {
                min-height: 32px !important;
            }
            .right-panel .q-btn {
                height: 34px !important;
                min-height: 34px !important;
            }
            .right-panel .text-xs {
                font-size: 0.5rem !important;
            }
            .right-panel .mb-7 {
                margin-bottom: 0.4rem !important;
            }
            .right-panel .mb-6 {
                margin-bottom: 0.35rem !important;
            }
            .right-panel .pt-5 {
                padding-top: 0.32rem !important;
            }
        }
    </style>
    ''')

    with ui.element('div').classes('login-outer scsu-bg') as container:

        with ui.element('div').classes('dark-stripe-bg'):

            with ui.column().classes('left-login-header absolute gap-2 z-10 items-start'):
                ui.image('/assets/scsu_logo.png').classes(
                    'login-left-logo brightness-0 invert w-[200px] h-auto object-contain'
                )
                ui.element('div').classes('left-login-accent w-8 h-[3px] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)] mt-1')
                ui.label('DEPARTMENT OF COMPUTER SCIENCE').classes(
                    'left-login-dept text-slate-400/80 text-[0.65rem] tracking-[0.15em] font-bold uppercase -mt-0'
                )

            with ui.column().classes('left-login-copy absolute top-1/2 left-12 md:left-16 -translate-y-1/2 gap-2 z-10'):
                ui.label('CS Library').classes('left-login-display text-[3.5rem] tracking-tighter text-white font-black leading-[0.85] drop-shadow-md')
                ui.label('Kiosk.').classes('left-login-display-kiosk text-[4.5rem] tracking-tighter text-slate-400 font-black leading-[0.85]')
                ui.label('SIGN-IN TO ACCESS THE CATALOG OF CS BOOKS, CHECKOUT, RETURN, ETC.').classes(
                    'left-login-tagline text-slate-400/60 text-[0.65rem] tracking-[0.15em] uppercase max-w-[280px] leading-relaxed mt-6 font-bold'
                )

            ui.label('© 2026 SCSU Capstone').classes(
                'left-login-footer absolute bottom-8 left-12 md:bottom-12 md:left-16 text-slate-500/40 text-[0.6rem] z-10 tracking-wider'
            )

        with ui.element('div').classes('right-panel'):

            with ui.column().classes('w-[400px] gap-0'):

                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Welcome Back').classes('login-welcome-text text-[3rem] tracking-[0.03em] text-white font-black leading-none')

                ui.element('div').classes('mb-5 w-10 h-0.5 bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)]')

                ui.label('Scan your ID to enter CS Library Kiosk').classes('login-subtitle mb-7 text-slate-400 text-xs tracking-wide')

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
                        time_label.text = now.strftime('%a, %b %d | %I:%M %p')

                    ui.timer(1.0, update_time)
                    update_time()

    return container, id_input
