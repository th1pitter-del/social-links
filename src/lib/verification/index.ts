import 'server-only'

import './bluesky'
import './discord'
import './github'
import './mastodon'
import './steam'
import './telegram'

export { activeVerifierFor, normalizeHandle, verifierFor } from './registry'
export type { Verifier, VerifyMode, VerifyOutcome } from './registry'
export {
  buildCheckinLink,
  findCheckinVisitor,
  getBotUsername,
  isTelegramConfigured,
  readMemberStatus,
} from './telegram'
