<template>
  <div>
    <div class="tab-hdr">
      <div class="tab-hdr-top">
        <h2 class="tab-title"><i class="fas fa-chart-line"></i> Inteligência de Vendas</h2>
        <div class="tab-actions">
          <button class="btn btn-secondary btn-sm" @click="s.setTab('painel')">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </div>
      <div class="hint">Analise preços mínimos, oportunidades de negociação, alternativas mais lucrativas e combos automáticos.</div>
    </div>

    <section class="tab-content">
      <div v-if="s.loading" class="loading-box"><div class="spinner spinner-sm"></div></div>

      <template v-else>
        <div class="sheet-card">
          <div class="sheet-body">
            <div class="section-label">Produto Desejado</div>

            <div class="fg">
              <label class="label">Produto</label>
              <select v-model="produtoSelecionadoId" class="input">
                <option disabled value="">Selecione um produto</option>
                <option v-for="produto in produtosOrdenados" :key="produto.id" :value="produto.id">
                  {{ produto.nome }}
                </option>
              </select>
            </div>

            <div class="grid-2">
              <div class="fg">
                <label class="label">Quantidade</label>
                <input v-model.number="quantidade" class="input" type="number" min="1" step="1" />
              </div>
              <div class="fg">
                <label class="label">Valor do cliente</label>
                <div class="input-with-prefix">
                  <span class="input-prefix">R$</span>
                  <input
                    :value="maskMoney(valorCliente)"
                    @input="evento => valorCliente = parseMoney(evento.target.value)"
                    class="input input-prefixed"
                    type="text"
                    inputmode="numeric"
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div class="fg">
              <label class="label">Preço proposto</label>
              <div class="input-with-prefix">
                <span class="input-prefix">R$</span>
                <input
                  :value="maskMoney(precoProposto)"
                  @input="evento => precoProposto = parseMoney(evento.target.value)"
                  class="input input-prefixed"
                  type="text"
                  inputmode="numeric"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="sheet-card mt-16">
          <div class="sheet-body">
            <div class="section-label">Diagnóstico</div>
            <div v-if="analiseProduto" class="list-row">
              <div class="row-info">
                <div class="row-name">{{ analiseProduto.nome }}</div>
                <div class="row-sub">
                  <span>Preço mínimo: {{ R$(analiseProduto.precoMinimo) }}</span>
                  <span>•</span>
                  <span>Custo total: {{ R$(analiseProduto.custoTotal) }}</span>
                </div>
                <div class="row-sub">
                  <span>Lucro: {{ R$(analiseProduto.lucro) }}</span>
                  <span>•</span>
                  <span>Margem: {{ analiseProduto.margemPercentual.toFixed(2) }}%</span>
                </div>
              </div>
              <div class="row-right">
                <span class="badge" :class="statusBadgeClass">{{ statusLabel }}</span>
              </div>
            </div>
            <div v-else class="hint">Cadastre produtos finais com custo e preço para começar.</div>
          </div>
        </div>

        <div class="sheet-card mt-16">
          <div class="sheet-body">
            <div class="section-label">Alternativas Mais Lucrativas</div>
            <div v-if="sugestoesAlternativas.length">
              <div v-for="item in sugestoesAlternativas" :key="`${item.id}-${item.quantidade}`" class="list-row">
                <div class="row-info">
                  <div class="row-name">{{ item.nome }}</div>
                  <div class="row-sub">
                    <span>{{ item.quantidade }} un</span>
                    <span>•</span>
                    <span>Total: {{ R$(item.precoPropostoTotal) }}</span>
                  </div>
                  <div class="row-sub">
                    <span>Lucro: {{ R$(item.lucro) }}</span>
                    <span>•</span>
                    <span>Margem: {{ item.margemPercentual.toFixed(2) }}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="hint">Nenhuma alternativa encontrada dentro do valor informado.</div>
          </div>
        </div>

        <div class="sheet-card mt-16">
          <div class="sheet-body">
            <div class="section-label">Combos Automáticos</div>
            <div v-if="combosVisiveis.length">
              <div v-for="combo in combosVisiveis" :key="`${combo.produtoId}-${combo.quantidade}`" class="list-row">
                <div class="row-info">
                  <div class="row-name">{{ combo.nome }}</div>
                  <div class="row-sub">
                    <span>{{ combo.titulo }}</span>
                    <span>•</span>
                    <span>Economia: {{ R$(combo.economia) }}</span>
                  </div>
                  <div class="row-sub">
                    <span>Lucro: {{ R$(combo.lucro) }}</span>
                    <span>•</span>
                    <span>Margem: {{ combo.margemPercentual.toFixed(2) }}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="hint">Nenhum combo disponível com os produtos atuais.</div>
          </div>
        </div>

        <div class="sheet-card mt-16">
          <div class="sheet-body">
            <div class="section-label">Aprendizado com Vendas</div>
            <div v-if="inteligencia.rankingProdutos.length">
              <div v-for="item in inteligencia.rankingProdutos.slice(0, 5)" :key="item.produtoId" class="list-row">
                <div class="row-info">
                  <div class="row-name">{{ item.nome }}</div>
                  <div class="row-sub">
                    <span>{{ item.quantidadeTotal }} un vendidas</span>
                    <span>•</span>
                    <span>Preço ideal: {{ R$(item.precoIdeal) }}</span>
                  </div>
                  <div class="row-sub">
                    <span>Preço médio: {{ R$(item.precoMedio) }}</span>
                    <span>•</span>
                    <span>{{ item.vendas }} vendas</span>
                  </div>
                </div>
                <div class="row-right">
                  <span class="badge badge-blue">{{ item.scorePopularidade.toFixed(0) }} pts</span>
                </div>
              </div>
            </div>
            <div v-else class="hint">Ainda não há histórico suficiente para aprendizado.</div>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from '../store.js'
import { R$, maskMoney, parseMoney } from '../utils.js'
import {
  analisarProduto,
  aprenderComVendas,
  gerarCombosAutomaticos,
  gerarSugestoes,
  priorizarProdutos
} from '../modules/salesIntelligence.js'

const s = useStore()
const quantidade = ref(1)
const valorCliente = ref(0)
const produtoSelecionadoId = ref('')
const precoProposto = ref(0)

const produtosInteligencia = computed(() =>
  s.receitas
    .filter(r => !r.eh_intermediaria)
    .map(r => ({
      id: r.uuid,
      nome: r.nome,
      custo: s.getCustoTotal(r) / (r.rendimento || 1),
      preco: r.preco_sugerido || 0
    }))
    .filter(produto => produto.custo > 0 && produto.preco > 0)
)

const produtosOrdenados = computed(() => priorizarProdutos(produtosInteligencia.value))

watch(produtosOrdenados, (lista) => {
  if (!lista.length) {
    produtoSelecionadoId.value = ''
    precoProposto.value = 0
    return
  }

  const atual = lista.find(item => item.id === produtoSelecionadoId.value)
  const produtoBase = atual || lista[0]
  produtoSelecionadoId.value = produtoBase.id
  if (!precoProposto.value) precoProposto.value = produtoBase.preco
}, { immediate: true })

const produtoSelecionado = computed(() =>
  produtosInteligencia.value.find(item => item.id === produtoSelecionadoId.value) || null
)

watch(produtoSelecionado, (produto) => {
  if (!produto) return
  precoProposto.value = produto.preco
}, { immediate: true })

const analiseProduto = computed(() => {
  if (!produtoSelecionado.value) return null
  return analisarProduto(produtoSelecionado.value, precoProposto.value || produtoSelecionado.value.preco, quantidade.value)
})

const historicoVendas = computed(() =>
  s.producoes
    .filter(p => {
      const receita = s.receitas.find(r => r.uuid === p.receita_id)
      return receita && !receita.eh_intermediaria
    })
    .map(p => {
      const receita = s.receitas.find(r => r.uuid === p.receita_id)
      return {
        produtoId: p.receita_id,
        quantidade: p.quantidade_produzida || 0,
        precoVendido: receita?.preco_sugerido || 0,
        data: p.data_producao
      }
    })
)

const inteligencia = computed(() =>
  aprenderComVendas(historicoVendas.value, produtosInteligencia.value)
)

const sugestoesAlternativas = computed(() =>
  gerarSugestoes(valorCliente.value, produtosInteligencia.value)
    .filter(item => item.id !== produtoSelecionadoId.value)
    .slice(0, 5)
)

const combosVisiveis = computed(() => {
  const combos = gerarCombosAutomaticos(produtosInteligencia.value)
  if (valorCliente.value > 0) {
    return combos.filter(combo => combo.precoCombo <= valorCliente.value).slice(0, 5)
  }
  return combos.slice(0, 5)
})

const statusLabel = computed(() => {
  if (!analiseProduto.value) return ''
  if (analiseProduto.value.status === 'ok') return 'Saudável'
  if (analiseProduto.value.status === 'abaixo_do_minimo') return 'Margem baixa'
  return 'Prejuízo'
})

const statusBadgeClass = computed(() => {
  if (!analiseProduto.value) return 'badge-muted'
  if (analiseProduto.value.status === 'ok') return 'badge-green'
  if (analiseProduto.value.status === 'abaixo_do_minimo') return 'badge-orange'
  return 'badge-red'
})
</script>
