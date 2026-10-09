"""Print only navigation, console and Vite websocket evidence from local film traces."""
import json
import sys
import zipfile

for path in sys.argv[1:]:
    print(path)
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.endswith((".trace", ".network")):
                continue
            for line in archive.read(name).decode().splitlines():
                row = json.loads(line)
                text = json.dumps(row)
                if row.get("type") == "console" or (row.get("type") == "event" and any(word in text.lower() for word in ["navigat", "websocket"])) or "full-reload" in text or "Outdated Optimize" in text:
                    print(text[:3000])
