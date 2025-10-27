<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authActions, authStore } from '$lib/stores/auth.store';
  import { authApi } from '$lib/api/auth.api';
  import AppHeader from '$lib/components/common/AppHeader.svelte';
  import Modal from '$lib/components/common/Modal.svelte';
  import Loading from '$lib/components/common/Loading.svelte';
  import { User, CreditCard, HelpCircle, Trash2, Camera, TriangleAlert } from 'lucide-svelte';

  let isScrolled = $state(false);
  let showAvatarMenu = $state(false);
  let activeTab = $state<'account' | 'subscription' | 'help'>('account');

  // Account tab
  let userName = $state('');
  let userEmail = $state('');
  let avatarUrl = $state('');
  let showDeleteModal = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state('');

  // Subscription tab
  let subscriptionStatus = $state('active');
  let subscriptionPlan = $state('Pro');
  let subscriptionRenewalDate = $state('2025-11-26');

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto('/login');
  }

  function handleSettings() {
    showAvatarMenu = false;
    // Already on settings page
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.avatar-menu-container')) {
      showAvatarMenu = false;
    }
  }

  function changeTab(tab: 'account' | 'subscription' | 'help') {
    activeTab = tab;
  }

  function openDeleteModal() {
    showDeleteModal = true;
    deleteError = '';
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    deleteError = '';
  }

  async function confirmDeleteAccount() {
    try {
      isDeleting = true;
      deleteError = '';

      const response = await authApi.deleteAccount();

      if (!response.success) {
        deleteError = response.error?.message || 'Falha ao excluir conta';
        return;
      }

      // Logout and redirect to home
      await authActions.logout();
      goto('/');
    } catch (error) {
      deleteError = error instanceof Error ? error.message : 'Erro desconhecido';
    } finally {
      isDeleting = false;
    }
  }

  function cancelSubscription() {
    // TODO: Implement subscription cancellation
    console.log('Cancelling subscription...');
  }

  onMount(() => {
    // Load user data
    const user = $authStore.user;
    if (user) {
      userName = user.full_name || user.name || '';
      userEmail = user.email || '';
    }

    // Handle scroll for header effect
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    };

    const viewport = document.querySelector('.sa-viewport');

    if (viewport) {
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        viewport.removeEventListener('scroll', handleScroll);
      };
    } else {
      const handleWindowScroll = () => {
        isScrolled = window.scrollY > 50;
      };
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleWindowScroll);
      };
    }
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
        <!-- Tabs Navigation -->
        <nav class="tabs-nav">
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === 'account'}
            onclick={() => changeTab('account')}
          >
            <User class="tab-icon" />
            <!-- <span>Conta</span> -->
          </button>
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === 'subscription'}
            onclick={() => changeTab('subscription')}
          >
            <CreditCard class="tab-icon" />
            <!-- <span>Assinatura</span> -->
          </button>
          <button
            type="button"
            class="tab-button"
            class:active={activeTab === 'help'}
            onclick={() => changeTab('help')}
          >
            <HelpCircle class="tab-icon" />
            <!-- <span>Ajuda</span> -->
          </button>
        </nav>

        <!-- Tab Content -->
        <div class="tab-content">
          {#if activeTab === 'account'}
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

              <div class="danger-zone">
                <h3 class="danger-title">Deletar Conta</h3>
                <p class="danger-description">
                  Uma vez que você excluir sua conta, não há como voltar atrás. Para excluir <button type="button" class="delete-link" onclick={openDeleteModal}>clique aqui</button>.
                </p>
              </div>
            </div>
          {:else if activeTab === 'subscription'}
            <div class="tab-panel">
              <h2 class="section-title">Assinatura</h2>

              <div class="subscription-card">
                <div class="subscription-header">
                  <div class="plan-badge">Plano {subscriptionPlan}</div>
                  <div
                    class="status-badge"
                    class:active={subscriptionStatus === 'active'}
                    class:cancelled={subscriptionStatus === 'cancelled'}
                  >
                    {subscriptionStatus === 'active' ? 'Ativo' : 'Cancelado'}
                  </div>
                </div>

                <div class="subscription-info">
                  <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value">{subscriptionStatus === 'active' ? 'Ativa' : 'Cancelada'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Próxima renovação:</span>
                    <span class="info-value">{new Date(subscriptionRenewalDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Valor:</span>
                    <span class="info-value">R$ 49,90/mês</span>
                  </div>
                </div>

                {#if subscriptionStatus === 'active'}
                  <button type="button" class="btn btn-secondary" onclick={cancelSubscription}>
                    Cancelar Assinatura
                  </button>
                {:else}
                  <button type="button" class="btn btn-primary">
                    Reativar Assinatura
                  </button>
                {/if}
              </div>

              <div class="payment-methods">
                <h3 class="subsection-title">Métodos de Pagamento</h3>
                <div class="payment-card">
                  <CreditCard class="payment-icon" />
                  <div class="payment-details">
                    <div class="payment-type">Cartão de Crédito</div>
                    <div class="payment-number">•••• •••• •••• 4242</div>
                  </div>
                  <button type="button" class="btn btn-small">Alterar</button>
                </div>
              </div>
            </div>
          {:else if activeTab === 'help'}
            <div class="tab-panel">
              <h2 class="section-title">Ajuda e Suporte</h2>

              <div class="help-section">
                <h3 class="subsection-title">Entre em Contato</h3>
                <p class="help-text">
                  Precisa de ajuda? Nossa equipe de suporte está pronta para ajudá-lo.
                </p>

                <div class="contact-options">
                  <a href="mailto:suporte@elarin.com" class="contact-card">
                    <div class="contact-icon">📧</div>
                    <div class="contact-info">
                      <div class="contact-title">Email</div>
                      <div class="contact-detail">suporte@elarin.com</div>
                    </div>
                  </a>

                  <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" class="contact-card">
                    <div class="contact-icon">💬</div>
                    <div class="contact-info">
                      <div class="contact-title">WhatsApp</div>
                      <div class="contact-detail">+55 11 99999-9999</div>
                    </div>
                  </a>
                </div>
              </div>

              <div class="help-section">
                <h3 class="subsection-title">Recursos Úteis</h3>
                <ul class="resources-list">
                  <li><a href="/faq" class="resource-link">Perguntas Frequentes (FAQ)</a></li>
                  <li><a href="/docs" class="resource-link">Documentação</a></li>
                  <li><a href="/tutorials" class="resource-link">Tutoriais em Vídeo</a></li>
                  <li><a href="/privacy" class="resource-link">Política de Privacidade</a></li>
                  <li><a href="/terms" class="resource-link">Termos de Uso</a></li>
                </ul>
              </div>

              <div class="help-section">
                <h3 class="subsection-title">Sobre o Elarin</h3>
                <p class="help-text">
                  Versão: 1.0.0<br />
                  © 2025 Elarin. Todos os direitos reservados.
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</main>

<!-- Delete Account Modal -->
<Modal isOpen={showDeleteModal} onClose={closeDeleteModal} showCloseButton={false} class="delete-modal-wrapper">
  {#snippet children()}
    <div class="delete-modal-content">
      <h2 class="delete-modal-title">Excluir Conta</h2>

      <p class="delete-modal-description">
        Você tem certeza que deseja excluir sua conta permanentemente e todos os dados vinculados a ela?
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
    padding-top: 5rem;
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
    gap: 2rem;
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
    background: var(--color-bg-dark-secondary);
    border: 1px solid var(--color-border-light);
    border-radius: 12px;
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
    border-radius: 8px;
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
    background: var(--color-bg-dark-secondary);
    border: 1px solid var(--color-border-light);
    border-radius: 12px;
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
    border-radius: 50%;
    overflow: hidden;
    background: var(--color-border-light);
    border: 1px solid var(--color-border-light);    
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
    border: 1px solid var(--color-border-light);
    border-radius: 8px;
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
    background: var(--color-glass-light);
    border: 1px solid var(--color-border-light);
    border-radius: 8px;
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
    border-radius: 4px;
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
    border-radius: 8px;
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
    border-radius: 8px;
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
    border-radius: 8px;
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
    border: 1px solid var(--color-border-light);
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

  .danger-zone {
    margin-top: 2rem;
    padding: 1rem;
    background: rgba(255, 68, 68, 0.05);
    border: 1px solid var(--color-error);
    border-radius: 12px;
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

  .subscription-card {
    padding: 1.5rem;
    background: var(--color-glass-light);
    border: 1px solid var(--color-border-light);
    border-radius: 12px;
  }

  .subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .plan-badge {
    padding: 0.5rem 1rem;
    background: var(--color-primary-500);
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .status-badge {
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .status-badge.active {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(34, 197, 94);
  }

  .status-badge.cancelled {
    background: rgba(239, 68, 68, 0.2);
    color: var(--color-error);
  }

  .subscription-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
  }

  .info-label {
    color: var(--color-text-secondary);
  }

  .info-value {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .payment-methods {
    margin-top: 2rem;
  }

  .payment-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-glass-light);
    border: 1px solid var(--color-border-light);
    border-radius: 12px;
  }

  :global(.payment-icon) {
    width: 32px !important;
    height: 32px !important;
    color: var(--color-primary-500);
  }

  .payment-details {
    flex: 1;
  }

  .payment-type {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .payment-number {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .help-section {
    padding: 1.5rem;
    background: var(--color-glass-light);
    border: 1px solid var(--color-border-light);
    border-radius: 12px;
  }

  .help-text {
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 1rem;
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
    padding: 1rem;
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border-light);
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .contact-card:hover {
    background: var(--color-border-light);
    border-color: var(--color-primary-500);
    transform: translateY(-2px);
  }

  .contact-icon {
    font-size: 2rem;
  }

  .contact-info {
    flex: 1;
  }

  .contact-title {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .contact-detail {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .resources-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .resource-link {
    color: var(--color-primary-500);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .resource-link:hover {
    color: var(--color-primary-600);
    text-decoration: underline;
  }
</style>
