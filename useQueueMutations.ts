import {UseMutationOptions, useMutation} from '@tanstack/react-query';
import {useEffect, useRef} from 'react';

type InFlightMutation<TData, TVariables, TError, TContext> = {
  isInFlight: boolean;
  mutateAsyncCallback: () => Promise<TData>;
  variables: TVariables;
  mutationOptions?: UseMutationOptions<TData, TError, TVariables, TContext>;
};

export function useQueuedMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): {
  queue: (
    variables: TVariables,
    mutationOptions?: UseMutationOptions<TData, TError, TVariables, TContext>,
  ) => void;
  isLoading: boolean;
} {
  const updateQuery = useMutation({mutationFn: options.mutationFn});
  const pendingMutations = useRef<
    Array<InFlightMutation<TData, TVariables, TError, TContext>>
  >([]);

  useEffect(() => {
    if (
      pendingMutations.current.length === 0 ||
      pendingMutations.current.some(m => m.isInFlight)
    ) {
      return;
    }
    // Find the next mutation that is not in flight
    const [nextMutation, ...rest] = pendingMutations.current;
    if (!nextMutation) {
      return;
    }
    nextMutation.isInFlight = true;
    pendingMutations.current = [nextMutation, ...rest];
    // Execute the next mutation
    nextMutation
      ?.mutateAsyncCallback()
      .then((data: any) => {
        options.onSuccess?.(
          data,
          nextMutation.variables,
          undefined as TContext,
        );
        nextMutation.mutationOptions?.onSuccess?.(
          data,
          nextMutation.variables,
          undefined as TContext,
        );
      })
      .catch(error => {
        options.onError?.(error, nextMutation.variables, undefined);
        nextMutation.mutationOptions?.onError?.(
          error,
          nextMutation.variables,
          undefined,
        );
      })
      .finally(() => {
        options.onSettled?.(
          undefined as TData,
          null,
          nextMutation.variables,
          undefined,
        );
        nextMutation.mutationOptions?.onSettled?.(
          undefined as TData,
          null,
          nextMutation.variables,
          undefined,
        );
        // Remove the mutation from the pending list
        pendingMutations.current = pendingMutations.current.filter(
          p => p !== nextMutation,
        );
      });
  }, [options, pendingMutations]);

  const queue = (
    variables: TVariables,
    mutationOptions?: UseMutationOptions<TData, TError, TVariables, TContext>,
  ) => {
    options.onMutate?.(variables); // optimistic update is performed as soon as the mutation is queued

    // const active = pendingMutations.current.filter(m => m.isInFlight);
    pendingMutations.current = [
      ...pendingMutations.current,
      {
        isInFlight: false,
        mutateAsyncCallback: () => updateQuery.mutateAsync(variables),
        variables,
        mutationOptions,
      },
    ];
    console.log('Queued mutation:', pendingMutations.current.length);
  };
  return {queue, isLoading: pendingMutations.current.length > 0};
}
