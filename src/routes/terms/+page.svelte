<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  function goBack() {
    goto(`${base}/settings`);
  }
</script>

<div class="page-background text-white px-4 py-8">
  <div class="max-w-3xl mx-auto">
    <button
      onclick={goBack}
      class="mb-6 text-white/60 hover:text-white transition-colors text-sm"
    >
      ← Voltar
    </button>

    <h1 class="text-3xl font-bold mb-2">Termos de Uso</h1>
    <p class="text-white/50 text-sm mb-8">Última atualização: 27 de outubro de 2025</p>

    <div class="space-y-6 text-white/70 text-sm leading-relaxed">
      <section>
        <h2 class="text-lg font-semibold text-white mb-2">1. Aceitação</h2>
        <p>
          Ao usar o <strong>Elarin</strong>, você concorda com estes Termos e a
          <a href="{base}/privacy" style="color: var(--color-primary-400);" class="hover:underline">Política de Privacidade</a>.
          Empresa: [SUA EMPRESA] | CNPJ: [CNPJ] | E-mail: contato@elarin.com.br
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">2. Elegibilidade</h2>
        <p>
          Idade mínima: <strong>13 anos</strong> (LGPD Art. 14, §1º + ECA Lei 8.069/1990).
          Menores de 18 anos devem ter autorização de responsável legal.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">3. Descrição</h2>
        <p>
          O Elarin analisa movimentos corporais usando visão computacional (33 pontos de pose) para feedback em tempo real
          durante exercícios. Funcionalidades: detecção de pose via câmera, análise ML, feedback visual/textual, histórico.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">4. Limitações</h2>
        <p class="mb-2">
          <strong>AVISO:</strong> O Elarin NÃO É dispositivo médico, NÃO substitui orientação médica,
          NÃO é registrado na ANVISA. Não diagnosticamos ou tratamos lesões.
        </p>
        <p>
          Consulte um médico antes de iniciar exercícios. Pare se sentir dor.
          <strong>Uso por sua conta e risco.</strong> Você assume total responsabilidade por lesões.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">5. Obrigações</h2>
        <p>
          Você deve: fornecer informações verdadeiras, manter senha confidencial, não compartilhar conta,
          não usar para fins ilícitos, respeitar direitos autorais.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">6. Propriedade Intelectual</h2>
        <p>
          Conteúdo e marca "Elarin" protegidos por Lei 9.609/1998 (Software) e Lei 9.279/1996 (Propriedade Industrial).
          <strong>Seus dados são seus</strong> - você pode exportá-los (LGPD Art. 18, V).
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">7. Privacidade</h2>
        <p>
          Dados tratados conforme <a href="{base}/privacy" style="color: var(--color-primary-400);" class="hover:underline">Política de Privacidade</a>
          e LGPD. <span style="color: var(--color-success);">Processamento biométrico 100% local. Vídeo nunca é gravado/transmitido.</span>
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">8. Disponibilidade</h2>
        <p>Não garantimos disponibilidade ininterrupta, ausência de erros ou compatibilidade com todos dispositivos.</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">9. Modificações e Rescisão</h2>
        <p>
          Podemos modificar funcionalidades (aviso de 30 dias para mudanças substanciais).
          Você pode deletar conta em <strong>Configurações > Privacidade</strong>.
          Podemos suspender contas que violem os Termos.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">10. Limitação de Responsabilidade</h2>
        <p>
          Não somos responsáveis por: lesões físicas, perda de dados, danos indiretos, incompatibilidade.
          Legislação: CDC (Lei 8.078/1990) e Marco Civil (Lei 12.965/2014).
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">11. Lei Aplicável</h2>
        <p>Leis brasileiras. Foro: [SUA CIDADE], [ESTADO].</p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">12. Contato</h2>
        <p>
          📧 <a href="mailto:contato@elarin.com.br" style="color: var(--color-primary-400);" class="hover:underline">contato@elarin.com.br</a> |
          Jurídico: <a href="mailto:juridico@elarin.com.br" style="color: var(--color-primary-400);" class="hover:underline">juridico@elarin.com.br</a>
        </p>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-white mb-2">13. Aceitação</h2>
        <p>Ao criar conta, você declara ter lido e concordado com estes Termos.</p>
      </section>
    </div>
  </div>
</div>
