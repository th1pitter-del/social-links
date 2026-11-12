import 'server-only'

import './github-oauth'
import './google-oauth'
import './telegram'
import './youtube'

export {
  activeOAuthVerifierForAction,
  activeVerifierFor,
  normalizeHandle,
  oauthProvider,
  oauthVerifierForAction,
  verificationEnabled,
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
