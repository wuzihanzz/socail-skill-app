#!/usr/bin/env python3
"""
Simple Stable Diffusion avatar generator - no Cog needed
"""

import torch
import os
from pathlib import Path
from PIL import Image
from diffusers import StableDiffusionPipeline

# Check GPU availability
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

if device == "cpu":
    print("⚠️  CPU mode - generation will be SLOW (5-10 min per image)")
    print("For faster results, use GPU (NVIDIA CUDA)")

# Character definitions
CHARACTERS = {
    "lin-xue": {
        "neutral": "a cute pixel art girl with wavy orange-red hair, green eyes, wearing a blue dress with black accents, 32-bit retro pixel art style, detailed pixelated face with calm neutral expression, vibrant warm colors, clean pixel shading, high quality, white background",
        "happy": "a cute pixel art girl with wavy orange-red hair, green eyes, wearing a blue dress with black accents, 32-bit retro pixel art style, detailed pixelated face with big happy smile, vibrant warm colors, clean pixel shading, high quality, white background",
        "upset": "a cute pixel art girl with wavy orange-red hair, pink eyes, wearing a blue dress, 32-bit retro pixel art style, detailed pixelated face with upset sad expression, warm colors, clean pixel shading, high quality, white background",
    },
    "chen-wei": {
        "neutral": "a handsome pixel art man with dark short hair, professional serious face, wearing a blue suit with white shirt, 32-bit retro pixel art style, detailed pixelated face with calm expression, warm earthy tones, clean pixel shading, high quality, white background",
        "happy": "a handsome pixel art man with dark short hair, wearing a blue suit with white shirt, 32-bit retro pixel art style, detailed pixelated face with warm genuine smile, warm earthy tones, clean pixel shading, high quality, white background",
        "upset": "a handsome pixel art man with dark short hair, serious face, wearing a blue suit, 32-bit retro pixel art style, detailed pixelated face with frustrated expression, warm earthy tones, clean pixel shading, high quality, white background",
    },
    "xiao-mei": {
        "neutral": "a cute pixel art girl with brown hair and white nurse cap with pink band, wearing white nurse uniform with red cross, 32-bit retro pixel art style, detailed cute pixelated face with kind expression, warm colors, clean pixel shading, high quality, white background",
        "happy": "a cute pixel art girl with brown hair and white nurse cap with pink band, wearing white nurse uniform with red cross, 32-bit retro pixel art style, detailed cute pixelated face with warm bright smile, warm colors, clean pixel shading, high quality, white background",
        "upset": "a cute pixel art girl with brown hair and white nurse cap, wearing white nurse uniform, 32-bit retro pixel art style, detailed cute pixelated face with worried sad expression, warm colors, clean pixel shading, high quality, white background",
    }
}

def generate_avatars():
    """Generate all character avatars"""

    # Create output directory
    output_dir = Path("src/assets/avatars")
    output_dir.mkdir(parents=True, exist_ok=True)

    print("\n" + "="*60)
    print("🎨 STABLE DIFFUSION AVATAR GENERATOR")
    print("="*60)

    # Load model
    print("\n📥 Loading Stable Diffusion v1.5...")
    print("   (First run downloads ~4GB, please wait...)")

    pipe = StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        safety_checker=None,  # Disable safety checker to avoid black images
    )
    pipe = pipe.to(device)

    # Optional: enable memory optimization for slower GPUs/CPU
    if device == "cpu":
        pipe.enable_attention_slicing()

    print("✅ Model loaded!\n")

    # Generate images
    total = sum(len(emotions) for emotions in CHARACTERS.values())
    count = 0

    for char_id, emotions in CHARACTERS.items():
        print(f"📍 {char_id.upper()}")

        for emotion, prompt in emotions.items():
            count += 1
            print(f"   [{count}/{total}] Generating {emotion}...", end=" ", flush=True)

            try:
                image = pipe(
                    prompt,
                    height=512,
                    width=512,
                    num_inference_steps=30,
                    guidance_scale=7.5,
                ).images[0]

                # Save image
                filename = output_dir / f"{char_id}_{emotion}.png"
                image.save(filename)
                print(f"✅ {filename.name}")

            except Exception as e:
                print(f"❌ Error: {e}")

    print("\n" + "="*60)
    print(f"✅ ALL DONE! Generated {total} avatars")
    print(f"📁 Saved to: {output_dir.absolute()}")
    print("="*60)

if __name__ == "__main__":
    try:
        generate_avatars()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
