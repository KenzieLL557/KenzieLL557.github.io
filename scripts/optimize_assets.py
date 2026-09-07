from pathlib import Path

from PIL import Image


def convert(source, destination, max_side=None, quality=82):
    image = Image.open(source)
    image.load()
    if max_side and max(image.size) > max_side:
        scale = max_side / max(image.size)
        image = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=quality, method=6)


photo_directory = Path("public/assets/life/user-photos")
for source in photo_directory.iterdir():
    if source.suffix.lower() in {".jpg", ".jpeg", ".png"}:
        convert(source, source.with_suffix(".webp"), max_side=1800, quality=78)

targets = [
    ("public/assets/figma/home-work-typewriter-base.png", 1100, 84),
    ("public/assets/figma/home-cow-cat-sprite.png", None, 88),
    ("public/assets/figma/hero-frame.png", 1400, 84),
    ("public/assets/figma/home-playground-vinyl.png", 700, 86),
    ("public/assets/figma/home-resume-notepad.png", 700, 86),
    ("public/assets/figma/life-profile.png", 1000, 84),
    ("public/assets/life/film-canister-transparent.png", 1800, 86),
]

for filename, max_side, quality in targets:
    source = Path(filename)
    convert(source, source.with_suffix(".webp"), max_side=max_side, quality=quality)
