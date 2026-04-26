import base64
import os

png_path = r'c:\Users\andre\dumped_simple\public\phew-logo-extracted.png'
svg_path = r'c:\Users\andre\dumped_simple\public\phew-logo.svg'

with open(png_path, 'rb') as f:
    encoded = base64.b64encode(f.read()).decode()

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" shape-rendering="geometricPrecision" image-rendering="optimizeQuality">
    <image width="1024" height="1024" xlink:href="data:image/png;base64,{encoded}"/>
</svg>'''

with open(svg_path, 'w') as f:
    f.write(svg_content)

print(f"Successfully reconstructed SVG at {svg_path}")
