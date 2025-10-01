<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Card from '$lib/components/common/Card.svelte';
  import type { ExerciseType } from '$lib/stores/train.store';

  interface Props {
    onSelect: (exercise: ExerciseType) => void;
  }

  let { onSelect }: Props = $props();

  const exercises: ExerciseType[] = ['squat', 'lunge', 'plank'];
  
  const exerciseIcons: Record<ExerciseType, string> = {
    squat: 'M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z',
    lunge: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
    plank: 'M14 2H4c-1.11 0-2 .89-2 2v10c0 1.11.89 2 2 2h10c1.11 0 2-.89 2-2V4c0-1.11-.89-2-2-2zm0 12H4V4h10v10z'
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

