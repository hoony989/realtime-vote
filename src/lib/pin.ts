import crypto from 'crypto'

export function hashPin(pin: string, roomId: string): string {
  return crypto.createHash('sha256').update(`${roomId}:${pin}`).digest('hex')
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin)
}
