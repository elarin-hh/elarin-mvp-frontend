<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { authActions } from "$lib/services/auth.facade";
  import { authStore } from "$lib/stores/auth.store";
  import { authApi } from "$lib/api/auth.api";
  import AppHeader from "$lib/components/common/AppHeader.svelte";
  import Modal from "$lib/components/common/Modal.svelte";
  import Loading from "$lib/components/common/Loading.svelte";
  import type { SettingsPageTab } from "$lib/types/training.types";
  import {
    User,
    CreditCard,
    HelpCircle,
    Trash2,
    Camera,
    TriangleAlert,
    Building2,
    Shield,
    CheckCircle,
    Mail,
    MessageCircle,
  } from "lucide-svelte";

  let isScrolled = $state(false);
  let showAvatarMenu = $state(false);
  let activeTab = $state<SettingsPageTab>("account");

  let userName = $state("");
  let userEmail = $state("");
  let avatarUrl = $state("");
  let showDeleteModal = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state("");

  let organizationName = $state("Academia FitLife");
  let organizationPlan = $state("Partner");

  let generalConsentExp = $state<string | null>(null);
  let biometricConsentExp = $state<string | null>(null);

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto(`${base}/login`);
  }

  function handleSettings() {
    showAvatarMenu = false;
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".avatar-menu-container")) {
      showAvatarMenu = false;
    }
  }

  function changeTab(tab: SettingsPageTab) {
    activeTab = tab;
  }

  function openDeleteModal() {
    showDeleteModal = true;
    deleteError = "";
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    deleteError = "";
  }

  async function confirmDeleteAccount() {
    try {
      isDeleting = true;
      deleteError = "";

      const response = await authApi.deleteAccount();

      if (!response.success) {
        deleteError = response.error?.message;
        return;
      }

      await authActions.logout();
      goto(`${base}/`);
    } catch (error) {
      deleteError =
        error instanceof Error ? error.message : "Erro desconhecido";
    } finally {
      isDeleting = false;
    }
  }

  function loadConsentStatus() {
    if (typeof window === "undefined") return;

    const consentExp = localStorage.getItem("elarin_consent_exp");
    generalConsentExp = consentExp;

    const biometricExp = localStorage.getItem("elarin_biometric_consent_exp");
    biometricConsentExp = biometricExp;
  }

  onMount(() => {
    const user = $authStore.user;
    if (user) {
      userName = user.full_name;
      userEmail = user.email;
    }

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    };

    const viewport = document.querySelector(".sa-viewport");

    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        viewport.removeEventListener("scroll", handleScroll);
      };
    } else {
      const handleWindowScroll = () => {
        isScrolled = window.scrollY > 50;
      };
      window.addEventListener("scroll", handleWindowScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleWindowScroll);
      };
    }

    loadConsentStatus();
  });
</script>

<svelte:head>
  <title>Configurações - Elarin</title>
</svelte:head>

<main class="settings-page">
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onSettings={handleSettings}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <div class="content">
    <div class="settings-container">
      <h1 class="page-title">Configurações</h1>

      <div class="settings-layout">
        <nav class="tabs-nav">
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === "account"}
            onclick={() => changeTab("account")}
          >
            <User class="tab-icon" />
          </button>
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === "subscription"}
            onclick={() => changeTab("subscription")}
          >
            <CreditCard class="tab-icon" />
          </button>
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === "help"}
            onclick={() => changeTab("help")}
          >
            <HelpCircle class="tab-icon" />
          </button>
        </nav>

        <div class="tab-content">
          {#if activeTab === "account"}
            <div class="tab-panel">
              <h2 class="section-title">Informações da Conta</h2>

              <div class="avatar-section">
                <div class="avatar-preview">
                  {#if avatarUrl}
                    <img src={avatarUrl} alt="Avatar" class="avatar-image" />
                  {:else}
                    <div class="avatar-placeholder">
                      <svg
                        class="avatar-icon"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        />
                      </svg>
                    </div>
                  {/if}
                </div>
                <button type="button" class="avatar-upload-btn" disabled>
                  <Camera class="btn-icon" />
                  Em breve
                </button>
              </div>

              <div class="form-group">
                <label for="name" class="form-label">Nome</label>
                <input
                  id="name"
                  type="text"
                  value={userName}
                  class="form-input"
                  placeholder="Seu nome"
                  disabled
                />
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={userEmail}
                  class="form-input"
                  placeholder="seu@email.com"
                  disabled
                />
              </div>

              <div class="privacy-card">
                <div class="privacy-header">
                  <h3 class="section-subtitle">Privacidade e Consentimentos</h3>
                  <p class="privacy-hint">
                    Visualize consentimentos ativos para cookies essenciais e
                    biometria.
                  </p>
                </div>

                <div class="consent-row static">
                  <div>
                    <p class="consent-label">Cookies essenciais</p>
                    <p class="consent-meta">
                      {generalConsentExp
                        ? `Valido ate ${generalConsentExp}`
                        : "Pendente/expirado"}
                    </p>
                  </div>
                </div>

                <div class="consent-row static">
                  <div>
                    <p class="consent-label">Consentimento biometrico</p>
                    <p class="consent-meta">
                      {biometricConsentExp
                        ? `Valido ate ${biometricConsentExp}`
                        : "Solicitado ao iniciar camera"}
                    </p>
                  </div>
                </div>

                <p class="privacy-note">
                  Consentimentos sao armazenados localmente e podem expirar
                  conforme as politicas aplicaveis.
                </p>
              </div>

              <div class="danger-zone">
                <h3 class="danger-title">Deletar Conta</h3>
                <p class="danger-description">
                  Uma vez que você excluir sua conta, não há como voltar atrás.
                  Para excluir <button
                    type="button"
                    class="delete-link"
                    onclick={openDeleteModal}>clique aqui</button
                  >.
                </p>
              </div>
            </div>
          {:else if activeTab === "subscription"}
            <div class="tab-panel">
              <h2 class="section-title">Assinatura</h2>

              <div class="organization-card">
                <div class="organization-header">
                  <div class="org-icon-wrapper">
                    <Building2 class="org-icon" />
                  </div>
                  <div class="org-info">
                    <h3 class="org-name">{organizationName}</h3>
                    <p class="org-subtitle">Sua organização parceira</p>
                  </div>
                  <div class="status-badge active">
                    <CheckCircle class="status-icon" />
                    Ativo
                  </div>
                </div>
              </div>

              <div class="plan-card">
                <div class="plan-header">
                  <div class="plan-icon-wrapper">
                    <Shield class="plan-icon" />
                  </div>
                  <div>
                    <h3 class="plan-title">Plano {organizationPlan}</h3>
                    <p class="plan-description">
                      Acesso fornecido pela sua organização
                    </p>
                  </div>
                </div>

                <div class="plan-divider"></div>
                <div class="plan-notice">
                  <p>
                    Sua assinatura é gerenciada pela organização <strong
                      >{organizationName}</strong
                    >. Para alterações ou dúvidas sobre seu acesso, entre em
                    contato com o administrador da sua organização.
                  </p>
                </div>
              </div>
            </div>
          {:else if activeTab === "help"}
            <div class="tab-panel">
              <h2 class="section-title">Ajuda e Suporte</h2>

              <div class="help-section">
                <h3 class="subsection-title">Entre em Contato</h3>
                <p class="help-text">
                  Precisa de ajuda? Nossa equipe de suporte está pronta para
                  ajudá-lo.
                </p>

                <div class="contact-options">
                  <a href="mailto:elarinfit@gmail.com" class="contact-card">
                    <div class="contact-icon">
                      <Mail size={24} />
                    </div>
                    <div class="contact-info">
                      <div class="contact-title">Email</div>
                      <div class="contact-detail">elarinfit@gmail.com</div>
                    </div>
                  </a>

                  <a
                    href="https://wa.me/5511999999999"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="contact-card"
                  >
                    <div class="contact-icon">
                      <MessageCircle size={24} />
                    </div>
                    <div class="contact-info">
                      <div class="contact-title">WhatsApp</div>
                      <div class="contact-detail">+55 41 97890787</div>
                    </div>
                  </a>
                </div>
              </div>

              <div class="help-section">
                <h3 class="subsection-title">Recursos Úteis</h3>
                <ul class="resources-list">
                  <li>
                    <a href="/faq" class="resource-link"
                      >Perguntas Frequentes (FAQ)</a
                    >
                  </li>

                  <li>
                    <a href="/privacy" class="resource-link"
                      >Política de Privacidade</a
                    >
                  </li>
                  <li>
                    <a href="/terms" class="resource-link">Termos de Uso</a>
                  </li>
                </ul>
              </div>

              <div class="help-section">
                <h3 class="subsection-title">Sobre o Elarin</h3>
                <div class="about-content">
                  <p class="about-item">
                    <span class="about-label">Versão:</span>
                    <span class="about-value">1.0.0</span>
                  </p>
                  <p class="about-item">
                    <span class="about-label">Desenvolvido por:</span>
                    <span class="about-value">Equipe Elarin</span>
                  </p>
                  <p class="about-copyright">
                    © 2025 Elarin. Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</main>

<Modal
  isOpen={showDeleteModal}
  onClose={closeDeleteModal}
  showCloseButton={false}
  class="delete-modal-wrapper"
>
  {#snippet children()}
    <div class="delete-modal-content">
      <h2 class="delete-modal-title">Excluir Conta</h2>

      <p class="delete-modal-description">
        Você tem certeza que deseja excluir sua conta permanentemente e todos os
        dados vinculados a ela?
      </p>

      <div class="delete-modal-warning">
        <TriangleAlert class="warning-icon" />
        <span>Esta ação não pode ser desfeita!</span>
      </div>

      {#if deleteError}
        <div class="delete-modal-error">
          {deleteError}
        </div>
      {/if}

      <div class="delete-modal-buttons">
        <button
          type="button"
          class="btn-modal btn-modal-secondary"
          onclick={closeDeleteModal}
          disabled={isDeleting}
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn-modal btn-modal-danger"
          onclick={confirmDeleteAccount}
          disabled={isDeleting}
        >
          Sim, excluir permanentemente
        </button>
      </div>
    </div>
  {/snippet}
</Modal>

{#if isDeleting}
  <div class="loading-overlay">
    <Loading message="Excluindo conta..." />
  </div>
{/if}

<style>
  .settings-page {
    min-height: 100vh;
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
  }

  .content {
    padding: 1rem;
    width: 100%;
  }

  @media (min-width: 640px) {
    .content {
      padding-top: 6rem;
    }
  }

  .settings-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--color-primary-500);
    margin-bottom: 2rem;
  }

  .settings-layout {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .settings-layout {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .tabs-nav {
      flex-direction: row !important;
      overflow-x: auto;
      justify-content: space-between;
      gap: 0 !important;
    }

    .tab-button {
      flex-direction: column !important;
      padding: 0.75rem 1rem !important;
      flex: 1;
      justify-content: center;
      align-items: center;
    }
  }

  .tabs-nav {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    padding: 10px;
    height: fit-content;
  }

  .tab-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .tab-button:hover {
    background: var(--color-border-light);
    color: var(--color-text-primary);
  }

  .tab-button.active {
    background: var(--color-primary-500);
    color: var(--color-text-primary);
  }

  :global(.tab-icon) {
    width: 20px !important;
    height: 20px !important;
  }

  .tab-content {
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    padding: 2rem;
  }

  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 1rem;
  }

  .section-subtitle {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .subsection-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 1rem;
  }

  .avatar-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .avatar-preview {
    width: 70px;
    height: 70px;
    min-width: 70px;
    min-height: 70px;
    border-radius: var(--radius-full);
    overflow: hidden;
    background: var(--color-border-light);
    cursor: not-allowed;
    transition: all 0.2s ease;
    opacity: 0.6;
    flex-shrink: 0;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-glass-light);
  }

  .avatar-icon {
    width: 30px;
    height: 30px;
    color: var(--color-text-secondary);
  }

  .avatar-upload-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 1rem;
    background: var(--color-border-light);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 500;
    cursor: not-allowed;
    transition: all 0.2s ease;
    opacity: 0.6;
  }

  .avatar-upload-btn:not(:disabled):hover {
    background: var(--color-primary-500);
    border-color: var(--color-primary-500);
    cursor: pointer;
    opacity: 1;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .form-input {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-primary-500);
    background: var(--color-bg-dark);
  }

  .form-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
  }

  .loading-overlay :global(.loading-container) {
    z-index: 10001 !important;
  }

  :global(.delete-modal-wrapper) {
    background: var(--color-bg-dark-secondary) !important;
    border: 1px solid var(--color-border-light) !important;
  }

  .delete-modal-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0.5rem;
  }

  .delete-modal-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
    text-align: left;
  }

  .delete-modal-description {
    color: var(--color-text-secondary);
    font-size: 1rem;
    line-height: 1.6;
    margin: 0;
    text-align: left;
  }

  .delete-modal-warning {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-error);
    font-weight: 600;
    font-size: 1rem;
    margin: 0;
    text-align: left;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-left: 4px solid var(--color-error);
    border-radius: var(--radius-sm);
  }

  :global(.warning-icon) {
    width: 20px !important;
    height: 20px !important;
    color: var(--color-error);
    flex-shrink: 0;
  }

  .delete-modal-error {
    width: 100%;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-sm);
    color: var(--color-error);
    font-size: 0.875rem;
    text-align: left;
  }

  .delete-modal-buttons {
    display: flex;
    gap: 1rem;
    width: 100%;
    margin-top: 0.5rem;
  }

  .btn-modal {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-modal:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-modal-secondary {
    background: var(--color-border-light);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-light);
  }

  .btn-modal-secondary:hover:not(:disabled) {
    background: var(--color-glass-dark-strong);
  }

  .btn-modal-danger {
    background: var(--color-error);
    color: white;
  }

  .btn-modal-danger:hover:not(:disabled) {
    background: var(--color-error-dark);
    transform: translateY(-2px);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: var(--color-primary-500);
    color: var(--color-text-primary);
  }

  .btn-primary:hover {
    background: var(--color-primary-600);
    transform: translateY(-2px);
    box-shadow: var(--glow-success);
  }

  .btn-secondary {
    background: var(--color-border-light);
    color: var(--color-text-primary);
  }

  .btn-secondary:hover {
    background: var(--color-glass-dark-strong);
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
  }

  .btn-danger:hover {
    background: var(--color-error-dark);
    transform: translateY(-2px);
  }

  .btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  :global(.btn-icon) {
    width: 18px !important;
    height: 18px !important;
  }

  .privacy-card {
    padding: 1.25rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .privacy-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .privacy-hint {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .consent-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .consent-row:last-child {
    border-bottom: none;
  }

  .consent-label {
    margin: 0;
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .consent-meta {
    margin: 2px 0 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 46px;
    height: 24px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.15);
    transition: 0.3s;
    border-radius: var(--radius-lg);
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  .switch input:checked + .slider {
    background-color: var(--color-primary-500);
  }

  .switch input:checked + .slider:before {
    transform: translateX(22px);
  }

  .privacy-note {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  .danger-zone {
    margin-top: 2rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
  }

  .danger-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-error);
    margin-bottom: 0.25rem;
  }

  .danger-description {
    color: var(--color-text-secondary);
    margin-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .delete-link {
    background: none;
    border: none;
    color: var(--color-error);
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0;
    transition: all 0.2s ease;
  }

  .delete-link:hover {
    color: var(--color-error-dark);
    text-decoration: none;
  }

  .organization-card {
    padding: 1.5rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.05);
    margin-bottom: 1.5rem;
  }

  .organization-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .org-icon-wrapper {
    width: 48px;
    height: 48px;
    min-width: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-primary-500);
    border-radius: var(--radius-sm);
  }

  :global(.org-icon) {
    width: 28px !important;
    height: 28px !important;
    color: var(--color-text-primary);
  }

  .org-info {
    flex: 1;
  }

  .org-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    margin-bottom: 0.25rem;
  }

  .org-subtitle {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
    font-size: 0.875rem;
    white-space: nowrap;
  }

  .status-badge.active {
    background: rgba(34, 197, 94, 0.15);
    color: rgb(34, 197, 94);
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  :global(.status-icon) {
    width: 16px !important;
    height: 16px !important;
  }

  .plan-card {
    padding: 1.5rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.05);
  }

  .plan-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .plan-icon-wrapper {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(174, 246, 92, 0.15);
    border-radius: var(--radius-sm);
  }

  :global(.plan-icon) {
    width: 24px !important;
    height: 24px !important;
    color: var(--color-primary-500);
  }

  .plan-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    margin-bottom: 0.25rem;
  }

  .plan-description {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .plan-divider {
    height: 1px;
    background: var(--color-border-light);
    margin-bottom: 1.5rem;
  }
  .plan-notice {
    padding: 1rem;
    background: rgba(159, 246, 59, 0.08);
    border-left: 3px solid var(--color-primary-500);
    border-radius: var(--radius-sm);
  }

  .plan-notice p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--color-text-secondary);
  }

  .plan-notice strong {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .organization-header {
      flex-wrap: wrap;
    }

    .status-badge {
      width: 100%;
      justify-content: center;
    }
  }

  .help-section {
    padding: 1.5rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.05);
    margin-bottom: 1.5rem;
  }

  .help-section:last-child {
    margin-bottom: 0;
  }

  .help-text {
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
    margin-bottom: 1.5rem;
  }

  .contact-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .contact-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: transparent;
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .contact-card:hover {
    background: var(--color-border-light);
    border-color: var(--color-primary-500);
  }
  .contact-icon {
    font-size: 2rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .contact-info {
    flex: 1;
    min-width: 0;
  }

  .contact-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-primary);
    margin-bottom: 0.25rem;
  }

  .contact-detail {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    word-break: break-word;
  }

  .resources-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .resources-list li {
    padding-left: 1.5rem;
    position: relative;
  }

  .resources-list li::before {
    content: "?";
    position: absolute;
    left: 0;
    color: var(--color-primary-500);
    font-weight: bold;
  }

  .resource-link {
    color: var(--color-primary-500);
    text-decoration: none;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .resource-link:hover {
    color: var(--color-primary-600);
    text-decoration: underline;
  }

  .about-content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .about-item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 0;
    padding: 0.25rem 0.5rem;
    background: transparent;
    border-radius: var(--radius-sm);
  }

  .about-label {
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .about-value {
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }

  .about-copyright {
    margin: 0;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border-light);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .tab-content {
      padding: 1.5rem;
    }
  }

  @media (max-width: 640px) {
    .tab-content {
      padding: 1rem;
    }

    .help-section {
      padding: 1rem;
    }

    .section-title {
      font-size: 1.25rem;
    }

    .subsection-title {
      font-size: 1rem;
    }

    .contact-options {
      grid-template-columns: 1fr;
    }

    .contact-card {
      padding: 1rem;
    }

    .contact-icon {
      font-size: 1.75rem;
    }

    .contact-title {
      font-size: 0.875rem;
    }

    .contact-detail {
      font-size: 0.8rem;
    }

    .resources-list {
      gap: 0.625rem;
    }

    .resources-list li {
      padding-left: 1.25rem;
      font-size: 0.9rem;
    }

    .about-item {
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.625rem;
    }

    .about-label,
    .about-value {
      font-size: 0.8rem;
    }

    .about-copyright {
      font-size: 0.75rem;
      padding-top: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .page-title {
      font-size: 1.25rem;
    }

    .section-title {
      font-size: 1.125rem;
    }

    .contact-icon {
      font-size: 1.5rem;
    }

    .help-text {
      font-size: 0.875rem;
    }
  }
</style>
