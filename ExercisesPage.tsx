import {
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import React from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import Exercise from './Exercise';
import {fakeApi, IExercise, UpdateExercisePayload} from './fakeApi';
import {useQueuedMutation} from './useQueueMutations';

const ExercisesPage = () => {
  const {data: fetchedExercises} = useQuery({
    queryKey: ['exercises'],
    queryFn: () => fakeApi.getTodos(),
    staleTime: Infinity,
  });

  const updateLocalExerciseList = (
    id: string,
    isDone: boolean,
    isNotSynced?: boolean,
  ) => {
    queryClient.setQueryData<IExercise[]>(['exercises'], exercisesList => {
      return exercisesList?.map(exercise => {
        if (exercise.id === id) {
          return {
            ...exercise,
            isDone,
            isNotSynced,
          };
        }
        return exercise;
      });
    });
  };

  const queryClient = useQueryClient();

  const updateExercise = useQueuedMutation({
    mutationKey: ['exercises'],
    scope: {
      id: 'exercises',
    },
    mutationFn: async (payload: UpdateExercisePayload) => {
      return await fakeApi.updateExerciseStatus(payload.id, payload.isDone);
    },
    onSuccess: data => {
      Alert.alert('Exercise updated: ' + data.id);
      updateLocalExerciseList(data.id, data.isDone, false);
    },
    onMutate: async (payload: UpdateExercisePayload) => {
      await queryClient.cancelQueries({queryKey: ['exercises']});
      updateLocalExerciseList(payload.id, payload.isDone, true);
    },
  });

  const pendingMutations = useMutationState({
    filters: {
      predicate: mutation =>
        mutation.state.status === 'idle' || mutation.state.status === 'pending',
    },
    select: mutation => mutation.state.variables,
  });
  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>
        Exercises {pendingMutations.length}
      </Text>
      {fetchedExercises?.map(exercise => (
        <Exercise
          onButtonPress={() =>
            updateExercise.queue({
              id: exercise.id,
              isDone: !exercise.isDone,
            })
          }
          key={exercise.id}
          exercise={exercise}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  screenTitle: {
    fontSize: 32,
    marginBottom: 8,
    fontWeight: 'bold',
  },
});

export default ExercisesPage;
