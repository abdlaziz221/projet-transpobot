import os

file_path = r"c:\Users\abdla\Desktop\bd\transpobot\sql\schema.sql"

try:
    # On essaye de lire en UTF-16 (souvent le défaut PowerShell/Windows)
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Détection simpliste du BOM UTF-16 LE
    if content.startswith(b'\xff\xfe'):
        decoded = content.decode('utf-16')
        print("Detected UTF-16 LE encoding. Converting to UTF-8...")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(decoded)
        print("Success: File converted to UTF-8.")
    else:
        print("File is not UTF-16 with BOM. No conversion needed or already UTF-8.")
except Exception as e:
    print(f"Error: {e}")
