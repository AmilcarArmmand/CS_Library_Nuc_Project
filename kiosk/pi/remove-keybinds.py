# This script is responsible for disabling the keybinds 
# that can be considered malicious to use.
# This Python file will be used with install-kiosk-services.sh

import sys, re

if len(sys.argv) < 2:
    print("Usage: remove-keybinds.py <path-to-rc.xml>")
    sys.exit(1)

with open(sys.argv[1], 'r') as f:
    content = f.read()

# List the keybinds that users can use to possibly sabotage the system.
dangerous_keys = [
    'C-A-t',       # terminal
    'C-A-Delete',  # shutdown
    'C-A-space',   # reboot
    'Super_L',     # app menu
    'A-F2',        # run dialog
    'C-A-w',       # network menu
    'C-A-b',       # bluetooth menu
]

for key in dangerous_keys:
    pattern = rf'(<keybind key="{re.escape(key)}"[^>]*?>).*?(</keybind>)'
    replacement = rf'<keybind key="{key}" />'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(sys.argv[1], 'w') as f:
    f.write(content)

print("Done. Keybinds neutralized.")