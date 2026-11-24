 

 

 

 
 
 

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthenticatedRouteRouteImport } from './routes/_authenticated/route'
import { Route as ForgotPasswordRouteImport } from './routes/forgot-password'
import { Route as LoginRouteImport } from './routes/login'
import { Route as RegisterRouteImport } from './routes/register'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as AuthenticatedCommunitiesRouteImport } from './routes/_authenticated/communities'
import { Route as AuthenticatedExploreRouteImport } from './routes/_authenticated/explore'
import { Route as AuthenticatedFeedRouteImport } from './routes/_authenticated/feed'
import { Route as AuthenticatedInterestsRouteImport } from './routes/_authenticated/interests'
import { Route as AuthenticatedMessagesRouteImport } from './routes/_authenticated/messages'
import { Route as AuthenticatedProfileRouteImport } from './routes/_authenticated/profile'
import { Route as AuthenticatedSavedRouteImport } from './routes/_authenticated/saved'
import { Route as AuthenticatedSettingsRouteImport } from './routes/_authenticated/settings'
import { Route as AuthenticatedCSlugRouteImport } from './routes/_authenticated/c/$slug'
import { Route as AuthenticatedPostPostIdRouteImport } from './routes/_authenticated/post/$postId'
import { Route as AuthenticatedUUsernameRouteImport } from './routes/_authenticated/u/$username'

const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedRouteRoute = AuthenticatedRouteRouteImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRouteImport,
} as any)
const ForgotPasswordRoute = ForgotPasswordRouteImport.update({
  id: '/forgot-password',
  path: '/forgot-password',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const RegisterRoute = RegisterRouteImport.update({
  id: '/register',
  path: '/register',
  getParentRoute: () => rootRouteImport,
} as any)
const ResetPasswordRoute = ResetPasswordRouteImport.update({
  id: '/reset-password',
  path: '/reset-password',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedCommunitiesRoute =
  AuthenticatedCommunitiesRouteImport.update({
    id: '/communities',
    path: '/communities',
    getParentRoute: () => AuthenticatedRouteRoute,
  } as any)
const AuthenticatedExploreRoute = AuthenticatedExploreRouteImport.update({
  id: '/explore',
  path: '/explore',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedFeedRoute = AuthenticatedFeedRouteImport.update({
  id: '/feed',
  path: '/feed',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedInterestsRoute = AuthenticatedInterestsRouteImport.update({
  id: '/interests',
  path: '/interests',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedMessagesRoute = AuthenticatedMessagesRouteImport.update({
  id: '/messages',
  path: '/messages',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedProfileRoute = AuthenticatedProfileRouteImport.update({
  id: '/profile',
  path: '/profile',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedSavedRoute = AuthenticatedSavedRouteImport.update({
  id: '/saved',
  path: '/saved',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedSettingsRoute = AuthenticatedSettingsRouteImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedCSlugRoute = AuthenticatedCSlugRouteImport.update({
  id: '/c/$slug',
  path: '/c/$slug',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedPostPostIdRoute = AuthenticatedPostPostIdRouteImport.update({
  id: '/post/$postId',
  path: '/post/$postId',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)
const AuthenticatedUUsernameRoute = AuthenticatedUUsernameRouteImport.update({
  id: '/u/$username',
  path: '/u/$username',
  getParentRoute: () => AuthenticatedRouteRoute,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/reset-password': typeof ResetPasswordRoute
  '/communities': typeof AuthenticatedCommunitiesRoute
  '/explore': typeof AuthenticatedExploreRoute
  '/feed': typeof AuthenticatedFeedRoute
  '/interests': typeof AuthenticatedInterestsRoute
  '/messages': typeof AuthenticatedMessagesRoute
  '/profile': typeof AuthenticatedProfileRoute
  '/saved': typeof AuthenticatedSavedRoute
  '/settings': typeof AuthenticatedSettingsRoute
  '/c/$slug': typeof AuthenticatedCSlugRoute
  '/post/$postId': typeof AuthenticatedPostPostIdRoute
  '/u/$username': typeof AuthenticatedUUsernameRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/reset-password': typeof ResetPasswordRoute
  '/communities': typeof AuthenticatedCommunitiesRoute
  '/explore': typeof AuthenticatedExploreRoute
  '/feed': typeof AuthenticatedFeedRoute
  '/interests': typeof AuthenticatedInterestsRoute
  '/messages': typeof AuthenticatedMessagesRoute
  '/profile': typeof AuthenticatedProfileRoute
  '/saved': typeof AuthenticatedSavedRoute
  '/settings': typeof AuthenticatedSettingsRoute
  '/c/$slug': typeof AuthenticatedCSlugRoute
  '/post/$postId': typeof AuthenticatedPostPostIdRoute
  '/u/$username': typeof AuthenticatedUUsernameRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/_authenticated': typeof AuthenticatedRouteRouteWithChildren
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/register': typeof RegisterRoute
  '/reset-password': typeof ResetPasswordRoute
  '/_authenticated/communities': typeof AuthenticatedCommunitiesRoute
  '/_authenticated/explore': typeof AuthenticatedExploreRoute
  '/_authenticated/feed': typeof AuthenticatedFeedRoute
  '/_authenticated/interests': typeof AuthenticatedInterestsRoute
  '/_authenticated/messages': typeof AuthenticatedMessagesRoute
  '/_authenticated/profile': typeof AuthenticatedProfileRoute
  '/_authenticated/saved': typeof AuthenticatedSavedRoute
  '/_authenticated/settings': typeof AuthenticatedSettingsRoute
  '/_authenticated/c/$slug': typeof AuthenticatedCSlugRoute
  '/_authenticated/post/$postId': typeof AuthenticatedPostPostIdRoute
  '/_authenticated/u/$username': typeof AuthenticatedUUsernameRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/forgot-password'
    | '/login'
    | '/register'
    | '/reset-password'
    | '/communities'
    | '/explore'
    | '/feed'
    | '/interests'
    | '/messages'
    | '/profile'
    | '/saved'
    | '/settings'
    | '/c/$slug'
    | '/post/$postId'
    | '/u/$username'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/forgot-password'
    | '/login'
    | '/register'
    | '/reset-password'
    | '/communities'
    | '/explore'
    | '/feed'
    | '/interests'
    | '/messages'
    | '/profile'
    | '/saved'
    | '/settings'
    | '/c/$slug'
    | '/post/$postId'
    | '/u/$username'
  id:
    | '__root__'
    | '/'
    | '/_authenticated'
    | '/forgot-password'
    | '/login'
    | '/register'
    | '/reset-password'
    | '/_authenticated/communities'
    | '/_authenticated/explore'
    | '/_authenticated/feed'
    | '/_authenticated/interests'
    | '/_authenticated/messages'
    | '/_authenticated/profile'
    | '/_authenticated/saved'
    | '/_authenticated/settings'
    | '/_authenticated/c/$slug'
    | '/_authenticated/post/$postId'
    | '/_authenticated/u/$username'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthenticatedRouteRoute: typeof AuthenticatedRouteRouteWithChildren
  ForgotPasswordRoute: typeof ForgotPasswordRoute
  LoginRoute: typeof LoginRoute
  RegisterRoute: typeof RegisterRoute
  ResetPasswordRoute: typeof ResetPasswordRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedRouteRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/forgot-password': {
      id: '/forgot-password'
      path: '/forgot-password'
      fullPath: '/forgot-password'
      preLoaderRoute: typeof ForgotPasswordRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/reset-password': {
      id: '/reset-password'
      path: '/reset-password'
      fullPath: '/reset-password'
      preLoaderRoute: typeof ResetPasswordRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated/communities': {
      id: '/_authenticated/communities'
      path: '/communities'
      fullPath: '/communities'
      preLoaderRoute: typeof AuthenticatedCommunitiesRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/explore': {
      id: '/_authenticated/explore'
      path: '/explore'
      fullPath: '/explore'
      preLoaderRoute: typeof AuthenticatedExploreRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/feed': {
      id: '/_authenticated/feed'
      path: '/feed'
      fullPath: '/feed'
      preLoaderRoute: typeof AuthenticatedFeedRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/interests': {
      id: '/_authenticated/interests'
      path: '/interests'
      fullPath: '/interests'
      preLoaderRoute: typeof AuthenticatedInterestsRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/messages': {
      id: '/_authenticated/messages'
      path: '/messages'
      fullPath: '/messages'
      preLoaderRoute: typeof AuthenticatedMessagesRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/profile': {
      id: '/_authenticated/profile'
      path: '/profile'
      fullPath: '/profile'
      preLoaderRoute: typeof AuthenticatedProfileRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/saved': {
      id: '/_authenticated/saved'
      path: '/saved'
      fullPath: '/saved'
      preLoaderRoute: typeof AuthenticatedSavedRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/settings': {
      id: '/_authenticated/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof AuthenticatedSettingsRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/c/$slug': {
      id: '/_authenticated/c/$slug'
      path: '/c/$slug'
      fullPath: '/c/$slug'
      preLoaderRoute: typeof AuthenticatedCSlugRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/post/$postId': {
      id: '/_authenticated/post/$postId'
      path: '/post/$postId'
      fullPath: '/post/$postId'
      preLoaderRoute: typeof AuthenticatedPostPostIdRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
    '/_authenticated/u/$username': {
      id: '/_authenticated/u/$username'
      path: '/u/$username'
      fullPath: '/u/$username'
      preLoaderRoute: typeof AuthenticatedUUsernameRouteImport
      parentRoute: typeof AuthenticatedRouteRoute
    }
  }
}

interface AuthenticatedRouteRouteChildren {
  AuthenticatedCommunitiesRoute: typeof AuthenticatedCommunitiesRoute
  AuthenticatedExploreRoute: typeof AuthenticatedExploreRoute
  AuthenticatedFeedRoute: typeof AuthenticatedFeedRoute
  AuthenticatedInterestsRoute: typeof AuthenticatedInterestsRoute
  AuthenticatedMessagesRoute: typeof AuthenticatedMessagesRoute
  AuthenticatedProfileRoute: typeof AuthenticatedProfileRoute
  AuthenticatedSavedRoute: typeof AuthenticatedSavedRoute
  AuthenticatedSettingsRoute: typeof AuthenticatedSettingsRoute
  AuthenticatedCSlugRoute: typeof AuthenticatedCSlugRoute
  AuthenticatedPostPostIdRoute: typeof AuthenticatedPostPostIdRoute
  AuthenticatedUUsernameRoute: typeof AuthenticatedUUsernameRoute
}

const AuthenticatedRouteRouteChildren: AuthenticatedRouteRouteChildren = {
  AuthenticatedCommunitiesRoute: AuthenticatedCommunitiesRoute,
  AuthenticatedExploreRoute: AuthenticatedExploreRoute,
  AuthenticatedFeedRoute: AuthenticatedFeedRoute,
  AuthenticatedInterestsRoute: AuthenticatedInterestsRoute,
  AuthenticatedMessagesRoute: AuthenticatedMessagesRoute,
  AuthenticatedProfileRoute: AuthenticatedProfileRoute,
  AuthenticatedSavedRoute: AuthenticatedSavedRoute,
  AuthenticatedSettingsRoute: AuthenticatedSettingsRoute,
  AuthenticatedCSlugRoute: AuthenticatedCSlugRoute,
  AuthenticatedPostPostIdRoute: AuthenticatedPostPostIdRoute,
  AuthenticatedUUsernameRoute: AuthenticatedUUsernameRoute,
}

const AuthenticatedRouteRouteWithChildren =
  AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
  ForgotPasswordRoute: ForgotPasswordRoute,
  LoginRoute: LoginRoute,
  RegisterRoute: RegisterRoute,
  ResetPasswordRoute: ResetPasswordRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
