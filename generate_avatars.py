#!/usr/bin/env python3
"""
Generate pixel art avatars using Stable Diffusion via Hugging Face Diffusers
"""

import torch
from diffusers import StableDiffusionPipeline
from PIL import Image
import os

# Character prompts with emotion variations
characters = {
    "lin-xue": {
        "name": "Lin Xue - Designer",
        "prompts": {
            "neutral": "A cute pixel art girl with wavy orange-red hair, green eyes, wearing a blue dress with black accents, 32-bit retro pixel art style, detailed pixelated face with neutral calm expression, vibrant warm colors, clean pixel shading, high quality, no background, white background",
            "happy": "A cute pixel art girl with wavy orange-red hair, green eyes, wearing a blue dress with black accents, 32-bit retro pixel art style, detailed pixelated face with big happy smile, vibrant warm colors, clean pixel shading, high quality, no background, white background",
            "upset": "A cute pixel art girl with wavy orange-red hair, pink eyes, wearing a blue dress with black accents, 32-bit retro pixel art style, detailed pixelated face with upset sad expression, warm colors, clean pixel shading, high quality, no background, white background",
        }
    },
    "chen-wei": {
        "name": "Chen Wei - Lawyer",
        "prompts": {
            "neutral": "A handsome pixel art man with dark short hair, professional serious face, wearing a blue suit with white shirt, 32-bit retro pixel art style, detailed pixelated face with calm neutral expression, warm earthy tones, clean pixel shading, high quality, no background, white background",
            "happy": "A handsome pixel art man with dark short hair, professional face, wearing a blue suit with white shirt, 32-bit retro pixel art style, detailed pixelated face with warm genuine smile, warm earthy tones, clean pixel shading, high quality, no background, white background",
            "upset": "A handsome pixel art man with dark short hair, serious angry face, wearing a blue suit with white shirt, 32-bit retro pixel art style, detailed pixelated face with upset frustrated expression, warm earthy tones, clean pixel shading, high quality, no background, white background",
        }
    },
    "xiao-mei": {
        "name": "Xiao Mei - Nurse",
        "prompts": {
            "neutral": "A cute pixel art girl with brown hair and white nurse cap with pink band, wearing white nurse uniform with red cross, 32-bit retro pixel art style, detailed cute pixelated face with kind calm expression, warm colors, clean pixel shading, high quality, no background, white background",
            "happy": "A cute pixel art girl with brown hair and white nurse cap with pink band, wearing white nurse uniform with red cross, 32-bit retro pixel art style, detailed cute pixelated face with warm bright smile, warm colors, clean pixel shading, high quality, no background, white background",
            "upset": "A cute pixel art girl with brown hair and white nurse cap with pink band, wearing white nurse uniform with red cross, 32-bit retro pixel art style, detailed cute pixelated face with worried sad expression, warm colors, clean pixel shading, high quality, no background, white background",
        }
    }
}

def generate_avatars():
    """Generate pixel art avatars for all characters and emotions"""

    print("Loading Stable Diffusion model...")
    print("⚠️  This will download ~4GB model on first run. Be patient...")

    # Use smaller, faster model for faster generation
    model_id = "runwayml/stable-diffusion-v1-5"

    pipe = StableDiffusionPipeline.from_pretrained(
        model_id,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    )

    if torch.cuda.is_available():
        pipe = pipe.to("cuda")
        print("✓ Using GPU acceleration")
    else:
        print("⚠️  GPU not available, using CPU (will be slow)")

    # Create output directory
    output_dir = "src/assets/avatars"
    os.makedirs(output_dir, exist_ok=True)

    print(f"\n🎨 Generating avatars...")

    for char_id, char_data in characters.items():
        print(f"\n📍 Generating {char_data['name']}...")

        for emotion, prompt in char_data["prompts"].items():
            print(f"  {emotion}...", end=" ", flush=True)

            image = pipe(
                prompt,
                height=512,
                width=512,
                num_inference_steps=30,
                guidance_scale=7.5,
            ).images[0]

            # Crop to square and resize to 256px
            image = image.crop((128, 0, 384, 256))  # Crop to face area
            image = image.resize((256, 256), Image.Resampling.LANCZOS)

            # Save
            filename = f"{output_dir}/{char_id}_{emotion}.png"
            image.save(filename)
            print(f"✓ {filename}")

    print("\n✅ All avatars generated successfully!")
    print(f"Saved to: {output_dir}/")

if __name__ == "__main__":
    generate_avatars()
