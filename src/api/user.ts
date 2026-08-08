import type {
  CreateUserCommand,
  DeactivateUserResponse,
  UserContractProfileDTO,
  UserResponse,
  UserUsageProfileDTO,
} from '../types';
import { userClient } from './client';

export const createUser = (data: CreateUserCommand) =>
  userClient.post<UserResponse>('/api/v1/users', data);

export const listUsers = () =>
  userClient.get<UserResponse[]>('/api/v1/users');

export const getUser = (id: number) =>
  userClient.get<UserResponse>(`/api/v1/users/${id}`);

export const deactivateUser = (id: number) =>
  userClient.post<DeactivateUserResponse>(`/api/v1/users/${id}/deactivate`);

export const getUserContracts = (id: number) =>
  userClient.get<UserContractProfileDTO[]>(`/api/v1/users/${id}/contract`);

export const getUserUsage = (id: number) =>
  userClient.get<UserUsageProfileDTO[]>(`/api/v1/users/${id}/usage`);
