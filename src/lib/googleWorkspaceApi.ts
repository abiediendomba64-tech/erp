import { callGoogleAppsScript } from './googleAppsScriptBridge';
import type { WorkspaceSnapshot } from './initialWorkspace';

export interface PublicCloudConfig {
  product: string;
  authenticationProvider: string;
  configured: boolean;
  googleClientId: string;
  reason: string;
}

export type WorkspaceRole = 'ADMIN' | 'KEUANGAN' | 'PROYEK' | 'VIEWER';
export interface CloudUser {
  email: string;
  display_name: string;
  role: WorkspaceRole;
  active: boolean;
}
export interface CloudWorkspace {
  id: string;
  name: string;
  role: WorkspaceRole;
  version: number;
  updated_at: string;
}
export interface LoginResponse {
  success: true;
  user: CloudUser;
  workspaces: CloudWorkspace[];
}
export interface LoadWorkspaceResponse {
  success: true;
  workspace: CloudWorkspace;
  snapshot: WorkspaceSnapshot;
}
export interface SaveWorkspaceResponse {
  success: boolean;
  code?: string;
  message?: string;
  currentVersion?: number;
  version?: number;
  checksum?: string;
  updated_at?: string;
  auditWarning?: string;
}

export function getCloudPublicConfig() {
  return callGoogleAppsScript<PublicCloudConfig>('apiGetPublicConfig');
}
export function loginWithGoogleIdToken(idToken: string) {
  return callGoogleAppsScript<LoginResponse>('apiLogin', idToken);
}
export interface CloudManagedUser {
  email: string;
  display_name: string;
  role: WorkspaceRole;
  active: boolean;
  workspace_role: string;
  created_at: string;
  updated_at: string;
}
export function listCloudUsers(idToken: string, workspaceId: string) {
  return callGoogleAppsScript<{ success: true; users: CloudManagedUser[] }>('apiListUsers', idToken, workspaceId);
}
export function listCloudWorkspaces(idToken: string) {
  return callGoogleAppsScript<{ success: true; workspaces: CloudWorkspace[] }>('apiListWorkspaces', idToken);
}
export function createCloudWorkspace(idToken: string, name: string, snapshot: WorkspaceSnapshot) {
  return callGoogleAppsScript<{
    success: true; workspace: CloudWorkspace; snapshot: WorkspaceSnapshot;
  }>('apiCreateWorkspace', idToken, name, snapshot);
}
export function addCloudUser(
  idToken: string,
  email: string,
  role: WorkspaceRole,
  displayName: string,
  active: boolean,
) {
  return callGoogleAppsScript<{ success: true; user: CloudUser }>(
    'apiAddUser', idToken, email, role, displayName, active
  );
}
export function addWorkspaceMember(
  idToken: string, workspaceId: string, email: string, role: WorkspaceRole
) {
  return callGoogleAppsScript<{ success: true }>(
    'apiAddWorkspaceMember', idToken, workspaceId, email, role
  );
}
export function loadCloudWorkspace(idToken: string, workspaceId: string) {
  return callGoogleAppsScript<LoadWorkspaceResponse>('apiLoadWorkspace', idToken, workspaceId);
}
export function saveCloudWorkspace(
  idToken: string, workspaceId: string, expectedVersion: number, snapshot: WorkspaceSnapshot
) {
  return callGoogleAppsScript<SaveWorkspaceResponse>(
    'apiSaveWorkspace', idToken, workspaceId, expectedVersion, snapshot
  );
}
export function getWorkspaceAudit(idToken: string, workspaceId: string, limit = 50) {
  return callGoogleAppsScript<{ success: true; events: Array<Record<string, unknown>> }>(
    'apiGetWorkspaceAudit', idToken, workspaceId, limit
  );
}
