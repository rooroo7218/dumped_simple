import base64
import os

png_path = r'c:\Users\andre\dumped_simple\public\phew-logo-extracted.png'
svg_path = r'c:\Users\andre\dumped_simple\public\phew-logo.svg'

with open(png_path, 'rb') as f:
    encoded = base64.b64encode(f.read()).decode()

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" shape-rendering="geometricPrecision">
    <defs>
        <filter id="silhouette" x="0" y="0" width="100%" height="100%">
            <!-- Convert grayscale to alpha: Alpha = 1 - (Red channel) -->
            <!-- Also force RGB to black -->
            <feColorMatrix type="matrix" values="0 0 0 0 0
                                                 0 0 0 0 0
                                                 0 0 0 0 0
                                                 -1 0 0 0 1" />
        </filter>
    </defs>
    <image width="1024" height="1024" xlink:href="data:image/png;base64,{encoded}" filter="url(#silhouette)"/>
</svg>'''

with open(svg_path, 'w') as f:
    f.write(svg_content)

print(f"Successfully reconstructed SVG with silhouette filter at {svg_path}")
