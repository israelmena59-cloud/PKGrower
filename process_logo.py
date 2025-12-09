from PIL import Image, ImageChops
import os

SOURCE = r"C:/Users/Israel/.gemini/antigravity/brain/9707db16-eb55-454b-80e9-af5d6b119b5f/uploaded_image_1765280323691.png"
DEST_DIR = r"c:/Users/Israel/Desktop/PKGrower/public"

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

def make_square_centered(im, padding=20):
    # Create a square canvas based on the largest dimension + padding
    max_dim = max(im.size) + padding * 2
    # Ensure it's at least as big as the image
    new_im = Image.new("RGBA", (max_dim, max_dim), (255, 255, 255, 0)) # Transparent background

    # Calculate position to center
    x = (max_dim - im.size[0]) // 2
    y = (max_dim - im.size[1]) // 2

    new_im.paste(im, (x, y))
    return new_im

def main():
    if not os.path.exists(SOURCE):
        print(f"Error: Source image not found at {SOURCE}")
        return

    try:
        # Open and convert to RGBA to handle transparency correctly
        img = Image.open(SOURCE).convert("RGBA")
        print("Image opened.")

        # 1. Trim whitespace
        img = trim(img)
        print("Image trimmed.")

        # 2. Make Square & Centered
        # User requested: "tiene que quedar centrado"
        # We add some padding so the logo doesn't touch edges in the icon
        img = make_square_centered(img, padding=40)
        print("Image centered in square.")

        # Save Master
        img.save(os.path.join(DEST_DIR, "logo.png"))
        print(f"Saved {os.path.join(DEST_DIR, 'logo.png')}")

        # PWA Icons
        # Resize with high quality
        icon_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
        icon_192.save(os.path.join(DEST_DIR, "pwa-192x192.png"))

        icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
        icon_512.save(os.path.join(DEST_DIR, "pwa-512x512.png"))

        # Favicon
        icon_64 = img.resize((64, 64), Image.Resampling.LANCZOS)
        icon_64.save(os.path.join(DEST_DIR, "favicon.ico"))

        print("All icons generated.")

    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    main()
