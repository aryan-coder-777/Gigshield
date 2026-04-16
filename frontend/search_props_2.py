import os
import re

def find_prop_assignments(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    tags = re.findall(r'<[A-Z][A-Za-z0-9]*[^>]*>', content)
                    for tag in tags:
                        for prop in ['disabled', 'visible', 'transparent', 'animating', 'refreshing', 'showsVerticalScrollIndicator', 'secureTextEntry']:
                            # matches prop={...}
                            matches = re.findall(rf'{prop}={{([^}}]*)}}', tag)
                            for match in matches:
                                print(f"Found {prop}={{{match}}} in {path}")

find_prop_assignments(r"d:\AI Integration\gigshield\frontend")
