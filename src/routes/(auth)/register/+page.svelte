<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authActions } from '$lib/stores/auth.store';
  import { organizationsApi, type Organization } from '$lib/api/organizations.api';
  import { asset } from '$lib/utils/assets';
  import Select from '$lib/components/common/Select.svelte';
  import {
    isValidEmail,
    isValidPassword,
    passwordsMatch,
    isValidFullName
  } from '$lib/utils/validation';

  // Organization selection
  let organizations = $state<Organization[]>([]);
  let selectedOrganizationId = $state<number | string>('');
  let loadingOrganizations = $state(false);

  // User data
  let fullName = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let error = $state('');

  // Load organizations on mount
  async function loadOrganizations() {
    loadingOrganizations = true;
    error = '';

    try {
      const result = await organizationsApi.getActiveOrganizations();
      if (result.success && result.data) {
        organizations = result.data;
      } else {
        error = result.error || 'Erro ao carregar organizações';
      }
    } catch (e: any) {
      error = e.message || 'Erro ao carregar organizações';
    } finally {
      loadingOrganizations = false;
    }
  }

  // Load organizations when component mounts
  $effect(() => {
    loadOrganizations();
  });

  // Handle registration with organization partner
  async function handleRegisterWithOrganization() {
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

    if (!selectedOrganizationId) {
      error = 'Organização não selecionada';
      return;
    }

    isLoading = true;

    try {
      const organizationId = typeof selectedOrganizationId === 'string'
        ? parseInt(selectedOrganizationId)
        : selectedOrganizationId;

      const result = await authActions.registerWithOrganization(
        email,
        password,
        fullName.trim(),
        organizationId
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

  function goToLogin() {
    goto(`${base}/login`);
  }

  // Get organization options for select
  const organizationOptions = $derived(
    organizations.map((org) => ({
      value: org.id,
      label: org.name
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

  <div class="w-full max-w-md space-y-4">
    <form onsubmit={(e) => { e.preventDefault(); handleRegisterWithOrganization(); }} class="space-y-4">
      {#if error}
        <div class="bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 text-sm text-center" style="border-radius: 18px;">
          {error}
        </div>
      {/if}

      {#if loadingOrganizations}
        <div class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          <p class="text-white/70 mt-4">Carregando organizações...</p>
        </div>
      {:else}
        <Select
          options={organizationOptions}
          bind:value={selectedOrganizationId}
          placeholder="Selecione uma organização parceira"
          label="Organização Parceira"
          class="mb-4"
        />
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
        disabled={isLoading || loadingOrganizations}
        class="glass-button w-full px-6 py-3 text-white font-medium transition-all disabled:opacity-50"
      >
        {isLoading ? 'Carregando...' : 'Criar conta'}
      </button>
    </form>

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

  <div class="absolute bottom-4 md:bottom-8 text-center">
    <p class="text-white/50 text-xs md:text-sm">
      Política de Privacidade e Termos de Uso
    </p>
  </div>
</div>
