export function buildAnimatedDigits(value) {
  const characters = String(value).split("");
  return characters.map((character, index) => ({
    character,
    stagger: index === characters.length - 2 ? 1 : index === characters.length - 1 ? 2 : null
  }));
}
