# Account registration page for CS Library Kiosk.

from nicegui import ui
from datetime import datetime


def create(on_register_success, on_back_to_login):



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
            display: flex !important; flex-direction: row !important;
            width: 100vw !important; height: 100vh !important;
            overflow: hidden !important; margin: 0 !important; padding: 0 !important;
        }
        .left-panel {
            width: 42% !important; min-width: 42% !important;
            height: 100% !important; background-color: #0a1f44 !important;
            display: flex !important; flex-direction: column !important;
            align-items: flex-start !important; justify-content: flex-start !important;
            padding: 3rem !important; position: relative !important; flex-shrink: 0 !important;
        }
        .right-panel {
            flex: 1 !important; height: 100% !important;
            display: flex !important; align-items: center !important;
            justify-content: center !important;
        }
        .back-link { color:#3b82f6; cursor:pointer; text-decoration:underline; font-size:0.75rem; }
        .back-link:hover { color:#60a5fa; }
    </style>
    ''')

    with ui.element('div').classes('login-outer scsu-bg') as container:

        # left panel
        with ui.element('div').classes('left-panel stripe-texture'):
            ui.image('/assets/scsu_logo.png').classes('brightness-0 invert').style(
                'width:250px; height:auto; object-fit:contain; opacity:0.95; '
                'filter:brightness(0) invert(1); margin-left:-43px; margin-top:-60px;'
            )
            with ui.element('div').style(
                'display:flex; flex-direction:column; align-items:flex-start; '
                'gap:4px; text-align:left; margin-top:-30px;'
            ):
                ui.element('div').style(
                    'width:40px; height:2px; background:#3b82f6; '
                    'box-shadow:0 0 12px rgba(59,130,246,0.7); margin:0 0 16px 0;'
                )
            ui.label('Department of Computer Science').style(
                'color:rgba(255,255,255,0.45); font-size:0.7rem; '
                'letter-spacing:0.14em; text-transform:uppercase; '
                'margin-top: -5px; margin-bottom:3rem;'
            )
            with ui.element('div').style(
                'display:flex; flex-direction:column; gap:2px; '
                'text-align:left; margin-top:100px;'
            ):
                ui.label('CS Library').style(
                    'font-size:2.6rem; color:white; font-weight:700; '
                    'letter-spacing:-0.02em; line-height:1;'
                )
                ui.label('Registration').style(
                    'font-size:2.6rem; color:rgba(255,255,255,0.5); '
                    'font-weight:700; letter-spacing:-0.02em; line-height:1;'
                )
                ui.label('Create an account to access the CS Library catalog.').style(
                    'color:rgba(255,255,255,0.45); font-size:0.7rem; '
                    'letter-spacing:0.14em; text-transform:uppercase; '
                    'max-width:250px; line-height:1.7; margin-top:10px;'
                )
            ui.label('© 2026 SCSU Capstone').style(
                'color:rgba(255,255,255,0.2); font-size:0.65rem; '
                'position:absolute; bottom:2.5rem; left:2.5rem;'
            )

        # right panel
        with ui.element('div').classes('right-panel'):
            with ui.column().classes('w-[400px] gap-0'):

                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Create Account').classes(
                        'text-white font-black leading-none'
                    ).style('font-size:3rem; letter-spacing:-0.03em;')

                ui.element('div').classes('mb-5').style(
                    'width:40px; height:2px; background:#3b82f6; '
                    'box-shadow:0 0 16px rgba(59,130,246,0.8);'
                )
                ui.label('Fill in your details to get started').classes('mb-6').style(
                    'color:rgba(148,163,184,1); font-size:0.75rem; letter-spacing:0.01em;'
                )

                # full name
                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('person', size='14px').classes('text-blue-400')
                        ui.label('Full Name').classes('text-xs font-semibold text-white')
                    name_input = ui.input(
                        placeholder='Jane Doe'
                    ).classes('w-full').props('dark standout autofocus')

                # email
                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('email', size='14px').classes('text-blue-400')
                        ui.label('Email Address').classes('text-xs font-semibold text-white')
                    email_input = ui.input(
                        placeholder='you@example.com'
                    ).classes('w-full').props('dark standout type=email')

                # student ID
                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('badge', size='14px').classes('text-blue-400')
                        ui.label('Student ID').classes('text-xs font-semibold text-white')
                    student_id_input = ui.input(
                        placeholder='e.g., 12345678'
                    ).classes('w-full').props('dark standout')

                # password
                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('lock', size='14px').classes('text-blue-400')
                        ui.label('Password').classes('text-xs font-semibold text-white')
                    password_input = ui.input(
                        placeholder='Choose a strong password'
                    ).classes('w-full').props('dark standout type=password')

                # confirm password
                with ui.column().classes('w-full gap-1 mb-3'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('lock_reset', size='14px').classes('text-blue-400')
                        ui.label('Confirm Password').classes('text-xs font-semibold text-white')
                    confirm_input = ui.input(
                        placeholder='Repeat your password'
                    ).classes('w-full').props('dark standout type=password')

                # Error label
                error_label = ui.label('').style(
                    'color:#f87171; font-size:0.72rem; min-height:1rem; margin-bottom:0.4rem;'
                )

                # submit
                async def _handle_register():
                    name    = name_input.value.strip()
                    email   = email_input.value.strip()
                    student_id = student_id_input.value.strip()
                    pwd     = password_input.value
                    confirm = confirm_input.value

                    if not name or not email or not student_id or not pwd:
                        error_label.text = 'All fields are required.'
                        return
                    if pwd != confirm:
                        error_label.text = 'Passwords do not match.'
                        return
                    if len(pwd) < 8:
                        error_label.text = 'Password must be at least 8 characters.'
                        return

                    error_label.text = ''
                    await on_register_success(name, email, student_id, pwd)

                confirm_input.on('keydown.enter', _handle_register)

                ui.button(
                    'Create Account',
                    on_click=_handle_register,
                    icon='person_add',
                    color=None,
                ).classes(
                    'w-full h-11 text-sm font-bold rounded-xl text-white '
                    'bg-blue-600/20 border border-blue-500/30 '
                    'hover:bg-blue-600/40 hover:border-blue-400 '
                    'hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] '
                    'transition-all duration-300 mb-3'
                ).props('flat')

                # back to login
                with ui.row().classes('w-full justify-center mb-4'):
                    ui.label('Already have an account? ').style(
                        'color:rgba(148,163,184,0.7); font-size:0.75rem;'
                    )
                    ui.label('Sign in').classes('back-link').on('click', on_back_to_login)

                # clock
                with ui.row().classes('w-full items-center gap-3 pt-5 opacity-60').style(
                    'border-top: 1px solid rgba(51,65,85,0.6);'
                ):
                    ui.icon('schedule', size='14px').classes('text-slate-400')
                    time_label = ui.label().classes(
                        'text-xs font-bold tracking-[0.2em] uppercase text-slate-400'
                    )

                    def update_time():
                        time_label.text = datetime.now().strftime('%a, %b %d | %I:%M %p')

                    ui.timer(1.0, update_time)
                    update_time()

    return container