<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { TrainingStatus } from '$lib/stores/train.store';

  interface Props {
    status: TrainingStatus;
    reps?: number;
    sets?: number;
    duration?: number;
  }

  let {
    status,
    reps = 0,
    sets = 0,
    duration = 0
  }: Props = $props();

  // Format duration as MM:SS
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Get status color
  function getStatusColor(status: TrainingStatus): string {
    switch (status) {
      case 'idle':
        return 'bg-gray-500';
      case 'ready':
        return 'bg-yellow-500';
      case 'training':
        return 'bg-green-500';
      case 'paused':
        return 'bg-orange-500';
      case 'finished':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  }
</script>

<div class="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-4">
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <!-- Status -->
    <div class="text-center">
      <div class="text-xs font-medium text-gray-600 mb-1">Status</div>
      <div class="flex items-center justify-center gap-2">
        <div class="w-2 h-2 rounded-full {getStatusColor(status)}"></div>
        <div class="text-sm font-semibold text-gray-900">
          {$_(`train.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
        </div>
      </div>
    </div>

    <!-- Reps -->
    <div class="text-center">
      <div class="text-xs font-medium text-gray-600 mb-1">{$_('train.reps')}</div>
      <div class="text-2xl font-bold text-primary-600">{reps}</div>
    </div>

    <!-- Sets -->
    <div class="text-center">
      <div class="text-xs font-medium text-gray-600 mb-1">{$_('train.sets')}</div>
      <div class="text-2xl font-bold text-primary-600">{sets}</div>
    </div>

    <!-- Duration -->
    <div class="text-center">
      <div class="text-xs font-medium text-gray-600 mb-1">{$_('train.duration')}</div>
      <div class="text-2xl font-bold text-gray-900">{formatDuration(duration)}</div>
    </div>
  </div>

  <!-- Mock KPIs (placeholder for future implementation) -->
  <div class="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-xs text-gray-500">
    <div>
      <span class="font-medium">FPS:</span>
      <span class="ml-1">—</span>
      <span class="text-gray-400 ml-1">(awaiting camera)</span>
    </div>
    <div>
      <span class="font-medium">Resolution:</span>
      <span class="ml-1">—</span>
      <span class="text-gray-400 ml-1">(awaiting camera)</span>
    </div>
  </div>
</div>

