import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to replace inside className="..." or className={cn(...)} or just match words.
    # It's safer to just regex replace the specific tailwind classes globally in the file.
    # Because classes are separated by spaces or quotes or backticks.
    
    # Classes to remove:
    # bg-gradient-to-[a-z]+
    # from-[something]
    # via-[something]
    # to-[something]
    # bg-clip-text
    # text-transparent (only if near bg-clip-text or gradients? Actually just removing text-transparent is safer so text doesn't disappear)
    
    # We will use regex with word boundaries or space/quote boundaries.
    # Pattern for tailwind classes:
    pattern = r'\b(bg-gradient-to-[a-z]+|from-[A-Za-z0-9_/#\[\]\-]+|via-[A-Za-z0-9_/#\[\]\-]+|to-[A-Za-z0-9_/#\[\]\-]+|bg-clip-text|text-transparent)\b'
    
    new_content = re.sub(pattern, '', content)
    
    # Cleanup multiple spaces inside quotes
    # This is a bit tricky, but simple multiple spaces can be reduced.
    # We will just leave the spaces, HTML/React handles extra spaces in className fine.
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('apps/web/src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))

print("Done")
