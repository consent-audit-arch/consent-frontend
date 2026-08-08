import type {
  AccessProofResponse,
  AnomalyResponse,
  ComplianceReportResponse,
  StatsResponse,
  TrailItem,
} from '../types';
import { auditClient } from './client';

export const getAuditStats = () =>
  auditClient.get<StatsResponse>('/api/v1/audit/stats');

export const getSubjectTrail = (id: number) =>
  auditClient.get<TrailItem[]>(`/api/v1/audit/subjects/${id}/trail`);

export const getComplianceReport = (id: number) =>
  auditClient.get<ComplianceReportResponse>(`/api/v1/audit/subjects/${id}/compliance`);

export const getAnomalies = () =>
  auditClient.get<AnomalyResponse[]>('/api/v1/audit/anomalies');

export const getAccessProof = (traceId: string) =>
  auditClient.get<AccessProofResponse>(`/api/v1/audit/access/${traceId}/proof`);
