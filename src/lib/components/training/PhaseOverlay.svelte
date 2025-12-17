<script lang="ts">
    import { fade, scale } from "svelte/transition";

    interface Props {
        title?: string;
        message?: string;
        icon?: any;
        fullscreen?: boolean;
    }

    let {
        title = "",
        message = "",
        icon = undefined,
        fullscreen = true,
    }: Props = $props();
</script>

<div
    class="phase-overlay"
    class:fullscreen
    in:scale={{ duration: 400, start: 0.95 }}
    out:fade={{ duration: 200 }}
>
    <div class="content">
        {#if icon}
            <div class="icon-wrapper">
                <svelte:component this={icon} size={48} />
            </div>
        {/if}

        {#if title}
            <h2 class="title">{title}</h2>
        {/if}

        {#if message}
            <p class="message">{message}</p>
        {/if}

        <slot />
    </div>
</div>

<style>
    .phase-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        -webkit-backdrop-filter: var(--glass-backdrop);
        z-index: 50;
        pointer-events: all;
        padding: 1rem;
        box-sizing: border-box;
        margin: 0;
        border-radius: inherit;
    }

    .phase-overlay.fullscreen {
        position: fixed;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        border-radius: 0;
    }

    .content {
        padding: 2rem;
        border-radius: var(--radius-lg);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        max-width: 100%;
        width: 500px;
        pointer-events: auto;
        box-sizing: border-box;
    }

    @media (max-width: 600px) {
        .content {
            padding: 1.5rem;
            width: 95%;
        }

        .title {
            font-size: 1.5rem;
        }

        .message {
            font-size: 1rem;
        }
    }

    .icon-wrapper {
        color: var(--color-primary-500);
        background: rgba(116, 198, 17, 0.1);
        padding: 1rem;
        border-radius: 50%;
        margin-bottom: 0.25rem;
    }

    .title {
        font-size: 2rem;
        font-weight: 400;
        color: var(--color-text-primary);
        margin: 0;
        letter-spacing: -0.02em;
        line-height: 1.2;
    }

    .message {
        font-size: 1.25rem;
        color: var(--color-text-muted);
        margin: 0;
        line-height: 1.5;
        max-width: 100%;
        overflow-wrap: break-word;
    }
</style>
