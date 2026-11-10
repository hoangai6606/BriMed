import { AccessToken } from 'livekit-server-sdk'

// Cấu hình LiveKit Cloud (env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
export function livekitConfig() {
  return {
    url: process.env.LIVEKIT_URL || '',
    key: process.env.LIVEKIT_API_KEY || '',
    secret: process.env.LIVEKIT_API_SECRET || '',
  }
}

export function livekitEnabled(): boolean {
  const c = livekitConfig()
  return !!(c.url && c.key && c.secret)
}

// Cấp token tham gia phòng gọi video của một lượt khám.
// TTL 15 phút — dài hơn giới hạn 7 phút/lượt phía client để không đứt giữa chừng.
export async function mintCallToken(
  consultationId: number,
  user: { id: number; full_name: string },
  role: 'doctor' | 'patient',
): Promise<{ url: string; token: string; room: string; max_duration_sec: number }> {
  const c = livekitConfig()
  const at = new AccessToken(c.key, c.secret, {
    identity: `${role}-${user.id}`,
    name: user.full_name,
    ttl: 15 * 60,
  })
  const room = `consult-${consultationId}`
  at.addGrant({ room, canPublish: true, canSubscribe: true, roomJoin: true })
  return { url: c.url, token: await at.toJwt(), room, max_duration_sec: 420 }
}
