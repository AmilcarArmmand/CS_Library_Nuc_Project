# This script is responsible for disabling the keybinds on the system only. 
# that can be considered malicious to use.
# This Python file will be used with install-kiosk-services.sh

import sys
import xml.etree.ElementTree as ET

if len(sys.argv) < 3:
    print("Usage: remove-keybinds.py <source-system-rc.xml> <output-user-rc.xml>")
    sys.exit(1)

source_path = sys.argv[1]
output_path = sys.argv[2]

# Keybinds to neutralize (remove their actions, leave empty binding)
dangerous_keys = [
    'C-A-t',       # terminal
    'C-A-Delete',  # shutdown
    'C-A-space',   # reboot
    'Super_L',     # app menu
    'A-F2',        # run dialog
    'C-A-w',       # network menu
    'C-A-b',       # bluetooth menu
    'A-F4',        # close window
]

ET.register_namespace('', 'http://openbox.org/3.4/rc')

tree = ET.parse(source_path)
root = tree.getroot()

ns = {'ob': 'http://openbox.org/3.4/rc'}

# Find the keyboard section
keyboard = root.find('ob:keyboard', ns)
if keyboard is None:
    # Try without namespace
    keyboard = root.find('keyboard')

if keyboard is None:
    print("ERROR: Could not find <keyboard> section in source config.")
    sys.exit(1)

neutralized = []
for keybind in keyboard.findall('ob:keybind', ns) or keyboard.findall('keybind'):
    key = keybind.get('key', '')
    if key in dangerous_keys:
        # Remove all child elements (the actions)
        for child in list(keybind):
            keybind.remove(child)
        # Remove onRelease attribute if present
        keybind.attrib.pop('onRelease', None)
        neutralized.append(key)

ET.indent(tree, space='  ')
tree.write(output_path, encoding='unicode', xml_declaration=True)
print("")
print(f"Done. Neutralized {len(neutralized)} keybind(s): {', '.join(neutralized)}")