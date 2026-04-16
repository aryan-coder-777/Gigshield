import os
import re

pattern = re.compile(r'style=\s*\{\s*\[(.*?)\]\s*\}', re.DOTALL)

for root, _, files in os.walk('d:/AI Integration/gigshield/frontend/src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            def replacer(match):
                inner = match.group(1)
                # Split the array content by comma
                parts = inner.split(',')
                new_parts = []
                for p in parts:
                    if '&&' in p and '?' not in p:
                        # Very simple replacement for things like 'active && styles.active'
                        # It will look for 'A && B' and replace with 'A ? B : null'
                        p = re.sub(r'([A-Za-z0-9_>=<!.\s()]+)\s*&&\s*([A-Za-z0-9_.\s()]+)', r'\1 ? \2 : null', p)
                    new_parts.append(p)
                new_inner = ','.join(new_parts)
                return f'style={{[{new_inner}]}}'

            new_content = pattern.sub(replacer, content)
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Fixed array booleans in {file}')
