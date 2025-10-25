<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authActions } from '$lib/stores/auth.store';
  import { gymsApi, type Gym } from '$lib/api/gyms.api';
  import { asset } from '$lib/utils/assets';
  import Select from '$lib/components/common/Select.svelte';
  import {
    isValidEmail,
    isValidPassword,
    passwordsMatch,
    isValidFullName
  } from '$lib/utils/validation';

  // Step control
  let currentStep = $state<'initial' | 'gym-selection' | 'user-data'>('initial');

  // Gym selection
  let gyms = $state<Gym[]>([]);
  let selectedGymId = $state<number | null>(null);
  let loadingGyms = $state(false);

  // User data
  let fullName = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let error = $state('');

  // Open gym selection modal
  async function openGymSelection() {
    currentStep = 'gym-selection';
    loadingGyms = true;
    error = '';

    try {
      const result = await gymsApi.getActiveGyms();
      if (result.success && result.data) {
        gyms = result.data;
      } else {
        error = result.error || 'Erro ao carregar academias';
      }
    } catch (e: any) {
      error = e.message || 'Erro ao carregar academias';
    } finally {
      loadingGyms = false;
    }
  }

  // Go to user data step
  function goToUserData() {
    if (!selectedGymId) {
      error = 'Por favor, selecione uma academia';
      return;
    }
    error = '';
    currentStep = 'user-data';
  }

  // Go back to gym selection
  function backToGymSelection() {
    currentStep = 'gym-selection';
    error = '';
  }

  // Go back to initial step
  function backToInitial() {
    currentStep = 'initial';
    selectedGymId = null;
    error = '';
  }

  // Handle registration with gym partner
  async function handleRegisterWithGym() {
    error = '';

    // Validations
    const nameValidation = isValidFullName(fullName);
    if (!nameValidation.valid) {
      error = nameValidation.error || 'Nome inválido';
      return;
    }

    if (!isValidEmail(email)) {
      error = 'E-mail inválido';
      return;
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      error = passwordValidation.error || 'Senha inválida';
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      error = 'As senhas não coincidem';
      return;
    }

    if (!selectedGymId) {
      error = 'Academia não selecionada';
      return;
    }

    isLoading = true;

    try {
      const result = await authActions.registerWithGym(
        email,
        password,
        fullName.trim(),
        selectedGymId
      );

      if (!result.success) {
        error = result.error || 'Erro ao criar conta';
      } else {
        goto(`${base}/exercises`);
      }
    } catch (e: any) {
      error = e.message || 'Erro ao criar conta';
    } finally {
      isLoading = false;
    }
  }

  // Handle regular registration (without gym)
  async function handleRegularRegister() {
    error = '';

    const nameValidation = isValidFullName(fullName);
    if (!nameValidation.valid) {
      error = nameValidation.error || 'Nome inválido';
      return;
    }

    if (!isValidEmail(email)) {
      error = 'E-mail inválido';
      return;
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      error = passwordValidation.error || 'Senha inválida';
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      error = 'As senhas não coincidem';
      return;
    }

    isLoading = true;

    try {
      const result = await authActions.register(email, password, fullName.trim());

      if (!result.success) {
        error = result.error || 'Erro ao criar conta';
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

  // Get gym options for select
  const gymOptions = $derived(
    gyms.map((gym) => ({
      value: gym.id,
      label: gym.name
    }))
  );
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

<div class="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
  <div class="mb-8 text-center">
    <img
      src={asset('/logo-elarin.png')}
      alt="Elarin"
      class="h-16 md:h-20 mx-auto"
    />
  </div>

  <!-- Initial Step -->
  {#if currentStep === 'initial'}
    <div class="w-full max-w-md space-y-4">
      <form onsubmit={(e) => { e.preventDefault(); handleRegularRegister(); }} class="space-y-4">
        {#if error}
          <div class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 text-sm text-center" style="border-radius: 18px;">
            {error}
          </div>
        {/if}

        <input
          type="text"
          bind:value={fullName}
          required
          placeholder="Nome Completo"
          class="w-full px-6 py-3 bg-transparent border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
          style="border-radius: 18px; border-width: 0.8px;"
        />

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

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-white/20"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-black text-white/50">ou</span>
        </div>
      </div>

      <button
        type="button"
        onclick={openGymSelection}
        class="w-full px-6 py-3 text-white font-medium transition-all border-white/20 hover:border-white/60"
        style="border-radius: 18px; border-width: 0.8px;"
      >
        Cadastrar com parceiro
      </button>

      <div class="mt-6 text-center">
        <button
          type="button"
          onclick={goToLogin}
          class="text-white/70 hover:text-white text-sm transition-colors"
        >
          Já tem uma conta? Clique aqui
        </button>
      </div>
    </div>
  {/if}

  <!-- Gym Selection Step -->
  {#if currentStep === 'gym-selection'}
    <div class="w-full max-w-md space-y-4">
      <div class="flex items-center mb-6">
        <button
          type="button"
          onclick={backToInitial}
          class="text-white/70 hover:text-white transition-colors mr-4"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-2xl font-bold text-white">Selecione a Organização</h2>
      </div>

      {#if error}
        <div class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 text-sm text-center" style="border-radius: 18px;">
          {error}
        </div>
      {/if}

      {#if loadingGyms}
        <div class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          <p class="text-white/70 mt-4">Carregando academias...</p>
        </div>
      {:else}
        <Select
          options={gymOptions}
          bind:value={selectedGymId}
          placeholder="Selecione uma academia parceira"
          class="mb-4"
        />

        <button
          type="button"
          onclick={goToUserData}
          disabled={!selectedGymId}
          class="glass-button w-full px-6 py-3 text-white font-medium transition-all disabled:opacity-50"
        >
          Próximo
        </button>
      {/if}
    </div>
  {/if}

  <!-- User Data Step -->
  {#if currentStep === 'user-data'}
    <div class="w-full max-w-md space-y-4">
      <div class="flex items-center mb-6">
        <button
          type="button"
          onclick={backToGymSelection}
          class="text-white/70 hover:text-white transition-colors mr-4"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-2xl font-bold text-white">Dados Pessoais</h2>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleRegisterWithGym(); }} class="space-y-4">
        {#if error}
          <div class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 text-sm text-center" style="border-radius: 18px;">
            {error}
          </div>
        {/if}

        <input
          type="text"
          bind:value={fullName}
          required
          placeholder="Nome Completo"
          class="w-full px-6 py-3 bg-transparent border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
          style="border-radius: 18px; border-width: 0.8px;"
        />

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
          {isLoading ? 'Carregando...' : 'Confirmar cadastro'}
        </button>
      </form>
    </div>
  {/if}

  <div class="absolute bottom-4 md:bottom-8 text-center">
    <p class="text-white/50 text-xs md:text-sm">
      Política de Privacidade e Termos de Uso
    </p>
  </div>
</div>
