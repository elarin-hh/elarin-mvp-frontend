<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { ExerciseType } from '$lib/stores/train.store';

  interface Props {
    exerciseType: ExerciseType | null;
    class?: string;
  }

  let { exerciseType, class: className = '' }: Props = $props();
</script>

<div class="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden {className}">
  <!-- Placeholder for video stream -->
  <div class="absolute inset-0 flex flex-col items-center justify-center text-white">
    <div class="border-4 border-dashed border-gray-600 rounded-lg p-12 text-center">
      <svg class="w-24 h-24 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      
      <p class="text-xl font-semibold mb-2">
        {$_('train.videoUnavailable')}
      </p>
      
      {#if exerciseType}
        <p class="text-sm text-gray-400">
          Exercise: {$_(`train.${exerciseType}`)}
        </p>
      {/if}
      
      <p class="text-xs text-gray-500 mt-4 max-w-md">
        {$_('train.introMessage')}
      </p>
    </div>
  </div>

  {/* TODO: Add video element when camera capture is implemented
  <video class="w-full h-full object-cover" autoplay playsinline />
  */}
  
  {/* TODO: Add canvas overlay for pose landmarks when vision processing is implemented
  <canvas class="absolute inset-0 w-full h-full" />
  */}
</div>

