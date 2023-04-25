export class Env {
  static get(name: string): string {
    const value = process.env[name]
    if (!value) {
      throw new Error(`Failure to fetch parameter ${name}: ${value}`)
    }
    return value
  }
}
