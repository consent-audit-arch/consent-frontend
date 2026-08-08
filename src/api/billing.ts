import type {
  BillingRecordResponse,
  BillingWithProfileResponse,
  CreateBillingRecordCommand,
} from '../types';
import { billingClient, newCorrelationId } from './client';

export const createBillingRecord = (data: CreateBillingRecordCommand) =>
  billingClient.post<BillingRecordResponse>('/api/v1/billing', data);

export const getBillingWithProfile = (
  userId: number,
  billingId: number,
  purpose = 'BILLING',
) =>
  billingClient.get<BillingWithProfileResponse>(
    `/api/v1/billing/users/${userId}/billing/${billingId}/with-profile`,
    {
      headers: {
        'X-Purpose': purpose,
        'X-Data-Categories': 'FINANCIAL_DATA,PERSONAL_DATA',
        'X-Correlation-Id': newCorrelationId(),
      },
    },
  );
