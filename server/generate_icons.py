import os
from PIL import Image, ImageDraw, ImageFont

icons_dir = r"m:\Xampp\htdocs\Hackathon\Smart Vyapar\public\icons"
os.makedirs(icons_dir, exist_ok=True)

def create_pwa_icon(size, is_maskable=False):
    # Create image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dimensions
    padding = 0 if is_maskable else int(size * 0.06)
    radius = int(size * 0.22) if not is_maskable else 0
    
    # Background - Teal gradient approximation (#0F4C5C)
    bg_color = (15, 76, 92, 255)
    accent_color = (243, 114, 44, 255)
    white = (255, 255, 255, 255)
    
    if is_maskable:
        draw.rectangle([0, 0, size, size], fill=bg_color)
    else:
        draw.rounded_rectangle([padding, padding, size - padding, size - padding], radius=radius, fill=bg_color)
    
    # Central branding: Store / Bag + Rupee / Soundwave motif
    cx, cy = size // 2, size // 2
    
    # Draw an elegant shopping bag / storefront outline
    bag_w = int(size * 0.46)
    bag_h = int(size * 0.48)
    bx1 = cx - bag_w // 2
    by1 = cy - bag_h // 2 + int(size * 0.05)
    bx2 = cx + bag_w // 2
    by2 = by1 + bag_h
    
    # Bag body
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=int(size * 0.06), fill=white)
    
    # Bag handle (accent saffron)
    handle_w = int(size * 0.22)
    handle_h = int(size * 0.20)
    hx1 = cx - handle_w // 2
    hy1 = by1 - handle_h // 2
    hx2 = cx + handle_w // 2
    hy2 = by1 + handle_h // 2
    draw.arc([hx1, hy1, hx2, hy2], start=180, end=0, fill=accent_color, width=max(2, int(size * 0.045)))
    
    # Saffron Accent badge/circle in center of bag
    badge_r = int(size * 0.13)
    draw.ellipse([cx - badge_r, cy + int(size*0.06) - badge_r, cx + badge_r, cy + int(size*0.06) + badge_r], fill=accent_color)
    
    # Draw Rupee / "SV" symbol or simple Rupee lines in white inside the badge
    # Rupee symbol drawing using lines
    rcx = cx
    rcy = cy + int(size * 0.06)
    rw = int(badge_r * 0.6)
    rh = int(badge_r * 0.8)
    line_w = max(2, int(size * 0.022))
    
    # Horizontal top bar
    draw.line([rcx - rw, rcy - rh//2, rcx + rw, rcy - rh//2], fill=white, width=line_w)
    # Second horizontal bar
    draw.line([rcx - rw, rcy - rh//2 + int(rh*0.28), rcx + int(rw*0.6), rcy - rh//2 + int(rh*0.28)], fill=white, width=line_w)
    # Upper curve & stem
    draw.arc([rcx - rw, rcy - rh//2, rcx + int(rw*0.7), rcy + int(rh*0.1)], start=270, end=90, fill=white, width=line_w)
    # Diagonal leg
    draw.line([rcx - int(rw*0.2), rcy + int(rh*0.1), rcx + rw, rcy + rh//2 + int(rh*0.25)], fill=white, width=line_w)
    
    # Soundwaves / Voice indicator in teal on the top right
    dot_r = max(2, int(size * 0.025))
    draw.ellipse([bx2 - int(size*0.08) - dot_r, by1 + int(size*0.08) - dot_r, 
                  bx2 - int(size*0.08) + dot_r, by1 + int(size*0.08) + dot_r], fill=(15, 76, 92, 255))
    draw.arc([bx2 - int(size*0.16), by1, bx2, by1 + int(size*0.16)], start=270, end=360, fill=(15, 76, 92, 255), width=max(2, int(size * 0.02)))
    
    return img

# Generate icons
create_pwa_icon(192).save(os.path.join(icons_dir, "icon-192.png"))
create_pwa_icon(512).save(os.path.join(icons_dir, "icon-512.png"))
create_pwa_icon(180).save(os.path.join(icons_dir, "apple-touch-icon.png"))
create_pwa_icon(512, is_maskable=True).save(os.path.join(icons_dir, "icon-maskable-512.png"))

print("Icons generated successfully!")
