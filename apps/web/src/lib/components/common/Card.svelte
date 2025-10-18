<script lang="ts">
  interface Props {
    class?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    children?: any;
  }

  let {
    class: className = '',
    padding = 'md',
    children
  }: Props = $props();

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
</script>

<div class="bg-white rounded-lg shadow-md {paddingClasses[padding]} {className}">
  {@render children?.()}
</div>

