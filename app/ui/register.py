from nicegui import ui
from datetime import datetime


def create(on_register_success, on_back_to_login):



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
                ui.label('Registration').classes('text-[2.6rem] text-white/50 font-bold tracking-tighter leading-none')
                ui.label('Create an account to access the CS Library catalog.').classes(
                    'text-white/45 text-[0.7rem] tracking-[0.14em] uppercase max-w-[250px] leading-relaxed mt-2.5'
                )
            ui.label('© 2026 SCSU Capstone').classes(
                'text-white/20 text-[0.65rem] absolute bottom-10 left-10'
            )


        with ui.element('div').classes('right-panel'):
            with ui.column().classes('w-[400px] gap-0'):

                with ui.column().classes('gap-0 mb-3'):
                    ui.label('Create Account').classes(
                        'text-[3rem] tracking-[-0.03em] text-white font-black leading-none'
                    )

                ui.element('div').classes('mb-5 w-10 h-0.5 bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.8)]')
                ui.label('Fill in your details to get started').classes('mb-6 text-slate-400 text-xs tracking-wide')


                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('person', size='14px').classes('text-blue-400')
                        ui.label('Full Name').classes('text-xs font-semibold text-white')
                    name_input = ui.input(
                        placeholder='Jane Doe'
                    ).classes('w-full').props('dark standout autofocus')


                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('email', size='14px').classes('text-blue-400')
                        ui.label('Email Address').classes('text-xs font-semibold text-white')
                    email_input = ui.input(
                        placeholder='you@example.com'
                    ).classes('w-full').props('dark standout type=email')


                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('badge', size='14px').classes('text-blue-400')
                        ui.label('Student ID').classes('text-xs font-semibold text-white')
                    student_id_input = ui.input(
                        placeholder='e.g., 12345678'
                    ).classes('w-full').props('dark standout')


                with ui.column().classes('w-full gap-1 mb-4'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('lock', size='14px').classes('text-blue-400')
                        ui.label('Password').classes('text-xs font-semibold text-white')
                    password_input = ui.input(
                        placeholder='Choose a strong password'
                    ).classes('w-full').props('dark standout type=password')


                with ui.column().classes('w-full gap-1 mb-3'):
                    with ui.row().classes('items-center gap-2 mb-1'):
                        ui.icon('lock_reset', size='14px').classes('text-blue-400')
                        ui.label('Confirm Password').classes('text-xs font-semibold text-white')
                    confirm_input = ui.input(
                        placeholder='Repeat your password'
                    ).classes('w-full').props('dark standout type=password')


                error_label = ui.label('').classes(
                    'text-red-400 text-xs min-h-[1rem] mb-1.5'
                )


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
                    'w-full max-w-sm h-14 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full font-bold '
                    'hover:bg-blue-600/40 hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-colors duration-300 mb-4'
                ).props('flat')


                with ui.row().classes('w-full justify-center mb-4'):
                    ui.label('Already have an account? ').classes('text-white/60 text-xs')
                    ui.label('Sign in').classes('back-link').on('click', on_back_to_login)


                with ui.row().classes('w-full items-center gap-3 pt-5 opacity-60 border-t border-slate-700/60'):
                    ui.icon('schedule', size='14px').classes('text-slate-400')
                    time_label = ui.label().classes(
                        'text-xs font-bold tracking-[0.2em] uppercase text-slate-400'
                    )

                    def update_time():
                        time_label.text = datetime.now().strftime('%a, %b %d | %I:%M %p')

                    ui.timer(1.0, update_time)
                    update_time()

    return container