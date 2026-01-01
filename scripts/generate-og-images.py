#!/usr/bin/env python3
"""
Generate OG (Open Graph) images for social sharing
Creates 1200x630 images for Facebook, Twitter, LinkedIn, etc.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Image dimensions for OG
WIDTH = 1200
HEIGHT = 630

# Colors
COLORS = {
    'primary': '#2563EB',      # Blue
    'secondary': '#7C3AED',    # Purple
    'orange': '#F97316',       # Orange accent
    'white': '#FFFFFF',
    'dark': '#1F2937',
    'light_bg': '#F8FAFC',
}

# Format configurations
FORMATS = {
    'main': {
        'filename': 'og-image.png',
        'title': 'UberPadel',
        'subtitle': 'Tournament Manager',
        'tagline': 'Create & manage padel tournaments instantly',
        'gradient': ['#2563EB', '#7C3AED'],  # Blue to Purple
        'icon': '●'
    },
    'americano': {
        'filename': 'og-image-americano.png',
        'title': 'Americano Padel',
        'subtitle': 'Rotating Partners',
        'tagline': 'Everyone plays with everyone • 5-24 players',
        'gradient': ['#7C3AED', '#8B5CF6'],  # Purple shades
        'icon': '◐'
    },
    'mexicano': {
        'filename': 'og-image-mexicano.png',
        'title': 'Mexicano Padel',
        'subtitle': 'Dynamic Matchups',
        'tagline': 'Pairings based on standings • Competitive format',
        'gradient': ['#059669', '#10B981'],  # Green shades
        'icon': '◆'
    },
    'mix': {
        'filename': 'og-image-mix.png',
        'title': 'Mix Tournament',
        'subtitle': '20-28 Players',
        'tagline': 'Large group format with rest rotation',
        'gradient': ['#2563EB', '#3B82F6'],  # Blue shades
        'icon': '★'
    },
    'team': {
        'filename': 'og-image-team.png',
        'title': 'Team League',
        'subtitle': 'Fixed Teams',
        'tagline': 'League format with group stages & knockouts',
        'gradient': ['#DC2626', '#EF4444'],  # Red shades
        'icon': '▲'
    }
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_gradient(width, height, color1, color2, direction='horizontal'):
    """Create a gradient image"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    r1, g1, b1 = hex_to_rgb(color1)
    r2, g2, b2 = hex_to_rgb(color2)
    
    if direction == 'horizontal':
        for x in range(width):
            ratio = x / width
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            draw.line([(x, 0), (x, height)], fill=(r, g, b))
    else:  # diagonal
        for x in range(width):
            for y in range(height):
                ratio = (x + y) / (width + height)
                r = int(r1 + (r2 - r1) * ratio)
                g = int(g1 + (g2 - g1) * ratio)
                b = int(b1 + (b2 - b1) * ratio)
                draw.point((x, y), fill=(r, g, b))
    
    return img

def get_font(size, bold=False):
    """Get a font, falling back to default if custom fonts not available"""
    # Try common fonts
    font_names = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    
    for font_name in font_names:
        try:
            return ImageFont.truetype(font_name, size)
        except (IOError, OSError):
            continue
    
    # Fallback to default
    return ImageFont.load_default()

def add_decorative_elements(draw, width, height):
    """Add subtle decorative elements"""
    # Add subtle circles/dots pattern
    for i in range(20):
        x = (i * 150) % width + 50
        y = (i * 80) % height
        radius = 3 + (i % 3)
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], 
                    fill=(255, 255, 255, 30))
    
    # Add padel court lines (subtle)
    line_color = (255, 255, 255, 40)
    # Horizontal line
    draw.line([(100, height//2), (width-100, height//2)], fill=line_color, width=2)
    # Vertical line  
    draw.line([(width//2, 100), (width//2, height-100)], fill=line_color, width=2)

def create_og_image(format_key, output_dir):
    """Create an OG image for a specific format"""
    config = FORMATS[format_key]
    
    # Create gradient background
    img = create_gradient(WIDTH, HEIGHT, config['gradient'][0], config['gradient'][1], 'horizontal')
    draw = ImageDraw.Draw(img)
    
    # Add decorative elements
    add_decorative_elements(draw, WIDTH, HEIGHT)
    
    # Add semi-transparent overlay for better text readability
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 60))
    img = Image.alpha_composite(img.convert('RGBA'), overlay)
    draw = ImageDraw.Draw(img)
    
    # Load fonts
    font_title = get_font(72, bold=True)
    font_subtitle = get_font(42, bold=True)
    font_tagline = get_font(28)
    font_icon = get_font(60, bold=True)
    font_brand = get_font(24, bold=True)
    
    # Calculate vertical positions
    center_y = HEIGHT // 2
    
    # Draw icon
    icon = config['icon']
    icon_bbox = draw.textbbox((0, 0), icon, font=font_icon)
    icon_width = icon_bbox[2] - icon_bbox[0]
    draw.text(((WIDTH - icon_width) // 2, center_y - 150), icon, fill='white', font=font_icon)
    
    # Draw title
    title = config['title']
    title_bbox = draw.textbbox((0, 0), title, font=font_title)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((WIDTH - title_width) // 2, center_y - 60), title, fill='white', font=font_title)
    
    # Draw subtitle
    subtitle = config['subtitle']
    subtitle_bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    draw.text(((WIDTH - subtitle_width) // 2, center_y + 30), subtitle, fill=(255, 255, 255, 220), font=font_subtitle)
    
    # Draw tagline
    tagline = config['tagline']
    tagline_bbox = draw.textbbox((0, 0), tagline, font=font_tagline)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    draw.text(((WIDTH - tagline_width) // 2, center_y + 100), tagline, fill=(255, 255, 255, 180), font=font_tagline)
    
    # Draw brand watermark at bottom
    brand_text = "uberpadel.com"
    brand_bbox = draw.textbbox((0, 0), brand_text, font=font_brand)
    brand_width = brand_bbox[2] - brand_bbox[0]
    draw.text(((WIDTH - brand_width) // 2, HEIGHT - 50), brand_text, fill=(255, 255, 255, 150), font=font_brand)
    
    # Add corner accents
    accent_color = (255, 255, 255, 100)
    # Top left
    draw.line([(0, 0), (80, 0)], fill=accent_color, width=4)
    draw.line([(0, 0), (0, 80)], fill=accent_color, width=4)
    # Top right
    draw.line([(WIDTH-80, 0), (WIDTH, 0)], fill=accent_color, width=4)
    draw.line([(WIDTH-1, 0), (WIDTH-1, 80)], fill=accent_color, width=4)
    # Bottom left
    draw.line([(0, HEIGHT-1), (80, HEIGHT-1)], fill=accent_color, width=4)
    draw.line([(0, HEIGHT-80), (0, HEIGHT)], fill=accent_color, width=4)
    # Bottom right
    draw.line([(WIDTH-80, HEIGHT-1), (WIDTH, HEIGHT-1)], fill=accent_color, width=4)
    draw.line([(WIDTH-1, HEIGHT-80), (WIDTH-1, HEIGHT)], fill=accent_color, width=4)
    
    # Save
    output_path = os.path.join(output_dir, config['filename'])
    img.convert('RGB').save(output_path, 'PNG', quality=95)
    print(f"✅ Created {config['filename']}")
    return output_path

def main():
    """Generate all OG images"""
    output_dir = '/home/claude/Tournament-main-15'
    
    print("🎨 Generating OG images for social sharing...")
    print(f"   Size: {WIDTH}x{HEIGHT}px")
    print()
    
    created_files = []
    for format_key in FORMATS:
        path = create_og_image(format_key, output_dir)
        created_files.append(path)
    
    print()
    print(f"✅ Created {len(created_files)} OG images!")
    print()
    print("Files created:")
    for f in created_files:
        print(f"   - {os.path.basename(f)}")

if __name__ == '__main__':
    main()
