<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Button from '$lib/components/common/Button.svelte';

  interface Props {
    onContinue: () => void;
  }

  let { onContinue }: Props = $props();
</script>

<div class="max-w-2xl mx-auto text-center">
  <div class="mb-8">
    <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>

    <h2 class="text-3xl font-bold text-gray-900 mb-4">
      {$_('train.introTitle')}
    </h2>
  </div>

  <div class="space-y-6 mb-8 text-left">
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 class="font-semibold text-blue-900 mb-2 flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        MVP Notice
      </h3>
      <p class="text-blue-800 text-sm">
        {$_('train.introMessage')}
      </p>
    </div>

    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 class="font-semibold text-green-900 mb-2 flex items-center gap-2">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        Privacy
      </h3>
      <p class="text-green-800 text-sm">
        {$_('train.privacyNote')}
      </p>
    </div>

    <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h3 class="font-semibold text-gray-900 mb-2">Next Steps (Future)</h3>
      <ul class="text-sm text-gray-700 space-y-1 list-disc list-inside">
        <li>Camera permission request</li>
        <li>Real-time pose detection</li>
        <li>Exercise form feedback</li>
        <li>Automatic rep counting</li>
      </ul>
    </div>
  </div>

  <Button variant="primary" size="lg" onclick={onContinue}>
    {$_('common.continue')}
  </Button>
</div>

