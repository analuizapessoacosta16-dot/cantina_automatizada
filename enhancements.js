/* ================================================================
 * enhancements.js — camada de UX aditiva sobre app.js
 *  1. Ícones Lucide (SVG)  · 2. Toasts + Skeleton + Estados vazios
 *  4. Gráfico semanal no dashboard (Chart.js)
 *  5. Ripple em botões · 6. (print via CSS) · 7. aria-labels
 * ================================================================ */
(function () {
  'use strict';

  // -------------------------------------------------------------
  // 2. TOASTS — canto superior direito
  // -------------------------------------------------------------
  function garantirContainerToast() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      document.body.appendChild(c);
    }
    return c;
  }

  const TOAST_ICONS = {
    ok:   'check-circle-2',
    err:  'x-circle',
    warn: 'alert-triangle',
    info: 'info',
  };

  function toast(mensagem, tipo, duracao) {
    tipo = tipo || 'info';
    duracao = duracao == null ? 3800 : duracao;
    const c = garantirContainerToast();
    const el = document.createElement('div');
    el.className = 'toast tipo-' + tipo;
    el.innerHTML =
      '<span class="toast-ic"><i data-lucide="' + (TOAST_ICONS[tipo] || 'info') + '"></i></span>' +
      '<div class="toast-body"></div>' +
      '<button class="toast-close" aria-label="Fechar"><i data-lucide="x"></i></button>';
    el.querySelector('.toast-body').textContent = mensagem;
    c.appendChild(el);
    if (window.lucide) window.lucide.createIcons({ context: el });

    const fechar = () => {
      if (el.classList.contains('saindo')) return;
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 220);
    };
    el.querySelector('.toast-close').addEventListener('click', fechar);
    if (duracao > 0) setTimeout(fechar, duracao);
    return el;
  }

  window.toast = toast; // API pública para app.js quiser usar direto
  window.lovConfirm = function (msg) { return window.confirm(msg); }; // placeholder

  // Sobrescreve alert() → toast (mantém confirm sync)
  const _alertNativo = window.alert;
  window.alert = function (m) {
    try {
      const s = String(m || '');
      // Heurística simples de tipo
      let t = 'info';
      if (/erro|inválid|falha|obrigat/i.test(s)) t = 'err';
      else if (/sucesso|salvo|adicionad|removid|liberad|ok/i.test(s)) t = 'ok';
      else if (/atenção|selecion|antes/i.test(s)) t = 'warn';
      toast(s, t);
    } catch (e) { _alertNativo(m); }
  };

  // -------------------------------------------------------------
  // 1. ÍCONES LUCIDE — substituições nos pontos-chave
  // -------------------------------------------------------------
  const LUCIDE_MAP = [
    // seletor CSS → nome do ícone Lucide (ou null p/ manter conteúdo textual)
    { sel: '.login-logo-icone',        icone: 'utensils-crossed', esconderTexto: true },
    { sel: '.nav-logo-dot',            icone: 'utensils-crossed', esconderTexto: true },
    { sel: '[data-tela="dashboard"]',  icone: 'layout-dashboard', prefixo: true, textoLimpo: 'Painel do Dia' },
    { sel: '[data-tela="leitor"]',     icone: 'scan-line',        prefixo: true, textoLimpo: 'Leitor QR' },
    { sel: '[data-tela="agendamentos"]', icone: 'calendar-days',  prefixo: true, textoLimpo: 'Agendamentos' },
    { sel: '[data-tela="presencas"]',  icone: 'clipboard-check',  prefixo: true, textoLimpo: 'Ajuste de Presenças' },
    { sel: '[data-tela="entrada"]',    icone: 'door-open',        prefixo: true, textoLimpo: 'Entrada' },
    { sel: '[data-tela="relatorios"]', icone: 'bar-chart-3',      prefixo: true, textoLimpo: 'Relatórios' },
    { sel: '[data-tela="rel-presenca"]', icone: 'notebook-pen',   prefixo: true, textoLimpo: 'Diário de Presenças' },
    { sel: '[data-tela="alunos"]',     icone: 'users',            prefixo: true, textoLimpo: 'Alunos' },
  ];

  function aplicarLucideEstatico() {
    LUCIDE_MAP.forEach(m => {
      document.querySelectorAll(m.sel).forEach(el => {
        if (el.dataset.lucideAplicado) return;
        el.dataset.lucideAplicado = '1';
        if (m.esconderTexto) {
          el.textContent = '';
          const i = document.createElement('i');
          i.setAttribute('data-lucide', m.icone);
          el.appendChild(i);
        } else if (m.prefixo) {
          el.innerHTML = '<i data-lucide="' + m.icone + '"></i>' + (m.textoLimpo || el.textContent.trim());
        }
      });
    });
  }

  // Reescreve o sync-status para usar Lucide + cor semântica
  function patchSyncStatus() {
    const orig = window.mostrarStatusSync;
    if (typeof orig !== 'function' || orig._patched) return;
    const nova = function (estado) {
      const el = document.getElementById('sync-status');
      if (!el) return;
      let icone = 'circle', txt = 'Modo local', cor = 'var(--amarelo)';
      if (estado === 'conectado')      { icone = 'wifi';         txt = 'Sincronizado';   cor = 'var(--verde)'; }
      else if (estado === 'sincronizando') { icone = 'refresh-cw'; txt = 'Sincronizando…'; cor = 'var(--amarelo)'; }
      else if (estado === 'erro')      { icone = 'wifi-off';     txt = 'Erro ao sincronizar'; cor = 'var(--vermelho)'; }
      else                             { icone = 'hard-drive';   txt = 'Modo local';     cor = 'var(--amarelo)'; }
      el.innerHTML = '<i data-lucide="' + icone + '"></i>' + txt;
      el.style.color = cor;
      if (window.lucide) window.lucide.createIcons({ context: el });
    };
    nova._patched = true;
    window.mostrarStatusSync = nova;
  }

  // Chama Lucide + reaplica em mudanças dinâmicas
  function renderIcones() {
    aplicarLucideEstatico();
    if (window.lucide) window.lucide.createIcons();
  }

  // -------------------------------------------------------------
  // 5. RIPPLE em botões
  // -------------------------------------------------------------
  document.addEventListener('pointerdown', function (ev) {
    const alvo = ev.target.closest('.btn, .tab, .aba-sala, .nav-sair');
    if (!alvo) return;
    const rect = alvo.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.width = ink.style.height = size + 'px';
    ink.style.left = (ev.clientX - rect.left - size / 2) + 'px';
    ink.style.top  = (ev.clientY - rect.top  - size / 2) + 'px';
    alvo.appendChild(ink);
    setTimeout(() => ink.remove(), 600);
  });

  // -------------------------------------------------------------
  // 7. aria-labels automáticos em botões só-com-ícone
  // -------------------------------------------------------------
  function marcarAria() {
    document.querySelectorAll('button:not([aria-label])').forEach(b => {
      const txt = (b.textContent || '').trim();
      if (!txt) return;
      // Se só tem emoji/símbolos (sem letras), promove a aria-label a algo legível
      if (!/[a-zà-ú0-9]/i.test(txt)) {
        b.setAttribute('aria-label', txt);
      }
    });
  }

  // -------------------------------------------------------------
  // 2. SKELETON — enquanto tbody está vazio e overlay de loading visível
  // -------------------------------------------------------------
  function pintarSkeleton(tbody, cols, linhas) {
    linhas = linhas || 5;
    let html = '';
    for (let i = 0; i < linhas; i++) {
      html += '<tr class="skel-row">';
      for (let c = 0; c < cols; c++) html += '<td><span class="skel"></span></td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
  }
  window.pintarSkeleton = pintarSkeleton;

  function skeletonsIniciais() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay || getComputedStyle(overlay).display === 'none') return;
    const tabelas = [
      { id: 'ag-corpo',   cols: 5 },
      { id: 'pres-corpo', cols: 6 },
      { id: 'al-corpo',   cols: 5 },
      { id: 'rel-corpo',  cols: 4 },
    ];
    tabelas.forEach(t => {
      const tb = document.getElementById(t.id);
      if (tb && !tb.children.length) pintarSkeleton(tb, t.cols, 4);
    });
  }

  // -------------------------------------------------------------
  // 2. Estados vazios elegantes — reescreve <p class="vazio"> e <td class="vazio">
  // -------------------------------------------------------------
  const EMPTY_MAP = {
    'ag-corpo':   { ic: 'calendar-x',      titulo: 'Nenhum agendamento',       sub: 'Escolha outra data ou clique em "+ Adicionar aluno".' },
    'pres-corpo': { ic: 'user-check',      titulo: 'Nenhum aluno para marcar', sub: 'Ajuste o filtro de sala ou refeição.' },
    'al-corpo':   { ic: 'user-plus',       titulo: 'Nenhum aluno cadastrado',  sub: 'Clique em "+ Novo aluno" para começar.' },
    'rel-corpo':  { ic: 'file-search',     titulo: 'Sem dados no período',     sub: 'Ajuste as datas do relatório.' },
    'd-registros':{ ic: 'scan-line',       titulo: 'Nenhuma leitura ainda',    sub: 'As leituras do QR aparecem aqui em tempo real.' },
    'leit-hist':  { ic: 'history',         titulo: 'Sem leituras nesta sessão',sub: 'Ligue a câmera e aponte para um QR.' },
    'ent-hist':   { ic: 'door-open',       titulo: 'Sem entradas registradas', sub: 'As entradas do dia aparecem aqui.' },
  };

  function embelezarVazios(root) {
    root = root || document;
    Object.entries(EMPTY_MAP).forEach(([id, cfg]) => {
      const host = root.getElementById ? root.getElementById(id) : document.getElementById(id);
      if (!host) return;
      // Caso <tbody> com <td class="vazio">
      const tdVazio = host.querySelector('td.vazio');
      if (tdVazio && !tdVazio.dataset.emb) {
        tdVazio.dataset.emb = '1';
        tdVazio.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-state-ic"><i data-lucide="' + cfg.ic + '"></i></div>' +
            '<div class="empty-state-titulo">' + cfg.titulo + '</div>' +
            '<div class="empty-state-sub">' + cfg.sub + '</div>' +
          '</div>';
      }
      // Caso <div> com <p class="vazio">
      const pVazio = host.querySelector(':scope > p.vazio, p.vazio');
      if (pVazio && !pVazio.dataset.emb) {
        pVazio.dataset.emb = '1';
        pVazio.outerHTML =
          '<div class="empty-state">' +
            '<div class="empty-state-ic"><i data-lucide="' + cfg.ic + '"></i></div>' +
            '<div class="empty-state-titulo">' + cfg.titulo + '</div>' +
            '<div class="empty-state-sub">' + cfg.sub + '</div>' +
          '</div>';
      }
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // -------------------------------------------------------------
  // 4. GRÁFICO SEMANAL (Chart.js) no dashboard
  // -------------------------------------------------------------
  let chartInstance = null;
  function garantirCardGrafico() {
    const dash = document.getElementById('tela-dashboard');
    if (!dash || document.getElementById('dash-chart-card')) return;
    const card = document.createElement('div');
    card.className = 'card mb16';
    card.id = 'dash-chart-card';
    card.innerHTML =
      '<div class="card-topo"><p class="card-titulo mb0">' +
        '<i data-lucide="bar-chart-3"></i> Refeições nos últimos 7 dias</p>' +
        '<span class="contador" id="dash-chart-legenda"></span></div>' +
      '<canvas id="dash-chart"></canvas>';
    // insere antes do primeiro card existente da tela (após os stats)
    const alvo = dash.querySelector('.card');
    if (alvo) dash.insertBefore(card, alvo);
    else dash.appendChild(card);
    if (window.lucide) window.lucide.createIcons({ context: card });
  }

  function atualizarGrafico() {
    if (typeof window.Chart === 'undefined') return;
    const db = window.db;
    if (!db || !Array.isArray(db.registros)) return;
    garantirCardGrafico();

    const hoje = new Date();
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje); d.setDate(hoje.getDate() - i);
      dias.push({
        iso: d.toISOString().slice(0, 10),
        rot: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', ''),
      });
    }
    const contar = (iso, ref) => db.registros.filter(r =>
      r && r.data === iso && !r.bloqueado &&
      (ref ? (r.refeicao === ref) : true)).length;

    const dsManha  = dias.map(d => contar(d.iso, 'Lanche manhã'));
    const dsAlmoco = dias.map(d => contar(d.iso, 'Almoço'));
    const dsTarde  = dias.map(d => contar(d.iso, 'Lanche tarde'));

    const ctx = document.getElementById('dash-chart');
    if (!ctx) return;
    const cfg = {
      type: 'bar',
      data: {
        labels: dias.map(d => d.rot),
        datasets: [
          { label: 'Lanche manhã', data: dsManha,  backgroundColor: '#FBBF24', borderRadius: 6 },
          { label: 'Almoço',       data: dsAlmoco, backgroundColor: '#4FD1C5', borderRadius: 6 },
          { label: 'Lanche tarde', data: dsTarde,  backgroundColor: '#60A5FA', borderRadius: 6 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94A3B8', boxWidth: 12, boxHeight: 12, padding: 14 } },
          tooltip: { backgroundColor: '#111A2C', borderColor: 'rgba(148,163,184,.2)', borderWidth: 1 },
        },
        scales: {
          x: { stacked: true, ticks: { color: '#94A3B8' }, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, ticks: { color: '#94A3B8', precision: 0 }, grid: { color: 'rgba(148,163,184,.08)' } },
        },
      },
    };
    if (chartInstance) {
      chartInstance.data = cfg.data;
      chartInstance.update();
    } else {
      chartInstance = new window.Chart(ctx, cfg);
    }
    const total = dsManha.concat(dsAlmoco, dsTarde).reduce((a, b) => a + b, 0);
    const leg = document.getElementById('dash-chart-legenda');
    if (leg) leg.textContent = total + ' refeições no total';
  }

  // -------------------------------------------------------------
  // Wrap renderDash para atualizar gráfico + estados vazios
  // -------------------------------------------------------------
  function patchRenderDash() {
    const orig = window.renderDash;
    if (typeof orig !== 'function' || orig._patched) return;
    const nova = function () {
      const r = orig.apply(this, arguments);
      try { atualizarGrafico(); embelezarVazios(); renderIcones(); } catch (e) { console.warn(e); }
      return r;
    };
    nova._patched = true;
    window.renderDash = nova;
  }

  // Observer global — reaplica ícones + estados vazios em mudanças de DOM relevantes
  const alvos = ['ag-corpo','pres-corpo','al-corpo','rel-corpo','d-registros','leit-hist','ent-hist','sync-status'];
  function iniciarObserver() {
    const cb = () => { renderIcones(); embelezarVazios(); };
    let pendente = false;
    const agenda = () => {
      if (pendente) return; pendente = true;
      requestAnimationFrame(() => { pendente = false; cb(); });
    };
    const obs = new MutationObserver(agenda);
    alvos.forEach(id => {
      const el = document.getElementById(id);
      if (el) obs.observe(el, { childList: true, subtree: true, characterData: true });
    });
    // reaplica quando muda de aba
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setTimeout(cb, 60)));
  }

  // -------------------------------------------------------------
  // BOOT
  // -------------------------------------------------------------
  function boot() {
    garantirContainerToast();
    patchSyncStatus();
    patchRenderDash();
    skeletonsIniciais();
    renderIcones();
    embelezarVazios();
    marcarAria();
    iniciarObserver();
    // Segunda passada quando o overlay de loading some (dados carregaram)
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      const check = new MutationObserver(() => {
        if (getComputedStyle(overlay).display === 'none') {
          setTimeout(() => { renderIcones(); embelezarVazios(); atualizarGrafico(); }, 60);
        }
      });
      check.observe(overlay, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    // Timers de segurança
    setTimeout(() => { renderIcones(); embelezarVazios(); atualizarGrafico(); }, 800);
    setTimeout(() => { renderIcones(); embelezarVazios(); atualizarGrafico(); }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
