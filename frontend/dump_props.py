import os
import re

def dump_string_props(directory):
    with open('all_props.txt', 'w', encoding='utf-8') as out:
        for root, _, files in os.walk(directory):
            if 'node_modules' in root: continue
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    path = os.path.join(root, file)
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                        tags = re.findall(r'<([A-Z][A-Za-z0-9]*)([^>]*?)>', content, re.DOTALL)
                        for tag_name, prop_str in tags:
                            props = re.findall(r'(\b[A-Za-z0-9_-]+)=("[^"]*"|\'[^\']*\'|\{[^}]*\})', prop_str)
                            for prop_name, prop_val in props:
                                out.write(f"{tag_name} -> {prop_name}={prop_val}\n")

dump_string_props(r"d:\AI Integration\gigshield\frontend\src")
