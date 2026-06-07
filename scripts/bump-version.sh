#!/bin/bash
# Bump version patch number in version.json
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/.."

python3 -c "
import json
with open('$PROJECT_DIR/version.json') as f:
    v = json.load(f)
v['patch'] += 1
with open('$PROJECT_DIR/version.json', 'w') as f:
    json.dump(v, f, indent=2)
print(f'v{v[\"major\"]}.{v[\"minor\"]}.{v[\"patch\"]}')
"
