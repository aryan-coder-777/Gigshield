import os
import re

for root, _, files in os.walk('d:/AI Integration/gigshield/frontend/src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = re.sub(r'transparent=[\'"]true[\'"]', 'transparent={true}', content)
            new_content = re.sub(r'transparent=[\'"]false[\'"]', 'transparent={false}', new_content)
            new_content = re.sub(r'visible=[\'"]true[\'"]', 'visible={true}', new_content)
            new_content = re.sub(r'visible=[\'"]false[\'"]', 'visible={false}', new_content)

            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed string boolean in {file}")

print("Done")
