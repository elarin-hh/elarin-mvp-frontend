<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Card from '$lib/components/common/Card.svelte';
  import type { ExerciseType } from '$lib/stores/train.store';

  interface Props {
    onSelect: (exercise: ExerciseType) => void;
  }

  let { onSelect }: Props = $props();

  const exercises: ExerciseType[] = ['plank', 'squat', 'legPress', 'abdominal', 'crossOver', 'biceps', 'triceps', 'glutes'];
  
  const exerciseIcons: Record<ExerciseType, string> = {
    plank: 'M14 2H4c-1.11 0-2 .89-2 2v10c0 1.11.89 2 2 2h10c1.11 0 2-.89 2-2V4c0-1.11-.89-2-2-2zm0 12H4V4h10v10z',
    squat: 'M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z',
    legPress: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
    abdominal: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
    crossOver: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    biceps: 'M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z',
    triceps: 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z',
    glutes: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
  };
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  {#each exercises as exercise}
    <Card class="hover:shadow-lg transition-shadow cursor-pointer" padding="lg">
      <button
        type="button"
        onclick={() => onSelect(exercise)}
        class="w-full text-left"
      >
        <div class="flex flex-col items-center text-center">
          <div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-10 h-10 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
              <path d={exerciseIcons[exercise]} />
            </svg>
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">
            {$_(`train.${exercise}`)}
          </h3>
          
          <p class="text-sm text-gray-600">
            Click to select
          </p>
        </div>
      </button>
    </Card>
  {/each}
</div>

