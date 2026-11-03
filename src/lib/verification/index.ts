import 'server-only'

import './bluesky'
import './github'
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
