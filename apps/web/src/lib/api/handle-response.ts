import { useToastStore } from '@/stores/toast-store';
import { ApiError } from './client';

interface ApiResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export function showApiResponse(res: ApiResponse, defaultMessage?: string) {
  const addToast = useToastStore.getState().addToast;

  if (res.success) {
    if (res.message) addToast(res.message, 'success');
    return;
  }

  const hasFieldErrors = res.errors && Object.keys(res.errors).length > 0;

  if (hasFieldErrors) {
      for (const messages of Object.values(res.errors!)) {
        for (const msg of messages) {
          addToast(msg.charAt(0).toUpperCase() + msg.slice(1), 'error');
        }
      }
  } else if (res.message) {
    addToast(res.message, 'error');
  } else if (defaultMessage) {
    addToast(defaultMessage, 'error');
  }
}

export function showApiError(err: unknown, fallbackMessage?: string) {
  const addToast = useToastStore.getState().addToast;

  if (err instanceof ApiError) {
    const hasFieldErrors = err.errors && Object.keys(err.errors).length > 0;

    if (hasFieldErrors) {
      for (const messages of Object.values(err.errors!)) {
        for (const msg of messages) {
          addToast(msg.charAt(0).toUpperCase() + msg.slice(1), 'error');
        }
      }
      return;
    }

    addToast(err.message || fallbackMessage || 'Có lỗi xảy ra', 'error');
    return;
  }

  if (err instanceof Error) {
    addToast(err.message || fallbackMessage || 'Có lỗi xảy ra', 'error');
    return;
  }

  addToast(fallbackMessage || 'Có lỗi xảy ra', 'error');
}
