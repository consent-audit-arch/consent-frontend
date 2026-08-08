import type {
  BatchAuthorizationRequest,
  BatchAuthorizationResponse,
  ConsentHistoryResponse,
  ConsentResponse,
  DeactivateConsentRequest,
  DeactivateConsentResponse,
  GrantConsentRequest,
  RevokeConsentRequest,
} from '../types';
import { commandClient, queryClient } from './client';

export const grantConsent = (data: GrantConsentRequest) =>
  commandClient.post('/api/v1/consent', data);

export const revokeConsent = (ownerId: number, data: RevokeConsentRequest) =>
  commandClient.post(`/api/v1/consent/${ownerId}/revoke`, data);

export const deactivateConsent = (data: DeactivateConsentRequest) =>
  commandClient.post<DeactivateConsentResponse>('/api/v1/consent/deactivate', data);

export const getConsentAuthorizations = (userId: number) =>
  queryClient.get<ConsentResponse>(`/api/v1/consent/${userId}`);

export const getConsentHistory = (userId: number) =>
  queryClient.get<ConsentHistoryResponse>(`/api/v1/consent/${userId}/history`);

export const batchAuthorizations = (data: BatchAuthorizationRequest) =>
  queryClient.post<BatchAuthorizationResponse>('/api/v1/consent/batch/authorizations', data);
