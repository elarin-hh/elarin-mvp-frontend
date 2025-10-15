<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authService } from '$lib/services/supabase.client';
  import { asset } from '$lib/utils/assets';

  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let error = $state('');

  async function handleRegister() {
    error = '';

    if (password !== confirmPassword) {
      error = 'As senhas não coincidem';
      return;
    }

    if (password.length < 8) {
      error = 'A senha deve ter no mínimo 8 caracteres';
      return;
    }

    isLoading = true;

    try {
      const result = await authService.signUp(email, password);

      if (result.error) {
        error = result.error.message || 'Erro ao criar conta';
      } else {
        goto(`${base}/exercises`);
      }
    } catch (e: any) {
      error = e.message || 'Erro ao criar conta';
    } finally {
      isLoading = false;
    }
  }

  function goToLogin() {
    goto(`${base}/login`);
  }
</script>

<style>
  .glass-button {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 18px;
    /* border: 1px solid rgba(255, 255, 255, 0.1); */
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

  <form onsubmit={(e) => { e.preventDefault(); handleRegister(); }} class="w-full max-w-md space-y-4">
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

    <input
      type="password"
      bind:value={confirmPassword}
      required
      placeholder="Confirmar Senha"
      class="w-full px-6 py-3 bg-transparent border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
      style="border-radius: 18px; border-width: 0.8px;"
    />

    <button
      type="submit"
      disabled={isLoading}
      class="glass-button w-full px-6 py-3 text-white font-medium transition-all disabled:opacity-50"
    >
      {isLoading ? 'Carregando...' : 'Criar conta'}
    </button>
  </form>

  <div class="mt-8 text-center">
    <button
      type="button"
      onclick={goToLogin}
      class="text-white/70 hover:text-white text-sm transition-colors"
    >
      Já tem uma conta? Clique aqui
    </button>
  </div>

  <div class="absolute bottom-8 text-center">
    <p class="text-white/50 text-sm">
      Política de Privacidade e Termos de Uso
    </p>
  </div>
</div>
