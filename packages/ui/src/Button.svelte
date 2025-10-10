<script>
  export let disabled = false;
</script>

<button disabled={disabled} class="px-3 py-1 rounded bg-gray-200">
  <slot />
</button>

