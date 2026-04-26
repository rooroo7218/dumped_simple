import base64
import os

svg_path = r'c:\Users\andre\dumped_simple\public\phew-logo.svg'
output_png = r'c:\Users\andre\dumped_simple\public\phew-logo-extracted.png'

with open(svg_path, 'r') as f:
    content = f.read()

# Find the base64 part
start_marker = 'xlink:href="data:image/png;base64,'
end_marker = '"'

start_idx = content.find(start_marker)
if start_idx != -1:
    start_idx += len(start_marker)
    end_idx = content.find(end_marker, start_idx)
    base64_data = content[start_idx:end_idx]
    
    with open(output_png, 'wb') as f:
        f.write(base64.b64decode(base64_data))
    print(f"Extracted PNG to {output_png}")
else:
    print("Could not find base64 data in SVG")
