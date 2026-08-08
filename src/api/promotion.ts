import type {
  PromotionResponse,
  PromotionWithProfileResponse,
  PromotionRequest,
} from '../types';
import { promotionClient, newCorrelationId } from './client';

export const listPromotions = () =>
  promotionClient.get<PromotionResponse[]>('/api/v1/promotions');

export const createPromotion = (data: PromotionRequest, purpose = 'PROMOTION') =>
  promotionClient.post<PromotionResponse>('/api/v1/promotions', data, {
    headers: {
      'X-Purpose': purpose,
      'X-Data-Categories': 'USAGE_DATA',
      'X-Correlation-Id': newCorrelationId(),
    },
  });

export const getPromotionWithProfile = (userId: number, purpose = 'PROMOTION') =>
  promotionClient.get<PromotionWithProfileResponse>(
    `/api/v1/promotions/${userId}/with-profile`,
    {
      headers: {
        'X-Purpose': purpose,
        'X-Data-Categories': 'USAGE_DATA',
        'X-Correlation-Id': newCorrelationId(),
      },
    },
  );
