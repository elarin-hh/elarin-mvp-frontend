<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authService } from '$lib/services/supabase.client';
  import { asset } from '$lib/utils/assets';

  let email = $state('');
  let password = $state('');
  let isLoading = $state(false);
  let error = $state('');

  async function handleLogin() {
    error = '';
    isLoading = true;

    try {
      const result = await authService.signIn(email, password);

      if (result.error) {
        error = result.error.message || 'Credenciais inválidas';
        isLoading = false;
      } else {
        goto(`${base}/exercises`);
      }
    } catch (e: any) {
      error = e.message || 'Erro ao fazer login';
      isLoading = false;
    }
  }

  function goToRegister() {
    goto(`${base}/register`);
  }
</script>

<style>
  .glass-button {
    background: var(--color-glass-light);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 18px;
    position: relative;
    overflow: hidden;
  }
</style>

<div class="min-h-screen bg-black flex flex-col items-center justify-center px-4">
  <div class="mb-16 text-center">
    <img 
      src={asset('/logo-elarin.png')} 
      alt="Elarin" 
      class="h-20 mx-auto"
    />
  </div>

  <form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="w-full max-w-md space-y-4">
    {#if error}
      <div class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 text-sm text-center" style="border-radius: 18px;">
        {error}
      </div>
    {/if}

    <input
      type="email"
      bind:value={email}
      required
      placeholder="E-mail"
      class="w-full px-6 py-3 bg-transparent border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
      style="border-radius: 18px; border-width: 0.8px;"
    />

    <input
      type="password"
      bind:value={password}
      required
      placeholder="Senha"
      class="w-full px-6 py-3 bg-transparent border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
      style="border-radius: 18px; border-width: 0.8px;"
    />

    <button
      type="submit"
      disabled={isLoading}
      class="glass-button w-full px-6 py-3 text-white font-medium transition-all disabled:opacity-50"
    >
      {isLoading ? 'Carregando...' : 'Logar'}
    </button>
  </form>

  <div class="mt-8 text-center">
    <button
      type="button"
      onclick={goToRegister}
      class="text-white/70 hover:text-white text-sm transition-colors"
    >
      Não tem uma conta? Clique aqui
    </button>
  </div>

  <div class="absolute bottom-8 text-center">
    <p class="text-white/50 text-sm">
      Política de Privacidade e Termos de Uso
    </p>
  </div>
</div>
