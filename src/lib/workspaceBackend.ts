export {
  clearWorkspaceSession,
  configureWorkspaceSession,
  createWorkspace,
  getCloudStatus,
  hasActiveWorkspaceSession,
  listUserWorkspaces,
  loadWorkspace,
  persistWorkspaceSnapshot,
  subscribeCloudStatus,
  switchToWorkspace,
} from './firebaseRest';
export type {
  CloudSaveStatus,
  CloudStatus,
  LoadedWorkspace,
  UserWorkspace,
} from './firebaseRest';
