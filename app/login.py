from nicegui import ui # import nicegui and its UI library
from datetime import datetime # importing the date and time library to see live clock

def create(on_login_formal): # define function called create, for NICEGUI its used to hand off the login page to main
    # creating vertical column, with a dark gradient background, using a monospace font, then centering it in the middle then name it as container
    # CHANGE: Replaced the old gradient with 'scsu-bg' to get the starry background
    with ui.column().classes('scsu-bg w-full h-screen items-center justify-center') as container:

        # Inside the container we put a the login card, with a 420 px width, dark blue background, padding, corners rounded, created a border to make it pop, with a glowing blue shadow
        with ui.card().classes('w-[380px] p-8 items-center bg-white/[0.02] backdrop-blur-2xl border border-white/8 rounded-[24px] shadow-[0_0_80px_-10px_rgba(59,130,246,0.35)]'):

            # Inside the card we put the Logo, width, margin bottom, then making from blue to white with invert
            ui.image('/assets/scsu_logo.png').classes('w-48 mb-4 brightness-0 invert opacity-90')
            
            # Still in the card we put text/label, x large, white text, bold monospace, margin top, tracking or letter spacing
            with ui.column().classes('w-full gap-0 mt-2'):
                ui.label('Welcome').classes('text-4xl text-white font-bold leading-none tracking-tight')
                ui.label('Back.').classes('text-4xl text-white font-bold leading-none tracking-tight mb-3')
                # blue accent line beneath heading
                ui.element('div').classes('w-8 h-0.5 bg-blue-500 mb-3').style('box-shadow: 0 0 12px rgba(59,130,246,0.6)')
            # text small and slate to make it grayish, margin top and bottom
                ui.label('Scan your ID to enter CS Library Kiosk').classes('text-slate-400 text-xs mt-1 mb-6 self-start')

            # Creating a column within the column for the input area, width full, gap 2, margin buttom
            with ui.column().classes('w-full gap-2 mb-4'):
                with ui.row().classes('items-center gap-2 mb-1'): # within column create a row to put a image next to label
                    ui.icon('badge', size='14px').classes('text-blue-400') #
                    ui.label('Student ID').classes('text-xs text-white font-medium') #
                # create the input box, with dark look, placeholder in input box
                id_input = ui.input(placeholder='Enter or Scan your ID...').classes('w-full').props('dark standout autofocus')
                id_input.on('keydown.enter', on_login_formal) # when you press the enter key it send the signal to main.py to login

            # Sign In Button, click it again it goes to main and signs in
            ui.button('Sign In', on_click=on_login_formal, icon='login', color=None).classes(
                'w-full h-12 text-sm font-bold rounded-xl text-white bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/40 hover:border-blue-400 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] transition-all duration-300'
            )

            # still in the card, add a row to put a border to seperate time
            with ui.row().classes('w-full justify-center items-center gap-3 mt-5 border-t border-slate-700/50 pt-4 opacity-70'):

                # css for the time label
                time_label = ui.label().classes('text-xs text-slate-400 font-bold tracking-[0.2em] uppercase')

                # small function for the clock to work
                def update_time():
                    # getting the current time and date
                    now = datetime.now()
                    time_label.text = now.strftime("%a, %b %d | %I:%M %p") # Format: MON, FEB 16 | 10:30 PM

                # tells UI to auto update every 1 second
                ui.timer(1.0, update_time)
                update_time() # Run once immediately

    return container, id_input # take the whole container and input and return it to who calls it