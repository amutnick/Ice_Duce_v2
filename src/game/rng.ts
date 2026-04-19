export function nextSeed(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

export function randomFloat(seed: number): [number, number] {
  const next = nextSeed(seed);
  return [next / 0x100000000, next];
}

export function randomInt(seed: number, maxExclusive: number): [number, number] {
  const [value, next] = randomFloat(seed);
  return [Math.floor(value * maxExclusive), next];
}
