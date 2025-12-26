<script lang="ts">
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { authActions } from "$lib/services/auth.facade";
  import { asset } from "$lib/utils/assets";

  let email = $state("");
  let password = $state("");
  let isLoading = $state(false);
  let error = $state("");

  async function handleLogin() {
    error = "";
    isLoading = true;

    try {
      const result = await authActions.login(email, password);

      if (!result.success) {
        error = result.error;
        isLoading = false;
        return;
      }

      goto(`${base}/exercises`);
    } catch (e: any) {
      error = e.message;
      isLoading = false;
    }
  }

  function goToRegister() {
    goto(`${base}/register`);
  }
</script>

<div
  class="min-h-screen page-background flex flex-col items-center justify-center px-4"
>
  <div class="mb-16 text-center">
    <img
      src={asset("/logo-elarin-white.png")}
      alt="Elarin"
      class="h-20 mx-auto mb-4"
    />
  </div>

  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleLogin();
    }}
    class="w-full max-w-md space-y-4"
  >
    {#if error}
      <div
        class="bg-red-500/10 text-red-200 px-4 py-3 text-sm text-center"
        style="border-radius: var(--radius-xl);"
      >
        {error}
      </div>
    {/if}

    <input
      type="email"
      bind:value={email}
      required
      placeholder="E-mail"
      class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
      style="border-radius: var(--radius-xl);"
    />

    <input
      type="password"
      bind:value={password}
      required
      placeholder="Senha"
      class="w-full px-6 py-3 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 transition-colors"
      style="border-radius: var(--radius-xl);"
    />

    <button
      type="submit"
      disabled={isLoading}
      class="glass-button-auth w-full px-6 py-3 text-white font-medium transition-all disabled:opacity-50"
    >
      {isLoading ? "Carregando..." : "Logar"}
    </button>
  </form>

  <div class="mt-8 text-center">
    <button
      type="button"
      onclick={goToRegister}
      class="text-white/70 hover:text-white text-sm transition-colors"
    >
      Nao tem uma conta? Clique aqui
    </button>
  </div>

  <!--   <div class="absolute bottom-8 text-center">
    <p class="text-white/50 text-sm">
      Politica de Privacidade e Termos de Uso
    </p>
  </div> -->
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
