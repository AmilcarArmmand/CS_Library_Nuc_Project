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
        .reg-link {
            color: #3b82f6;
            cursor: pointer;
            text-decoration: underline;
            font-size: 0.75rem;
        }
        .reg-link:hover { color: #60a5fa; }

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
        }
    </style>
    ''')

    with ui.element('div').classes('login-outer scsu-bg') as container:

        with ui.element('div').classes('dark-stripe-bg'):

            with ui.column().classes('absolute top-6 left-8 gap-2 z-10 items-start'):
                ui.image('/assets/scsu_logo.png').classes(
                    'brightness-0 invert w-[200px] h-auto object-contain'
                )
                ui.element('div').classes('w-12 h-[3px] bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.7)] ml-8 -mt-8')
                ui.label('DEPARTMENT OF COMPUTER SCIENCE').classes(
                    'text-slate-400/80 text-[0.65rem] tracking-[0.15em] font-bold uppercase ml-8 -mt-0'
    )

            with ui.column().classes('absolute top-1/2 left-12 md:left-16 -translate-y-1/2 gap-2 z-10'):
                ui.label('CS Library').classes('text-[3.5rem] tracking-tighter text-white font-black leading-[0.85] drop-shadow-md')
                ui.label('Web Portal.').classes('text-[3.5rem] tracking-tighter text-slate-400 font-black leading-[0.85]')
                ui.label('SIGN-IN TO ACCESS THE CATALOG OF CS BOOKS, CHECKOUT, RETURN, ETC.').classes(
                    'text-slate-400/60 text-[0.65rem] tracking-[0.15em] uppercase max-w-[280px] leading-relaxed mt-6 font-bold'
                )

            ui.label('© 2026 SCSU Capstone').classes(
                'absolute bottom-8 left-12 md:bottom-12 md:left-16 text-slate-500/40 text-[0.6rem] z-10 tracking-wider'
            )

        with ui.element('div').classes('right-panel'):
            with ui.column().classes('w-[400px] gap-0'):

                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Welcome Back').classes(
                        'login-welcome-text text-[3rem] tracking-[-0.03em] text-white font-black leading-none'
                    )

                ui.element('div').classes('mb-5 w-10 h-0.5 bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)]')

                ui.label('Sign in with your email and password').classes('mb-6 text-slate-400 text-xs tracking-wide')

                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('email', size='14px').classes('text-blue-400')
                        ui.label('Email Address').classes('text-xs font-semibold text-white')
                    email_input = ui.input(
                        placeholder='you@example.com'
                    ).classes('w-full').props('dark standout autofocus type=email')

                with ui.column().classes('w-full gap-1 mb-5'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('lock', size='14px').classes('text-blue-400')
                        ui.label('Password').classes('text-xs font-semibold text-white')
                    password_input = ui.input(
                        placeholder='Enter your password'
                    ).classes('w-full').props('dark standout type=password')
                    password_input.on('keydown.enter', on_login_success)

                email_input.on('keydown.enter', lambda: password_input.run_method('focus'))

                ui.button('Sign In', on_click=on_login_success, icon='login', color=None).classes(
                    'w-full max-w-sm h-14 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full font-bold '
                    'hover:bg-blue-600/40 hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-colors duration-300 mb-4'
                ).props('flat')

                with ui.row().classes('w-full justify-center mb-5'):
                    ui.label("Don't have an account? ").classes('text-white/60 text-xs')
                    ui.label('Create one').classes('reg-link').on(
                        'click', lambda: ui.navigate.to('/register')
                    )

                with ui.row().classes('w-full items-center gap-3 pt-5 opacity-60 border-t border-slate-700/60'):
                    ui.icon('schedule', size='14px').classes('text-slate-400')
                    time_label = ui.label().classes(
                        'text-xs font-bold tracking-[0.2em] uppercase text-slate-400'
                    )

                    def update_time():
                        time_label.text = datetime.now().strftime('%a, %b %d | %I:%M %p')

                    update_time()

    email_input.password_input = password_input

    return container, email_input
