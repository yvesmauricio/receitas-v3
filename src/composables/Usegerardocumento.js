/**
 * useGerarDocumento.js
 * Gerador de documentos oficiais MEI
 *
 * Livro Caixa  — Resolução CGSN nº 140/2018, art. 26-A
 * DASN-SIMEI   — IN RFB nº 2.110/2022 / LC nº 123/2006 art. 18-A § 15
 */

// ── Helpers ────────────────────────────────────────────────────────
const BRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtData = (iso) => {
  if (!iso) return ''
  const [a, m, d] = String(iso).split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso
}

const hoje = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

function abrirJanela(html, titulo) {
  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
  if (!win) { alert('Permita pop-ups para gerar o documento.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  // aguarda renderização antes de imprimir
  setTimeout(() => win.print(), 800)
}

// ── CSS COMPARTILHADO ───────────────────────────────────────────────
const CSS_BASE = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Source Serif 4', 'Times New Roman', Georgia, serif;
    font-size: 9.5pt;
    color: #000;
    background: #f4f4f4;
  }
  .pagina {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 14mm 20mm;
    margin: 8mm auto;
    background: #fff;
    box-shadow: 0 2px 16px rgba(0,0,0,.18);
    position: relative;
    page-break-after: always;
  }
  @media print {
    body { background: #fff; }
    .pagina {
      margin: 0;
      box-shadow: none;
      page-break-after: always;
    }
    .no-print { display: none !important; }
  }

  /* ── Cabeçalho oficial ── */
  .doc-topo {
    display: flex;
    align-items: flex-start;
    gap: 14pt;
    border-bottom: 3px solid #003580;
    padding-bottom: 10pt;
    margin-bottom: 10pt;
  }
  .brasao {
    width: 56pt;
    height: 56pt;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #003580;
    font-size: 28pt;
    border-radius: 50%;
    color: #003580;
    background: #f0f4ff;
  }
  .doc-topo-texto { flex: 1; }
  .gov-linha { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #003580; }
  .doc-titulo {
    font-size: 14pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .4px;
    color: #000;
    line-height: 1.2;
    margin: 3pt 0 2pt;
  }
  .doc-subtitulo { font-size: 8.5pt; color: #333; }

  /* ── Caixa de identificação ── */
  .id-box {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid #000;
    margin-bottom: 8pt;
    font-size: 8.5pt;
  }
  .id-box td, .id-box th {
    border: 1px solid #555;
    padding: 4pt 6pt;
    vertical-align: top;
  }
  .id-box th {
    background: #e8edf5;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .4px;
    white-space: nowrap;
    color: #000;
  }
  .id-box td { font-weight: 400; }
  .id-box td strong { font-weight: 700; }

  /* ── Seção / Quadro ── */
  .quadro-titulo {
    background: #003580;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 4pt 7pt;
    margin-top: 10pt;
  }
  .quadro-subtitulo {
    background: #d4ddf0;
    font-size: 7.5pt;
    font-style: italic;
    padding: 3pt 7pt;
    border-left: 1.5px solid #003580;
    border-right: 1.5px solid #003580;
    color: #000;
    margin-bottom: 0;
  }

  /* ── Tabelas ── */
  .tabela {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 0;
  }
  .tabela th {
    background: #e8edf5;
    border: 1px solid #333;
    padding: 4pt 5pt;
    text-align: center;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
  }
  .tabela td {
    border: 1px solid #888;
    padding: 3.5pt 5pt;
    vertical-align: top;
  }
  .tabela .num { text-align: right; font-family: 'Courier New', monospace; font-size: 8.5pt; white-space: nowrap; }
  .tabela .cen { text-align: center; }
  .tabela tr.subtotal td {
    background: #f5f5f5;
    font-weight: 700;
    border-top: 1.5px solid #333;
  }
  .tabela tr.total td {
    background: #e8edf5;
    font-weight: 700;
    border-top: 2px solid #003580;
    border-bottom: 2px solid #003580;
  }
  .tabela tr.vazio td {
    height: 14pt;
    background: #fafafa;
  }
  .tabela tr:nth-child(even) td { background: #fafafa; }
  .tabela tr.subtotal td, .tabela tr.total td { background: inherit; }

  /* ── Resumo final ── */
  .resumo-box {
    border: 1.5px solid #003580;
    margin-top: 8pt;
    font-size: 8.5pt;
  }
  .resumo-box .resumo-titulo {
    background: #003580;
    color: #fff;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 3pt 7pt;
  }
  .resumo-linha {
    display: flex;
    justify-content: space-between;
    padding: 3.5pt 7pt;
    border-bottom: 1px solid #ddd;
  }
  .resumo-linha:last-child { border-bottom: none; }
  .resumo-linha span { color: #333; }
  .resumo-linha strong { font-family: 'Courier New', monospace; }
  .resumo-linha.destaque { background: #e8edf5; font-weight: 700; }
  .resumo-linha.destaque span, .resumo-linha.destaque strong { color: #000; }

  /* ── Assinaturas / rodapé ── */
  .assinatura-area {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20pt;
    margin-top: 20pt;
  }
  .assinatura-campo {
    border-top: 1px solid #333;
    padding-top: 4pt;
    font-size: 7.5pt;
    color: #444;
    text-align: center;
  }
  .rodape {
    margin-top: 12pt;
    padding-top: 6pt;
    border-top: 1px solid #ccc;
    font-size: 7pt;
    color: #555;
    line-height: 1.5;
  }

  /* ── Nota legal ── */
  .nota-legal {
    margin-top: 8pt;
    padding: 5pt 7pt;
    background: #fffbe6;
    border-left: 3px solid #c8890a;
    font-size: 7.5pt;
    color: #444;
    line-height: 1.5;
  }

  /* ── Botão flutuante no-print ── */
  .toolbar-flutuante {
    position: fixed;
    top: 14px;
    right: 14px;
    display: flex;
    gap: 8px;
    z-index: 9999;
  }
  .toolbar-flutuante button {
    padding: 9px 18px;
    background: #003580;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,50,.3);
  }
  .toolbar-flutuante button:hover { background: #002060; }
  .toolbar-flutuante .btn-fechar { background: #666; }

  /* ── Status MEI ── */
  .status-ok   { color: #1a7a45; font-weight: 700; }
  .status-warn { color: #c45a09; font-weight: 700; }
  .status-err  { color: #c41c1c; font-weight: 700; }

  /* ── Checkbox simulado ── */
  .check { display: inline-block; width: 10pt; height: 10pt; border: 1px solid #333; margin-right: 4pt; vertical-align: middle; text-align: center; font-size: 8pt; line-height: 10pt; }
  .check.sim { background: #003580; color: #fff; }
`

// ══════════════════════════════════════════════════════════════════
// LIVRO CAIXA MEI — Resolução CGSN nº 140/2018, art. 26-A
// ══════════════════════════════════════════════════════════════════
export function gerarLivroCaixa({
  mes_ref,
  empresa,
  entradas,
  naoMei,
  saidas,
  totais,
  acumulado
}) {
  const nomeEmpresa = empresa?.nome || 'Microempreendedor Individual'
  const [mesSel, anoSel] = (mes_ref || '').split('/')
  const nomeMes = mesSel
    ? new Date(Number(anoSel), Number(mesSel) - 1, 1)
        .toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    : mes_ref

  // Monta linhas unificadas com saldo corrente
  const linhas = []
  let saldo = 0
  const seq = { n: 0 }

  const addLinha = (item, tipo) => {
    seq.n++
    const val = Math.abs(item.valor || 0)
    if (tipo === 'entrada') saldo += val
    else saldo -= val
    linhas.push({ seq: seq.n, data: item.data, desc: item.descricao, cat: item.categoria, tipo, val, saldo })
  }

  const ordenados = [...entradas, ...naoMei, ...saidas]
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''))

  ordenados.forEach(it => {
    const isEntrada = (it.natureza === 'entrada') || it.valor > 0
    addLinha(it, isEntrada ? 'entrada' : 'saida')
  })

  // Preencher com linhas vazias até mínimo de 20 (padrão livro caixa)
  const LINHAS_MIN = Math.max(linhas.length + 3, 18)
  while (linhas.length < LINHAS_MIN) {
    linhas.push(null)
  }

  const linhasHTML = linhas.map((l, i) => {
    if (!l) return `<tr class="vazio"><td>${''}</td><td></td><td></td><td class="num"></td><td class="num"></td><td class="num"></td></tr>`
    const entrada = l.tipo === 'entrada' ? BRL(l.val) : ''
    const saida   = l.tipo === 'saida'   ? BRL(l.val) : ''
    const saldoStr = l.saldo < 0
      ? `<span style="color:#c41c1c">(${BRL(Math.abs(l.saldo))})</span>`
      : BRL(l.saldo)
    return `
      <tr>
        <td class="cen">${l.seq}</td>
        <td class="cen">${fmtData(l.data)}</td>
        <td>${escHtml(l.desc)}${l.cat ? ` <span style="font-size:7pt;color:#666">· ${escHtml(l.cat)}</span>` : ''}</td>
        <td class="num">${entrada}</td>
        <td class="num">${saida}</td>
        <td class="num">${saldoStr}</td>
      </tr>`
  }).join('')

  const totalEntradas = (totais.receitas_mei || 0) + (totais.outras_entradas_nao_mei || 0)
  const totalSaidas   = (totais.saidas_operacionais || 0) + (totais.saidas_pessoais || 0)
  const saldoFinal    = totais.saldo_mes ?? (totais.saldo_operacional ?? 0)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Livro Caixa MEI – ${mes_ref}</title>
<style>${CSS_BASE}</style>
</head>
<body>

<div class="toolbar-flutuante no-print">
  <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <button class="btn-fechar" onclick="window.close()">✕ Fechar</button>
</div>

<div class="pagina">

  <!-- ── Cabeçalho ── -->
  <div class="doc-topo">
    <div class="brasao">🇧🇷</div>
    <div class="doc-topo-texto">
      <div class="gov-linha">República Federativa do Brasil · Secretaria Especial da Receita Federal do Brasil</div>
      <div class="doc-titulo">Livro Caixa do Microempreendedor Individual</div>
      <div class="doc-subtitulo">
        Nos termos da <strong>Resolução CGSN nº 140/2018, art. 26-A</strong> · 
        Lei Complementar nº 123, de 14 de dezembro de 2006
      </div>
    </div>
  </div>

  <!-- ── Identificação ── -->
  <table class="id-box">
    <tr>
      <th style="width:30%">Razão Social / Nome do MEI</th>
      <th style="width:22%">CPF / CNPJ (MEI)</th>
      <th style="width:20%">Competência (Mês/Ano)</th>
      <th style="width:28%">Atividade Econômica Principal</th>
    </tr>
    <tr>
      <td><strong>${escHtml(nomeEmpresa)}</strong></td>
      <td><em style="color:#777">_____._____.___/____-__</em></td>
      <td class="cen"><strong>${mes_ref || ''}</strong></td>
      <td>Produção e venda de alimentos artesanais</td>
    </tr>
    <tr>
      <th colspan="2">Endereço do Estabelecimento</th>
      <th>Município / UF</th>
      <th>CNAE Principal</th>
    </tr>
    <tr>
      <td colspan="2"><em style="color:#777">Preencher conforme CCMEI</em></td>
      <td><em style="color:#777">_____________/__</em></td>
      <td>1091-1/01 – Fab. de produtos de panificação industrial</td>
    </tr>
  </table>

  <!-- ── Quadro 1 – Movimentação ── -->
  <div class="quadro-titulo">Quadro 1 — Movimentação de Caixa · ${nomeMes}</div>
  <div class="quadro-subtitulo">
    Registro cronológico de todas as receitas e despesas do mês, conforme art. 26-A da Resolução CGSN nº 140/2018
  </div>

  <table class="tabela">
    <thead>
      <tr>
        <th style="width:5%">Nº</th>
        <th style="width:9%">Data</th>
        <th>Histórico / Descrição do Lançamento</th>
        <th style="width:13%">Receitas (R$)</th>
        <th style="width:13%">Despesas (R$)</th>
        <th style="width:13%">Saldo (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${linhasHTML}
      <tr class="subtotal">
        <td colspan="3" style="text-align:right">TOTAL DO MÊS</td>
        <td class="num">${BRL(totalEntradas)}</td>
        <td class="num">${BRL(totalSaidas)}</td>
        <td class="num">${saldoFinal < 0 ? `<span style="color:#c41c1c">(${BRL(Math.abs(saldoFinal))})</span>` : BRL(saldoFinal)}</td>
      </tr>
    </tbody>
  </table>

  <!-- ── Quadro 2 – Resumo mensal ── -->
  <div class="quadro-titulo" style="margin-top:12pt">Quadro 2 — Resumo do Mês · ${mes_ref}</div>
  <div class="resumo-box">
    <div class="resumo-linha">
      <span>Receita Bruta MEI (faturamento tributável para fins de LC 123/2006)</span>
      <strong>${BRL(totais.receitas_mei || 0)}</strong>
    </div>
    ${totais.outras_entradas_nao_mei ? `
    <div class="resumo-linha">
      <span>Outras entradas não-MEI (rendimentos pessoais — não compõem faturamento tributável)</span>
      <strong>${BRL(totais.outras_entradas_nao_mei)}</strong>
    </div>` : ''}
    <div class="resumo-linha">
      <span>Rendimentos financeiros registrados</span>
      <strong>${BRL(totais.rendimento_financeiro || 0)}</strong>
    </div>
    <div class="resumo-linha">
      <span>( − ) Total de despesas operacionais do mês</span>
      <strong>${BRL(totais.saidas_operacionais || 0)}</strong>
    </div>
    <div class="resumo-linha destaque">
      <span>= Resultado Operacional do Mês</span>
      <strong>${BRL(totais.saldo_operacional || 0)}</strong>
    </div>
    <div class="resumo-linha">
      <span>Retiradas pessoais / Pró-labore do titular</span>
      <strong>${BRL(totais.saidas_pessoais || 0)}</strong>
    </div>
    <div class="resumo-linha destaque">
      <span>= Saldo Final do Mês (caixa disponível)</span>
      <strong>${BRL(saldoFinal)}</strong>
    </div>
  </div>

  <!-- ── Quadro 3 – Acumulado do ano ── -->
  <div class="quadro-titulo" style="margin-top:12pt">Quadro 3 — Acumulado do Ano-Calendário ${anoSel} até ${mes_ref}</div>
  <table class="tabela">
    <thead>
      <tr>
        <th>Faturamento MEI acumulado (Receita Bruta)</th>
        <th>Despesas operacionais acumuladas</th>
        <th>Resultado operacional acumulado</th>
        <th>Utilização do Teto MEI (R$ 81.000,00)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="num">${BRL(acumulado.receitas_mei)}</td>
        <td class="num">${BRL(acumulado.saidas_operacionais)}</td>
        <td class="num ${acumulado.saldo_operacional >= 0 ? '' : 'status-err'}">${BRL(acumulado.saldo_operacional)}</td>
        <td class="cen ${acumulado.pct_teto >= 90 ? 'status-err' : acumulado.pct_teto >= 70 ? 'status-warn' : 'status-ok'}">
          ${acumulado.pct_teto.toFixed(1)}%
        </td>
      </tr>
    </tbody>
  </table>

  <!-- ── Notas ── -->
  <div class="nota-legal" style="margin-top:10pt">
    <strong>Nota:</strong> Este Livro Caixa é elaborado em conformidade com o art. 26-A da Resolução CGSN nº 140, de 22 de maio de 2018. 
    O MEI está dispensado de escrituração contábil formal, devendo manter este registro por 5 (cinco) anos para fins de fiscalização. 
    Os valores de receita aqui consignados são a base de cálculo para verificação do limite de faturamento previsto no art. 18-A, 
    § 1º, da Lei Complementar nº 123/2006 (R$ 81.000,00 no ano-calendário).
  </div>

  <!-- ── Assinatura ── -->
  <div class="assinatura-area">
    <div class="assinatura-campo">
      Local e data: _________________________________, ${hoje()}
    </div>
    <div class="assinatura-campo">
      Assinatura do Microempreendedor Individual
      <div style="margin-top:18pt">_____________________________________________</div>
      <div style="margin-top:4pt">${escHtml(nomeEmpresa)}</div>
    </div>
  </div>

  <!-- ── Rodapé ── -->
  <div class="rodape">
    Documento gerado eletronicamente em ${hoje()} · 
    Base legal: Res. CGSN nº 140/2018 (art. 26-A) · LC nº 123/2006 · 
    O MEI deve manter os comprovantes originais dos lançamentos por 5 anos. · 
    Para entrega do DAS-MEI e DASN-SIMEI acesse: <strong>gov.br/mei</strong>
  </div>

</div><!-- /pagina -->
</body>
</html>`

  abrirJanela(html, `Livro Caixa MEI – ${mes_ref}`)
}


// ══════════════════════════════════════════════════════════════════
// DASN-SIMEI — Declaração Anual Simplificada
// IN RFB nº 2.110/2022 · LC nº 123/2006 art. 18-A § 15
// ══════════════════════════════════════════════════════════════════
export function gerarDASNSIMEI({
  ano,
  empresa,
  meses,
  totais,
  tetoAnual,
  pctTeto
}) {
  const nomeEmpresa = empresa?.nome || 'Microempreendedor Individual'
  const dentroTeto  = (totais.receitas || 0) <= (tetoAnual || 81000)
  const statusTeto  = pctTeto >= 100 ? 'status-err' : pctTeto >= 90 ? 'status-warn' : 'status-ok'
  const statusTexto = pctTeto >= 100
    ? 'ACIMA DO TETO — Providencie regularização com contador'
    : pctTeto >= 90
      ? 'ATENÇÃO: Mais de 90% do teto atingido'
      : 'Dentro do limite anual permitido'

  const NOMES_MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  // Montar todos os 12 meses (preencher ausentes com zero)
  const mesesCompletos = Array.from({ length: 12 }, (_, i) => {
    const mesNum = String(i + 1).padStart(2, '0')
    const ref    = `${mesNum}/${ano}`
    const found  = (meses || []).find(m => m.mes_ref === ref)
    return {
      ref,
      nome: NOMES_MESES[i],
      receitas_mei: found?.receitas_mei || 0,
      outras_entradas: found?.outras_entradas_nao_mei || 0,
      saidas_op: found?.saidas_operacionais || 0,
      saidas_pes: found?.saidas_pessoais || 0,
      saldo_op: found?.saldo_operacional || 0,
    }
  })

  const linhasQ1 = mesesCompletos.map((m, i) => `
    <tr ${i % 2 === 1 ? 'style="background:#f9f9f9"' : ''}>
      <td>${m.nome}</td>
      <td class="num">${m.receitas_mei > 0 ? BRL(m.receitas_mei) : '—'}</td>
      <td class="num">${BRL(0)}</td>
      <td class="num">${BRL(0)}</td>
      <td class="num"><strong>${m.receitas_mei > 0 ? BRL(m.receitas_mei) : '—'}</strong></td>
    </tr>`).join('')

  const linhasQ2 = mesesCompletos.map((m, i) => `
    <tr ${i % 2 === 1 ? 'style="background:#f9f9f9"' : ''}>
      <td>${m.nome}</td>
      <td class="num">${m.saidas_op > 0 ? BRL(m.saidas_op) : '—'}</td>
      <td class="num">${m.saidas_pes > 0 ? BRL(m.saidas_pes) : '—'}</td>
      <td class="num"><strong>${(m.saidas_op + m.saidas_pes) > 0 ? BRL(m.saidas_op + m.saidas_pes) : '—'}</strong></td>
      <td class="num ${m.saldo_op >= 0 ? 'status-ok' : 'status-err'}">${BRL(m.saldo_op)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DASN-SIMEI ${ano} – ${nomeEmpresa}</title>
<style>${CSS_BASE}
.dasn-aviso {
  background: #fffbe6;
  border: 1.5px solid #c8890a;
  padding: 8pt 10pt;
  font-size: 8pt;
  margin-bottom: 10pt;
  color: #7a4a00;
  line-height: 1.5;
}
.dasn-aviso strong { color: #3d1f07; }
</style>
</head>
<body>

<div class="toolbar-flutuante no-print">
  <button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <button class="btn-fechar" onclick="window.close()">✕ Fechar</button>
</div>

<div class="pagina">

  <!-- ── Cabeçalho ── -->
  <div class="doc-topo">
    <div class="brasao">🇧🇷</div>
    <div class="doc-topo-texto">
      <div class="gov-linha">República Federativa do Brasil · Secretaria Especial da Receita Federal do Brasil</div>
      <div class="doc-titulo">DASN-SIMEI — Declaração Anual do Simples Nacional</div>
      <div class="doc-subtitulo">
        Microempreendedor Individual · 
        <strong>IN RFB nº 2.110/2022</strong> · 
        Lei Complementar nº 123/2006, art. 18-A, § 15 · 
        Prazo de entrega: <strong>31 de maio</strong> do ano seguinte ao ano-calendário
      </div>
    </div>
  </div>

  <!-- ── Aviso ── -->
  <div class="dasn-aviso">
    <strong>⚠️ IMPORTANTE:</strong> Este documento é um espelho de apoio gerado a partir dos seus lançamentos. 
    A DASN-SIMEI oficial <strong>deve ser transmitida obrigatoriamente pelo portal <u>gov.br/mei</u></strong> (PGMEI) até <strong>31/05/${Number(ano) + 1}</strong>. 
    A não entrega sujeita o MEI à multa mínima de R$ 50,00 (art. 37, § 1º, LC 123/2006). 
    Confira os valores abaixo com seu contador antes de transmitir.
  </div>

  <!-- ── Seção 1: Identificação ── -->
  <div class="quadro-titulo">Seção 1 — Identificação do Declarante</div>
  <table class="id-box">
    <tr>
      <th style="width:40%">Nome / Razão Social do MEI</th>
      <th style="width:25%">CNPJ do MEI</th>
      <th style="width:15%">Ano-Calendário</th>
      <th style="width:20%">Data de Transmissão</th>
    </tr>
    <tr>
      <td><strong>${escHtml(nomeEmpresa)}</strong></td>
      <td><em style="color:#777">__.___.___/____-__</em></td>
      <td class="cen"><strong>${ano}</strong></td>
      <td class="cen"><em style="color:#777">__/__/____</em></td>
    </tr>
    <tr>
      <th colspan="2">CPF do Titular</th>
      <th>Código CNAE Principal</th>
      <th>Situação da Empresa</th>
    </tr>
    <tr>
      <td colspan="2"><em style="color:#777">___.___.___-__</em></td>
      <td>1091-1/01</td>
      <td>Ativa</td>
    </tr>
  </table>

  <!-- ── Seção 2: Situação de Empregado ── -->
  <div class="quadro-titulo">Seção 2 — Contratação de Empregado (art. 18-C da LC nº 123/2006)</div>
  <table class="tabela">
    <thead>
      <tr>
        <th>Pergunta</th>
        <th style="width:12%">Sim</th>
        <th style="width:12%">Não</th>
        <th>Observação</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>O MEI possui ou possuiu empregado registrado em algum mês do ano-calendário de ${ano}?</td>
        <td class="cen"><span class="check"></span></td>
        <td class="cen"><span class="check sim">✓</span></td>
        <td style="font-size:7.5pt;color:#555">
          O MEI pode ter 1 (um) empregado registrado, com salário de 1 SM ou piso da categoria.
          Se houver empregado, informar os meses e o valor pago.
        </td>
      </tr>
    </tbody>
  </table>
  <div style="font-size:7.5pt;color:#777;padding:3pt 7pt;border:1px solid #ddd;border-top:none;margin-bottom:0">
    <em>Caso tenha tido empregado, altere a marcação acima e informe a remuneração no campo "Observação" antes de imprimir.</em>
  </div>

  <!-- ── Seção 3: Quadro 1 – Receita Bruta ── -->
  <div class="quadro-titulo" style="margin-top:10pt">Seção 3 — Quadro 1: Receita Bruta Auferida no Ano-Calendário ${ano}</div>
  <div class="quadro-subtitulo">
    Art. 18-A, § 1º, da LC nº 123/2006 — Somente receitas tributáveis pelo SIMEI (faturamento MEI). 
    Rendimentos pessoais, transferências e outras entradas não-MEI não são informados neste quadro.
  </div>
  <table class="tabela">
    <thead>
      <tr>
        <th style="width:14%">Mês de Competência</th>
        <th style="width:21%">Receita de Vendas de Mercadorias (R$)</th>
        <th style="width:21%">Receita de Prestação de Serviços (R$)</th>
        <th style="width:21%">Outras Receitas (R$)</th>
        <th style="width:23%">Total do Mês (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${linhasQ1}
      <tr class="total">
        <td><strong>TOTAL ANUAL</strong></td>
        <td class="num"><strong>${BRL(totais.receitas || 0)}</strong></td>
        <td class="num"><strong>${BRL(0)}</strong></td>
        <td class="num"><strong>${BRL(0)}</strong></td>
        <td class="num"><strong>${BRL(totais.receitas || 0)}</strong></td>
      </tr>
    </tbody>
  </table>
  <div style="padding:4pt 7pt;border:1px solid #ddd;border-top:none;font-size:7.5pt;color:#555;margin-bottom:0">
    <em>
      ℹ️ Distribua os valores entre "Vendas de Mercadorias" e "Prestação de Serviços" conforme a natureza das suas atividades 
      para preenchimento correto no PGMEI. Este espelho soma tudo em "Vendas de Mercadorias" por padrão.
    </em>
  </div>

  <!-- ── Seção 4: Quadro 2 – Despesas ── -->
  <div class="quadro-titulo" style="margin-top:10pt">Seção 4 — Quadro 2: Despesas e Resultado do Exercício (informativo)</div>
  <div class="quadro-subtitulo">
    Este quadro não integra a DASN-SIMEI oficial, mas é exigido pelo Livro Caixa (Res. CGSN 140/2018) e auxilia no controle de gestão.
  </div>
  <table class="tabela">
    <thead>
      <tr>
        <th style="width:14%">Mês</th>
        <th style="width:22%">Despesas Operacionais (R$)</th>
        <th style="width:22%">Retiradas Pessoais / Pró-labore (R$)</th>
        <th style="width:20%">Total Saídas (R$)</th>
        <th style="width:22%">Resultado Operacional (R$)</th>
      </tr>
    </thead>
    <tbody>
      ${linhasQ2}
      <tr class="total">
        <td><strong>TOTAL ANUAL</strong></td>
        <td class="num"><strong>${BRL(totais.operacional || 0)}</strong></td>
        <td class="num"><strong>${BRL(totais.pessoal || 0)}</strong></td>
        <td class="num"><strong>${BRL((totais.operacional || 0) + (totais.pessoal || 0))}</strong></td>
        <td class="num ${totais.saldo >= 0 ? 'status-ok' : 'status-err'}"><strong>${BRL(totais.saldo || 0)}</strong></td>
      </tr>
    </tbody>
  </table>

  <!-- ── Seção 5: Resultado Final ── -->
  <div class="quadro-titulo" style="margin-top:10pt">Seção 5 — Resultado do Exercício ${ano} e Verificação do Teto MEI</div>
  <div class="resumo-box">
    <div class="resumo-linha">
      <span><strong>Receita Bruta MEI Total (faturamento tributável)</strong></span>
      <strong>${BRL(totais.receitas || 0)}</strong>
    </div>
    ${totais.outras_entradas ? `
    <div class="resumo-linha">
      <span>Outras entradas não-MEI (informativo — NÃO compõem faturamento)</span>
      <strong>${BRL(totais.outras_entradas)}</strong>
    </div>` : ''}
    <div class="resumo-linha">
      <span>( − ) Total de Despesas Operacionais do Exercício</span>
      <strong>${BRL(totais.operacional || 0)}</strong>
    </div>
    <div class="resumo-linha destaque">
      <span>= Resultado Líquido do Negócio em ${ano}</span>
      <strong>${BRL(totais.saldo || 0)}</strong>
    </div>
    <div class="resumo-linha">
      <span>Limite anual de faturamento MEI (Res. CGSN — Portaria CGSN nº 3/2023)</span>
      <strong>R$ ${BRL(tetoAnual || 81000)}</strong>
    </div>
    <div class="resumo-linha destaque">
      <span>Percentual do teto MEI utilizado em ${ano}</span>
      <strong class="${statusTeto}">${pctTeto.toFixed(2)}% — ${statusTexto}</strong>
    </div>
  </div>

  <!-- ── Seção 6: Declaração ── -->
  <div class="quadro-titulo" style="margin-top:12pt">Seção 6 — Declaração e Assinatura</div>
  <div style="border:1.5px solid #003580;padding:8pt 10pt;font-size:8.5pt;line-height:1.7">
    <p>
      Declaro, sob as penas da lei, que as informações acima prestadas são a expressão da verdade, 
      que a empresa não se enquadra em nenhuma das vedações previstas no § 4º do art. 18-A da LC nº 123/2006, 
      e que os valores de receita bruta declarados correspondem à movimentação financeira do MEI no ano-calendário de <strong>${ano}</strong>.
    </p>
    <p style="margin-top:6pt;font-size:7.5pt;color:#555">
      O declarante é responsável pela veracidade e exatidão das informações prestadas (art. 37 da LC nº 123/2006). 
      A transmissão da DASN-SIMEI é feita exclusivamente pelo portal <strong>gov.br/mei</strong> ou pelo PGMEI 
      (Programa Gerador do Documento de Arrecadação do MEI). Este espelho não substitui a declaração oficial.
    </p>
  </div>

  <div class="assinatura-area" style="margin-top:16pt">
    <div class="assinatura-campo">
      Local e data: _________________________________, ${hoje()}
    </div>
    <div class="assinatura-campo">
      Assinatura do Microempreendedor Individual Titular
      <div style="margin-top:18pt">_____________________________________________</div>
      <div style="margin-top:4pt">${escHtml(nomeEmpresa)}</div>
      <div style="margin-top:2pt;font-size:7pt">CPF: ___.___.___-__ · CNPJ: __.___.___/____-__</div>
    </div>
  </div>

  <!-- ── Rodapé ── -->
  <div class="rodape">
    Espelho DASN-SIMEI gerado em ${hoje()} · Ano-calendário: ${ano} · 
    Base legal: IN RFB nº 2.110/2022 · LC nº 123/2006 art. 18-A § 15 · Res. CGSN nº 140/2018 · 
    <strong>ATENÇÃO: Este documento é apenas um espelho de apoio. A declaração oficial deve ser transmitida pelo portal gov.br/mei até 31/05/${Number(ano) + 1}.</strong>
  </div>

</div><!-- /pagina -->
</body>
</html>`

  abrirJanela(html, `DASN-SIMEI ${ano}`)
}

// Escape HTML helper
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}