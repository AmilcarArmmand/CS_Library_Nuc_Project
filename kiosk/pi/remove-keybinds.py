# This script is responsible for disabling the keybinds
# that can be considered malicious to use.
# This Python file will be used with install-kiosk-services.sh

import sys, re

if len(sys.argv) < 2:
    print("Usage: remove-keybinds.py <path-to-rc.xml>")
    sys.exit(1)

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Part 1: Neutralize existing labwc compositor shortcuts
# These already exist in rc.xml and need their actions stripped out.
neutralize_keys = [
    ('C-A-t',      'terminal'),
    ('C-A-Delete', 'shutdown'),
    ('C-A-space',  'reboot'),
    ('Super_L',    'app menu'),
    ('A-F2',       'run dialog'),
    ('C-A-w',      'network menu'),
    ('C-A-b',      'bluetooth menu'),
]

for key, label in neutralize_keys:
    pattern = rf'(<keybind key="{re.escape(key)}"[^>]*?>).*?(</keybind>)'
    replacement = rf'<keybind key="{key}" />'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    print(f"  Neutralized : {key} ({label})")

# Part 2: Inject empty keybinds to block Chromium shortcuts
# These don't exist in rc.xml. Attempting to add them as empty binds. This causes labwc
# to consume the keypress before it reaches Chromium.
block_keys = [
    ('C-w',        'close current tab'),
    ('C-S-w',      'close browser window'),
    ('C-t',        'new tab'),
    ('C-n',        'new window'),
    ('C-S-n',      'new incognito window'),
    ('C-j',        'downloads'),
    ('C-S-Delete', 'clear browsing data'),
    ('C-p',        'print'),
    ('C-S-o',      'bookmarks manager'),
    ('C-s',        'save page'),
    ('C-h',        'history'),
    ('A-S-p',      'new tab group'),
    ('F1',         'help page'),
    ('F3',         'find'),
    ('C-f',        'find'),
    ('F7',         'caret browsing'),
    ('S-Escape',   'Chrome task manager'),
]

injected = 0
new_bind_lines = []
for key, label in block_keys:
    if f'key="{key}"' not in content:
        new_bind_lines.append(f'    <keybind key="{key}" /> <!-- block: {label} -->')
        injected += 1

if new_bind_lines:
    injection = '\n'.join(new_bind_lines)
    content = content.replace('</keyboard>', f'{injection}\n  </keyboard>')
    print(f"  Injected    : {injected} keybind blocks for Chromium shortcuts")

with open(sys.argv[1], 'w') as f:
    f.write(content)

print("Done. Keybinds disabled.")