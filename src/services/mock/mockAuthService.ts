import type { AuthService, SettingsService } from '../contracts'
import { read, reset, write } from './db'
import { withLatency } from './delay'

/** Demo session: there is one sample manager and no password. */
export const mockAuthService: AuthService = {
  getCurrentManager: () => withLatency(() => read().manager),
  updateManager: (input) =>
    withLatency(() => {
      write(['session'], (draft) => {
        draft.manager = {
          ...draft.manager,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          organization: { ...draft.manager.organization, name: input.organizationName },
        }
      })
      return read().manager
    }),
  isSignedIn: () => read().signedIn,
  signIn: () =>
    withLatency(() => {
      write(['session'], (draft) => {
        draft.signedIn = true
      })
    }),
  signOut: () =>
    withLatency(() => {
      write(['session'], (draft) => {
        draft.signedIn = false
      })
    }),
}

export const mockSettingsService: SettingsService = {
  get: () => withLatency(() => read().settings),
  update: (patch) =>
    withLatency(() => {
      write(['settings', 'alerts'], (draft) => {
        draft.settings = { ...draft.settings, ...patch }
      })
      return read().settings
    }),
  resetDemoData: () => withLatency(() => reset()),
}
