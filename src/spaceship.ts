export function spaceship(a: any, b: any): -1 | 0 | 1 {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
