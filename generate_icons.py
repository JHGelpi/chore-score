#!/usr/bin/env python3
"""
Generate multiple icon sizes for web app from the original icon
"""
from PIL import Image
import os

# Define paths
source_image = "frontend/static/images/chorescore_icon.png"
output_dir = "frontend/static/images"

# Icon sizes needed for various platforms
icon_sizes = [
    (16, 16, "favicon-16x16.png"),
    (32, 32, "favicon-32x32.png"),
    (192, 192, "android-chrome-192x192.png"),
    (512, 512, "android-chrome-512x512.png"),
    (180, 180, "apple-touch-icon.png"),
]

def generate_icons():
    """Generate all required icon sizes"""
    print(f"Loading source image: {source_image}")

    # Open the source image
    img = Image.open(source_image)
    print(f"Source image size: {img.size}")

    # Generate each size
    for width, height, filename in icon_sizes:
        print(f"Generating {filename} ({width}x{height})...")

        # Resize with high-quality resampling
        resized = img.resize((width, height), Image.Resampling.LANCZOS)

        # Save the resized image
        output_path = os.path.join(output_dir, filename)
        resized.save(output_path, "PNG", optimize=True)
        print(f"  Saved: {output_path}")

    # Generate favicon.ico (multi-size ICO file)
    print("Generating favicon.ico with multiple sizes...")
    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    favicon_images = []

    for width, height in favicon_sizes:
        resized = img.resize((width, height), Image.Resampling.LANCZOS)
        favicon_images.append(resized)

    favicon_path = os.path.join(output_dir, "favicon.ico")
    favicon_images[0].save(
        favicon_path,
        format='ICO',
        sizes=[(img.width, img.height) for img in favicon_images],
        append_images=favicon_images[1:]
    )
    print(f"  Saved: {favicon_path}")

    print("\n✓ All icons generated successfully!")
    print("\nGenerated files:")
    for _, _, filename in icon_sizes:
        print(f"  - {filename}")
    print("  - favicon.ico")

if __name__ == "__main__":
    generate_icons()
