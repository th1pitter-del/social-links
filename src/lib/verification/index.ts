import 'server-only'

import './bluesky'
import './discord'
import './github'
import './google-oauth'
import './mastodon'
import './steam'
import './telegram'
import './youtube'

export {
  activeOAuthVerifierForAction,
  activeVerifierFor,
  normalizeHandle,
  oauthProvider,
  oauthVerifierForAction,
  verifierFor,
} from './registry'
export type {
  OAuthProvider,
  OAuthVerifier,
  Verifier,
  VerifyMode,
  VerifyOutcome,
} from './registry'
export {
  buildCheckinLink,
  findCheckinVisitor,
  getBotUsername,
  isTelegramConfigured,
  readMemberStatus,
} from './telegram'
