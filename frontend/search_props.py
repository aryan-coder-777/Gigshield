import os
import re

def find_string_props(directory):
    pattern = re.compile(r'<[A-Za-z0-9]+\s+[^>]*(\b[A-Za-z0-9_-]+)="[^"]*"')
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Find all tags
                    tags = re.findall(r'<[A-Z][A-Za-z0-9]*[^>]*>', content)
                    for tag in tags:
                        # Find props assigned to strings
                        props = re.findall(r'(\b[A-Za-z0-9_-]+)="([^"]*)"', tag)
                        for prop_name, prop_val in props:
                            # Known boolean props that might mistakenly get a string
                            if prop_name.lower() in ['editable', 'disabled', 'multiline', 'visible', 'transparent', 'animating', 'refreshing', 'securetextentry', 'hidden', 'showsuserlocation', 'focus', 'enabled']:
                                print(f"Found suspicious bool prop '{prop_name}=\"{prop_val}\"' in {path}")
                            
find_string_props(r"d:\AI Integration\gigshield\frontend")
