const PRO_LABORE_MARGIN = 0.1

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function roundMoney(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100
}

function clampQuantity(quantity) {
  return Math.max(1, Math.floor(toNumber(quantity) || 1))
}

function normalizeAnalysisOptions(quantityOrOptions = 1) {
  if (quantityOrOptions && typeof quantityOrOptions === 'object' && !Array.isArray(quantityOrOptions)) {
    return {
      quantidade: clampQuantity(quantityOrOptions.quantidade),
      valorCliente: Math.max(0, toNumber(quantityOrOptions.valorCliente)),
      intelligence: quantityOrOptions.intelligence || quantityOrOptions.inteligencia || null
    }
  }

  return {
    quantidade: clampQuantity(quantityOrOptions),
    valorCliente: 0,
    intelligence: null
  }
}

function getDynamicMargin(quantity) {
  const qty = clampQuantity(quantity)
  if (qty === 1) return 0.3
  if (qty >= 2 && qty <= 4) return 0.2
  if (qty >= 10) return 0.1
  return 0.15
}

function getRequiredMargin(quantity) {
  return Math.max(getDynamicMargin(quantity), PRO_LABORE_MARGIN)
}

function normalizeProduct(product = {}) {
  return {
    id: product.id,
    nome: product.nome || 'Produto',
    custo: Math.max(0, toNumber(product.custo)),
    preco: Math.max(0, toNumber(product.preco))
  }
}

function getUnitProfit(product) {
  const item = normalizeProduct(product)
  return item.preco - item.custo
}

function getUnitMargin(product) {
  const item = normalizeProduct(product)
  if (item.preco <= 0) return 0
  return getUnitProfit(item) / item.preco
}

function buildStatus(totalPrice, totalCost, minUnitPrice, proposedUnitPrice) {
  if (totalPrice < totalCost || proposedUnitPrice < minUnitPrice || proposedUnitPrice < totalCost) {
    if (totalPrice < totalCost || proposedUnitPrice < totalCost) {
      return 'prejuizo'
    }
    return 'abaixo_do_minimo'
  }
  return 'ok'
}

function getSafeUnitPrice(product, quantity, basePrice) {
  const item = normalizeProduct(product)
  const minPrice = calcularPrecoMinimo(item.custo, quantity)
  return roundMoney(Math.max(item.custo, minPrice, toNumber(basePrice)))
}

function getPopularityScore(productId, intelligence) {
  if (!intelligence) return 0
  if (intelligence.scorePopularidade && intelligence.scorePopularidade[productId] != null) {
    return toNumber(intelligence.scorePopularidade[productId])
  }
  const ranking = Array.isArray(intelligence.rankingProdutos) ? intelligence.rankingProdutos : []
  const found = ranking.find((item) => item.produtoId === productId || item.id === productId)
  return found ? toNumber(found.scorePopularidade) : 0
}

function compareByProfitMarginAndPopularity(a, b) {
  if (b.lucro !== a.lucro) return b.lucro - a.lucro
  if (b.margemPercentual !== a.margemPercentual) return b.margemPercentual - a.margemPercentual
  return (b.scorePopularidade || 0) - (a.scorePopularidade || 0)
}

function getHistoricalPriceReference(sales = []) {
  if (!sales.length) return 0

  const ordered = [...sales].sort((a, b) => {
    const dateA = new Date(a.data || 0).getTime()
    const dateB = new Date(b.data || 0).getTime()
    return dateB - dateA
  })

  const recent = ordered.slice(0, Math.min(5, ordered.length))
  const recentAverage = recent.reduce((sum, sale) => sum + toNumber(sale.precoVendido), 0) / recent.length
  const overallAverage = ordered.reduce((sum, sale) => sum + toNumber(sale.precoVendido), 0) / ordered.length

  return roundMoney((recentAverage * 0.6) + (overallAverage * 0.4))
}

function getBehaviorPrice(product, quantity, referencePrice, popularityScore) {
  const item = normalizeProduct(product)
  const minPrice = calcularPrecoMinimo(item.custo, quantity)
  const popularityFactor = popularityScore >= 80 ? 1.04 : popularityScore >= 50 ? 1.02 : 1
  const suggestedPrice = Math.max(minPrice, toNumber(referencePrice) * popularityFactor, item.preco)
  return roundMoney(Math.max(item.custo, suggestedPrice))
}

function getPriceAnchor(product, quantity, priceCandidate, valorCliente) {
  const item = normalizeProduct(product)
  const minPrice = calcularPrecoMinimo(item.custo, quantity)
  const fallbackPrice = item.preco > 0 ? item.preco : minPrice
  const budgetPrice = valorCliente > 0 ? roundMoney(valorCliente / quantity) : 0
  const desiredPrice = budgetPrice > 0 ? budgetPrice : (priceCandidate == null ? fallbackPrice : toNumber(priceCandidate))
  return roundMoney(Math.max(item.custo, desiredPrice))
}

function getMaxSuggestionQuantity(budget, product, quantityBase) {
  const item = normalizeProduct(product)
  if (budget <= 0) return Math.max(1, quantityBase)
  const minPrice = calcularPrecoMinimo(item.custo, 1)
  const unitReference = Math.max(item.custo, minPrice, item.preco || 0.01)
  return Math.max(quantityBase, Math.floor(budget / unitReference) || quantityBase)
}

function getComboDiscount(comboQuantity) {
  if (comboQuantity >= 5) return 0.06
  if (comboQuantity >= 3) return 0.04
  return 0.02
}

function isSuggestionOption(entry) {
  return entry && typeof entry === 'object' && 'precoPropostoTotal' in entry
}

function isComboOption(entry) {
  return entry && typeof entry === 'object' && 'precoCombo' in entry
}

function normalizeBestOptionEntry(entry) {
  if (isSuggestionOption(entry)) return entry
  if (isComboOption(entry)) {
    return {
      ...entry,
      precoPropostoTotal: entry.precoCombo,
      margemPercentual: toNumber(entry.margemPercentual),
      tipo: entry.tipo || 'combo'
    }
  }
  return null
}

function normalizeSaleQuantity(value) {
  const quantity = toNumber(value)
  return quantity > 0 ? quantity : 0
}

export function calcularPrecoMinimo(custo, quantidade = 1) {
  const unitCost = Math.max(0, toNumber(custo))
  const requiredMargin = getRequiredMargin(quantidade)
  const divisor = 1 - requiredMargin
  const minPrice = divisor <= 0 ? unitCost : unitCost / divisor
  return roundMoney(Math.max(unitCost, minPrice))
}

export function analisarProduto(produto, precoProposto = null, quantidade = 1) {
  const item = normalizeProduct(produto)
  const options = normalizeAnalysisOptions(quantidade)
  const qty = options.quantidade
  const proposedUnitPrice = getPriceAnchor(item, qty, precoProposto, options.valorCliente)
  const unitMinPrice = calcularPrecoMinimo(item.custo, qty)
  const totalCost = roundMoney(item.custo * qty)
  const totalPrice = roundMoney(proposedUnitPrice * qty)
  const lucro = roundMoney(totalPrice - totalCost)
  const margem = totalPrice > 0 ? roundMoney(lucro / totalPrice) : 0
  const status = buildStatus(totalPrice, totalCost, unitMinPrice, proposedUnitPrice)

  return {
    ...item,
    quantidade: qty,
    precoProposto: roundMoney(proposedUnitPrice),
    precoPropostoTotal: totalPrice,
    precoMinimo: unitMinPrice,
    precoMinimoTotal: roundMoney(unitMinPrice * qty),
    custoTotal: totalCost,
    lucro,
    margem,
    margemPercentual: roundMoney(margem * 100),
    margemMinimaPercentual: roundMoney(getRequiredMargin(qty) * 100),
    status,
    valorCliente: options.valorCliente,
    podeNegociar: status === 'ok'
  }
}

export function priorizarProdutos(produtos = [], inteligencia = null) {
  return [...produtos]
    .map((produto) => {
      const item = normalizeProduct(produto)
      const scorePopularidade = getPopularityScore(item.id, inteligencia)
      return {
        ...item,
        lucroUnitario: roundMoney(getUnitProfit(item)),
        lucroTotal: roundMoney(getUnitProfit(item)),
        margemPercentual: roundMoney(getUnitMargin(item) * 100),
        scorePopularidade
      }
    })
    .sort((a, b) => {
      if (b.lucroTotal !== a.lucroTotal) return b.lucroTotal - a.lucroTotal
      if (b.margemPercentual !== a.margemPercentual) return b.margemPercentual - a.margemPercentual
      if (b.scorePopularidade !== a.scorePopularidade) return b.scorePopularidade - a.scorePopularidade
      return b.preco - a.preco
    })
}

export function gerarSugestoes(valorCliente, produtos = [], quantidade = 1) {
  const budget = Math.max(0, toNumber(valorCliente))
  const options = normalizeAnalysisOptions(quantidade)
  const baseQuantity = options.quantidade

  return priorizarProdutos(produtos, options.intelligence)
    .map((produto) => {
      let melhorOpcao = null
      const ceiling = getMaxSuggestionQuantity(budget, produto, baseQuantity)

      for (let qty = baseQuantity; qty <= ceiling; qty += 1) {
        const targetPrice = getBehaviorPrice(
          produto,
          qty,
          budget > 0 ? budget / qty : produto.preco,
          getPopularityScore(produto.id, options.intelligence)
        )
        const analiseAtual = analisarProduto(produto, targetPrice, { quantidade: qty, valorCliente: budget })
        if (budget > 0 && analiseAtual.precoPropostoTotal > budget) continue
        if (!melhorOpcao || analiseAtual.lucro > melhorOpcao.lucro || (
          analiseAtual.lucro === melhorOpcao.lucro &&
          analiseAtual.margemPercentual > melhorOpcao.margemPercentual
        )) {
          melhorOpcao = analiseAtual
        }
      }

      return melhorOpcao
    })
    .filter(Boolean)
    .sort(compareByProfitMarginAndPopularity)
}

export function gerarCombosAutomaticos(produtos = [], quantidade = 1) {
  const options = normalizeAnalysisOptions(quantidade)
  const baseQuantity = options.quantidade
  const candidates = priorizarProdutos(produtos, options.intelligence).filter((produto) => produto.preco > 0 && produto.custo > 0)
  const quantities = [2, 3, 5].filter((comboQty, index, list) => comboQty >= baseQuantity && list.indexOf(comboQty) === index)

  return candidates.flatMap((produto) =>
    quantities.map((comboQuantity) => {
      const unitMinPrice = calcularPrecoMinimo(produto.custo, comboQuantity)
      const referenceUnitPrice = getSafeUnitPrice(produto, comboQuantity, produto.preco)
      const originalTotal = roundMoney(referenceUnitPrice * comboQuantity)
      const desconto = getComboDiscount(comboQuantity)
      const comboTotal = roundMoney(Math.max(unitMinPrice * comboQuantity, originalTotal * (1 - desconto)))
      const custoTotal = roundMoney(produto.custo * comboQuantity)
      const lucro = roundMoney(comboTotal - custoTotal)
      const margem = comboTotal > 0 ? roundMoney((lucro / comboTotal) * 100) : 0
      const status = buildStatus(comboTotal, custoTotal, unitMinPrice, roundMoney(comboTotal / comboQuantity))

      return {
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: comboQuantity,
        quantidadeBase: baseQuantity,
        tipo: 'combo',
        titulo: `Leve ${comboQuantity} por ${comboTotal.toFixed(2)}`,
        precoUnitarioBase: roundMoney(referenceUnitPrice),
        precoOriginalTotal: originalTotal,
        precoCombo: comboTotal,
        economia: roundMoney(originalTotal - comboTotal),
        economiaReal: roundMoney(originalTotal - comboTotal),
        lucro,
        margemPercentual: margem,
        scorePopularidade: getPopularityScore(produto.id, options.intelligence),
        status
      }
    })
  )
  .filter((combo) => combo.precoCombo >= roundMoney(combo.quantidade * combo.precoUnitarioBase * (1 - getComboDiscount(combo.quantidade))))
  .sort(compareByProfitMarginAndPopularity)
}

export function obterMelhorOpcao(sugestoes = [], combos = []) {
  return [...sugestoes, ...combos]
    .map(normalizeBestOptionEntry)
    .filter(Boolean)
    .sort(compareByProfitMarginAndPopularity)[0] || null
}

export function aprenderComVendas(historico = [], produtos = []) {
  const productMap = new Map(produtos.map((produto) => {
    const item = normalizeProduct(produto)
    return [item.id, item]
  }))
  const grouped = new Map()

  historico.forEach((venda) => {
    const produtoId = venda?.produtoId
    if (produtoId == null) return

    const current = grouped.get(produtoId) || {
      produtoId,
      quantidadeTotal: 0,
      faturamentoTotal: 0,
      numeroVendas: 0,
      vendas: [],
      ultimaVenda: null
    }

    const quantidade = normalizeSaleQuantity(venda.quantidade)
    if (quantidade <= 0) return
    const precoVendido = Math.max(0, toNumber(venda.precoVendido))
    const date = venda?.data ? new Date(venda.data) : null

    current.quantidadeTotal += quantidade
    current.faturamentoTotal += precoVendido * quantidade
    current.numeroVendas += 1
    current.vendas.push({ ...venda, quantidade, precoVendido, data: date })

    if (!current.ultimaVenda || (date && date > current.ultimaVenda)) {
      current.ultimaVenda = date
    }

    grouped.set(produtoId, current)
  })

  const maxQtd = Math.max(1, ...[...grouped.values()].map((item) => item.quantidadeTotal))
  const now = Date.now()

  const resumoPorProduto = [...grouped.values()]
    .map((item) => {
      const produto = productMap.get(item.produtoId) || { id: item.produtoId, nome: `Produto ${item.produtoId}`, custo: 0, preco: 0 }
      const precoMedio = item.quantidadeTotal > 0
        ? roundMoney(item.faturamentoTotal / item.quantidadeTotal)
        : 0
      const quantidadeMediaPorVenda = item.numeroVendas > 0
        ? Math.max(1, Math.round(item.quantidadeTotal / item.numeroVendas))
        : 1
      const precoMinimo = calcularPrecoMinimo(produto.custo, quantidadeMediaPorVenda)
      const referenciaHistorica = getHistoricalPriceReference(item.vendas)
      const scoreBrutoRecencia = item.ultimaVenda ? Math.max(0, 30 - Math.floor((now - item.ultimaVenda.getTime()) / 86400000)) : 0
      const scorePopularidade = roundMoney((((item.quantidadeTotal / maxQtd) * 0.65) + ((item.numeroVendas / Math.max(1, historico.length)) * 0.2) + ((scoreBrutoRecencia / 30) * 0.15)) * 100)
      const precoIdeal = getBehaviorPrice(produto, quantidadeMediaPorVenda, referenciaHistorica || precoMedio || produto.preco, scorePopularidade)
      const diasSemVenda = item.ultimaVenda ? Math.max(0, Math.floor((now - item.ultimaVenda.getTime()) / 86400000)) : 999

      return {
        produtoId: item.produtoId,
        nome: produto.nome,
        quantidadeTotal: item.quantidadeTotal,
        faturamentoTotal: roundMoney(item.faturamentoTotal),
        precoMedio,
        precoIdeal,
        precoMinimo,
        scorePopularidade,
        ultimaVenda: item.ultimaVenda,
        diasSemVenda,
        numeroVendas: item.numeroVendas,
        vendas: item.numeroVendas
      }
    })
    .sort((a, b) => {
      if (b.scorePopularidade !== a.scorePopularidade) return b.scorePopularidade - a.scorePopularidade
      return b.quantidadeTotal - a.quantidadeTotal
    })

  return {
    maisVendidos: resumoPorProduto.slice(0, 5),
    rankingProdutos: resumoPorProduto,
    scorePopularidade: resumoPorProduto.reduce((acc, item) => {
      acc[item.produtoId] = item.scorePopularidade
      return acc
    }, {})
  }
}
