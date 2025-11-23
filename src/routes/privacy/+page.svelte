<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  function goBack() {
    goto(`${base}/settings`);
  }
</script>

<div class="min-h-screen bg-black text-white px-4 py-8">
  <div class="max-w-3xl mx-auto">
    <button
      onclick={goBack}
      class="mb-6 text-white/60 hover:text-white transition-colors text-sm"
    >
      ← Voltar
    </button>

    <h1 class="text-3xl font-bold mb-2">Política de Privacidade</h1>
    <p class="text-white/50 text-sm mb-8">Última atualização: 27 de outubro de 2025</p>

    <div class="space-y-6 text-white/70 text-sm leading-relaxed">
      <section>
        <h2 class="text-lg font-semibold text-white mb-2">1. Informações Gerais</h2>
        <p>
          O <strong>Elarin</strong> coleta e processa dados em conformidade com a <strong>LGPD (Lei 13.709/2018)</strong>.
          Controlador: [SUA EMPRESA] | CNPJ: [CNPJ] | DPO: [DPO] | E-mail: privacidade@elarin.com.br
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">2. Dados Coletados</h2>
        <p class="mb-2"><strong>Dados Pessoais:</strong> Nome, e-mail, data de nascimento (idade mínima 13 anos - LGPD Art. 14).</p>
        <p class="mb-2">
          <strong>Dados Biométricos (LGPD Art. 11):</strong> 33 pontos de pose corporal capturados via câmera.
          <span style="color: var(--color-success);">Processamento 100% local. Vídeo NUNCA é gravado ou transmitido. Dados biométricos NÃO são armazenados.</span>
        </p>
        <p><strong>Dados de Treino:</strong> Tipo de exercício, repetições, séries, duração, qualidade média, data/hora.</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">3. Base Legal</h2>
        <p>Consentimento explícito (dados biométricos), execução de contrato (cadastro/treino), legítimo interesse (melhorias).</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">4. Finalidades</h2>
        <p>Análise de movimento, histórico de treinos, estatísticas, autenticação, comunicações (se consentido).</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">5. Compartilhamento</h2>
        <p>Não compartilhamos dados, exceto: Supabase (infraestrutura) e quando exigido por lei.</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">6. Seus Direitos (LGPD Art. 18)</h2>
        <p>
          Você pode: acessar, corrigir, excluir, exportar (portabilidade), revogar consentimento e opor-se a marketing.
          Acesse <strong>Configurações > Privacidade</strong> ou envie e-mail para privacidade@elarin.com.br
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">7. Segurança</h2>
        <p>Criptografia HTTPS/TLS, autenticação JWT, processamento biométrico local, logs de auditoria.</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">8. Retenção</h2>
        <p>Após exclusão: dados pessoais deletados imediatamente, logs mantidos 6 meses (Marco Civil), dados anonimizados para estatísticas.</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">9. Contato</h2>
        <p>
          📧 <a href="mailto:privacidade@elarin.com.br" style="color: var(--color-primary-400);" class="hover:underline">privacidade@elarin.com.br</a> |
          DPO: <a href="mailto:dpo@elarin.com.br" style="color: var(--color-primary-400);" class="hover:underline">dpo@elarin.com.br</a>
        </p>
      </section>
    </div>
  </div>
</div>
