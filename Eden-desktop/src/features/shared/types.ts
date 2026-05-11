export interface PageState<T> {
  isLoading: boolean;
  data: T;
  error: string | null;
}

export const defaultPageState = <T,>(data: T): PageState<T> => ({
  isLoading: false,
  data,
  error: null,
});
