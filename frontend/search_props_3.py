import os
import re

pattern = re.compile(r' (scrollEnabled|showsVerticalScrollIndicator|showsHorizontalScrollIndicator|nestedScrollEnabled|pagingEnabled|horizontal|accessible|focusable|collapsable|secureTextEntry|multiline|editable|showsUserLocation|showsCompass|disabled|enabled|visible|hidden|transparent|animating|hidesWhenStopped|hardwareAccelerated|keyboardShouldPersistTaps)="([^"]+)"')

for root, _, files in os.walk('d:/AI Integration/gigshield/frontend'):
    if 'node_modules' in root: continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern.findall(content)
                for m in matches:
                    print('FOUND STRING ASSIGNMENT TO PROP:', m[0], 'VAL:', m[1], 'IN', path)
