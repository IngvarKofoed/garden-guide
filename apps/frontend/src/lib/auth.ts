import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@garden-guide/shared';
import {
  ApiRequestError,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  registerAccount,
  type RegisterInput,
} from './api';

export function useMe() {
  return useQuery<User | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await getMe();
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiLogout(),
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      qc.clear();
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => registerAccount(input),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user);
    },
  });
}
