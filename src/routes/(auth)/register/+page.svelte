<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { authActions } from "$lib/services/auth.facade";
  import {
    organizationsApi,
    type Organization,
  } from "$lib/api/organizations.api";
  import { asset } from "$lib/utils/assets";
  import Select from "$lib/components/common/Select.svelte";
  import {
    isValidEmail,
    isValidPassword,
    passwordsMatch,
    isValidFullName,
  } from "$lib/utils/validation";

  function validateAge(birthDate: string): { valid: boolean; error?: string } {
    if (!birthDate) {
      return { valid: false, error: "Data de nascimento é obrigatória" };
    }

    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();

    const actualAge =
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDateObj.getDate())
        ? age - 1
        : age;

    if (actualAge < 13) {
      return {
        valid: false,
        error:
          "Você deve ter pelo menos 13 anos para criar uma conta (LGPD Art. 14)",
      };
    }

    return { valid: true };
  }

  function validateHeight(height?: number): string {
    if (height === undefined || height === null) return "";
    if (height < 50) return "Altura deve ser no mínimo 50cm";
    if (height > 300) return "Altura deve ser no máximo 300cm";
    if (!Number.isInteger(height)) return "Altura deve ser um número inteiro";
    return "";
  }

  function validateWeight(weight?: number): string {
    if (weight === undefined || weight === null) return "";
    if (weight < 20) return "Peso deve ser no mínimo 20kg";
    if (weight > 500) return "Peso deve ser no máximo 500kg";
    const decimalPart = weight.toString().split(".")[1];
    if (decimalPart && decimalPart.length > 1) {
      return "Peso deve ter no máximo 1 casa decimal";
    }
    return "";
  }

  let organizations = $state<Organization[]>([]);
  let selectedOrganizationId = $state<number | string>("");
  let loadingOrganizations = $state(false);

  let fullName = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let birthDate = $state("");
  let heightCm = $state<number | undefined>(undefined);
  let weightKg = $state<number | undefined>(undefined);
  let marketingConsent = $state(false);
  let isLoading = $state(false);
  let error = $state("");

  async function loadOrganizations() {
    loadingOrganizations = true;
    error = "";

    try {
      const result = await organizationsApi.getActiveOrganizations();
      if (result.success && result.data) {
        organizations = result.data;
      } else {
        error = result.error || "Erro ao carregar organizações";
      }
    } catch (e: any) {
      error = e.message || "Erro ao carregar organizações";
    } finally {
      loadingOrganizations = false;
    }
  }

  $effect(() => {
    loadOrganizations();
  });

  async function handleRegisterWithOrganization() {
    error = "";

    const nameValidation = isValidFullName(fullName);
    if (!nameValidation.valid) {
      error = nameValidation.error || "Nome inválido";
      return;
    }

    if (!isValidEmail(email)) {
      error = "E-mail inválido";
      return;
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      error = passwordValidation.error || "Senha inválida";
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      error = "As senhas não coincidem";
      return;
    }

    const ageValidation = validateAge(birthDate);
    if (!ageValidation.valid) {
      error = ageValidation.error || "Data de nascimento inválida";
      return;
    }

    if (!selectedOrganizationId) {
      error = "Organização não selecionada";
      return;
    }

    if (!heightCm) {
      error = "Altura é obrigatória";
      return;
    }

    if (!weightKg) {
      error = "Peso é obrigatório";
      return;
    }

    const heightError = validateHeight(heightCm);
    const weightError = validateWeight(weightKg);

    if (heightError || weightError) {
      error = heightError || weightError;
      return;
    }

    isLoading = true;

    try {
      const organizationId =
        typeof selectedOrganizationId === "string"
          ? parseInt(selectedOrganizationId)
          : selectedOrganizationId;

      const heightError = validateHeight(heightCm);
      const weightError = validateWeight(weightKg);

      if (heightError || weightError) {
        error = heightError || weightError;
        return;
      }

      const result = await authActions.registerWithOrganization(
        email,
        password,
        fullName.trim(),
        birthDate,
        organizationId,
        "pt-BR",
        marketingConsent,
        heightCm!,
        weightKg!,
      );

      if (!result.success) {
        error = result.error || "Erro ao criar conta";
      } else {
        goto(`${base}/exercises`);
      }
    } catch (e: any) {
      error = e.message || "Erro ao criar conta";
    } finally {
      isLoading = false;
    }
  }

  function goToLogin() {
    goto(`${base}/login`);
  }

  const organizationOptions = $derived(
    organizations.map((org) => ({
      value: org.id,
      label: org.name,
    })),
  );
</script>

<div
  class="min-h-screen page-background flex flex-col items-center justify-center px-4 py-8"
>
  <div class="mb-8 text-center">
    <img
      src={asset("/logo-elarin-white.png")}
      alt="Elarin"
      class="h-16 md:h-20 mx-auto"
    />
  </div>

  <div class="w-full max-w-md space-y-4">
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleRegisterWithOrganization();
      }}
      class="space-y-4"
    >
      {#if error}
        <div
          class="bg-red-500/10 text-red-200 px-4 py-3 text-sm text-center"
          style="border-radius: var(--radius-xl);"
        >
          {error}
        </div>
      {/if}

      {#if loadingOrganizations}
        <div class="text-center py-8">
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"
          ></div>
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
        placeholder="Nome Completo *"
        class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
        style="border-radius: var(--radius-xl);"
      />

      <input
        type="email"
        bind:value={email}
        required
        placeholder="E-mail *"
        class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
        style="border-radius: var(--radius-xl);"
      />

      <input
        type="password"
        bind:value={password}
        required
        placeholder="Senha *"
        class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
        style="border-radius: var(--radius-xl);"
      />

      <input
        type="password"
        bind:value={confirmPassword}
        required
        placeholder="Confirmar Senha *"
        class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
        style="border-radius: var(--radius-xl);"
      />

      <div>
        <label for="birth-date" class="text-white/70 text-sm mb-2 block"
          >Data de Nascimento (mínimo 13 anos)</label
        >
        <input
          type="date"
          bind:value={birthDate}
          required
          id="birth-date"
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 13))
            .toISOString()
            .split("T")[0]}
          class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
          style="border-radius: var(--radius-xl);"
        />
      </div>

      <!-- Biometric Data (Required) -->
      <div class="space-y-3">
        <p class="text-white/70 text-sm px-2">Dados Biométricos</p>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <input
              type="number"
              bind:value={heightCm}
              required
              min="50"
              max="300"
              step="1"
              placeholder="Altura (cm) *"
              class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
              style="border-radius: var(--radius-xl);"
            />
          </div>

          <div>
            <input
              type="number"
              bind:value={weightKg}
              required
              min="20"
              max="500"
              step="0.1"
              placeholder="Peso (kg) *"
              class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
              style="border-radius: var(--radius-xl);"
            />
          </div>
        </div>
      </div>

      <div class="flex items-start space-x-3 px-2">
        <input
          type="checkbox"
          id="marketing-consent"
          bind:checked={marketingConsent}
          class="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-white focus:ring-white/50"
        />
        <label
          for="marketing-consent"
          class="text-white/70 text-sm cursor-pointer"
        >
          Desejo receber comunicações sobre novidades e promoções (opcional)
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading || loadingOrganizations}
        class="glass-button-auth w-full px-6 py-3 text-white font-medium transition-all disabled:opacity-50"
      >
        {isLoading ? "Carregando..." : "Criar conta"}
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
</div>

<style>
  .glass-button-auth {
    background: var(--color-glass-light);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: var(--radius-xl);
    position: relative;
    overflow: hidden;
  }
</style>
