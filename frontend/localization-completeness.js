(function () {
  'use strict';

  // Dynamic pages create their markup after the base localization pass. Keep this
  // dictionary here so every re-render receives the same language treatment.
  const copy = {
    'Nenhuma posição aberta registrada.': 'No open positions recorded.',
    'Nenhuma posição encerrada registrada.': 'No closed positions recorded.',
    'operação(ões) encerrada(s) no período': 'closed trade(s) in this period',
    'Revisar no Diário →': 'Review in Journal →',
    'Revisar no Diário': 'Review in Journal',
    'Patrimônio.': 'Wealth.',
    'Sua estrutura financeira': 'Your financial structure',
    'Veja quanto você tem, como o capital se movimentou e onde ele está alocado — sem misturar patrimônio, performance e regras de risco.': 'See what you own, how capital moved and where it is allocated — without mixing wealth, performance and risk rules.',
    'Visão Geral': 'Overview',
    'Movimentações': 'Movements',
    'Alocação': 'Allocation',
    'Patrimônio real': 'Real wealth',
    'Saldos reais registrados nas contas': 'Actual balances recorded in your accounts',
    'Equity da estratégia': 'Strategy equity',
    'Não inclui aportes nem retiradas': 'Excludes deposits and withdrawals',
    'Capital disponível': 'Available capital',
    'Capacidade de risco da conta': 'Account risk capacity',
    'Limite atual de 12,50%': 'Current limit: 12.50%',
    'Visão patrimonial': 'Wealth overview',
    'As duas verdades da conta': 'The two truths of your account',
    'Equity da estratégia mede o método. Patrimônio real mede quanto dinheiro existe nas contas. Um não substitui o outro.': 'Strategy equity measures the method. Real wealth measures how much money exists in the accounts. One does not replace the other.',
    'Fluxo financeiro líquido:': 'Net cash flow:',
    'Resultado operacional registrado:': 'Recorded trading result:',
    'Alocação registrada:': 'Recorded allocation:',
    'Exposição atual': 'Current exposure',
    'Capital e risco': 'Capital and risk',
    'Posições reais': 'Real positions',
    'Exposição em andamento': 'Exposure in progress',
    'Capacidade restante': 'Remaining capacity',
    'Independente do patrimônio': 'Independent of wealth',
    'Dentro da política': 'Within policy',
    'Limite de risco atingido': 'Risk limit reached',
    'A Política de Risco continua definindo quanto pode ser exposto.': 'The Risk Policy still defines how much can be exposed.',
    'Revise posições antes de adicionar nova exposição.': 'Review positions before adding new exposure.',
    'Histórico financeiro': 'Financial history',
    'Novo movimento': 'New movement',
    'Este registro altera o patrimônio, mas nunca o desempenho dos trades.': 'This entry changes wealth, never trade performance.',
    'Aportes / retiradas': 'Deposits / withdrawals',
    'Outros': 'Other',
    'Valor': 'Amount',
    'Tipo': 'Type',
    'Aporte': 'Deposit',
    'Retirada': 'Withdrawal',
    'Data': 'Date',
    'Observação': 'Note',
    'Registrar movimentação': 'Record movement',
    'Nenhuma alocação registrada ainda.': 'No allocation recorded yet.',
    'Total alocado': 'Total allocated',
    'Soma das classes registradas': 'Sum of recorded classes',
    'Classes': 'Classes',
    'Divisões do patrimônio': 'Wealth divisions',
    'Meta informada': 'Target entered',
    'Somatório das metas': 'Sum of targets',
    'Distribuição patrimonial': 'Wealth distribution',
    'Alocação atual': 'Current allocation',
    'Editar alocação': 'Edit allocation',
    'Tabela de componentes': 'Component table',
    'Altere os valores, salve a linha e a pizza será recalculada com os dados persistidos.': 'Change values, save the row and the chart will be recalculated from persisted data.',
    'Nome': 'Name',
    'Classe': 'Class',
    'Valor atual': 'Current amount',
    'Meta (%)': 'Target (%)',
    'Salvar': 'Save',
    'Adicionar à alocação': 'Add to allocation',
    'Política operacional': 'Operating policy',
    'Como o risco é decidido': 'How risk is decided',
    'Primeiro avaliamos a qualidade do trade; depois o ciclo de mercado limita a exposição permitida.': 'First we evaluate trade quality; then the market cycle limits permitted exposure.',
    'FÓRMULA CENTRAL': 'CORE FORMULA',
    'Menor entre Grade e perfil × ciclo': 'Lower of Grade and profile × cycle',
    'Perfil ativo': 'Active profile',
    'Define o teto de risco operacional da conta.': 'Sets the account’s operating-risk ceiling.',
    'Perfil aplicado aos novos trades': 'Profile applied to new trades',
    'Perfil disponível para ativação': 'Profile available for activation',
    'Risco inicial': 'Initial risk',
    'Risco em andamento': 'Ongoing risk',
    'Grade & risco-base': 'Grade & base risk',
    'O score da Rubric define a qualidade mínima e o risco-base da operação.': 'The Rubric score defines the minimum quality and base risk of the trade.',
    'Score mínimo': 'Minimum score',
    'Risco-base': 'Base risk',
    'Qualidade do trade · 10 pontos': 'Trade quality · 10 points',
    'Os pesos definem a pontuação de cada critério no Novo trade.': 'Weights define the score for each criterion in New trade.',
    'Total dos pesos': 'Total weights',
    'Configuração válida': 'Valid configuration',
    'Ajuste os pesos para totalizar 10,00': 'Adjust weights to total 10.00',
    'Permissão de mercado': 'Market permission',
    'O ciclo não muda a qualidade do trade; ele reduz ou bloqueia o risco final.': 'The cycle does not change trade quality; it reduces or blocks final risk.',
    'Risco integral liberado': 'Full risk allowed',
    'Redução moderada': 'Moderate reduction',
    'Exposição pela metade': 'Half exposure',
    'Exposição mínima': 'Minimum exposure',
    'Nenhum risco liberado': 'No risk allowed',
    'Peel-off matemático:': 'Mathematical peel-off:',
    'se o risco ou a volatilidade em andamento ultrapassarem o alarme do perfil, o sistema sugere apenas a redução necessária para voltar ao limite.': 'if ongoing risk or volatility exceeds the profile alarm, the system suggests only the reduction needed to return to the limit.',
    'MANTER': 'MAINTAIN',
    'REDUZIR': 'REDUCE',
    'BLOQUEAR': 'BLOCK',
    'Nenhuma redução necessária.': 'No reduction needed.',
    'Risco agregado em aberto': 'Open aggregate risk',
    'permitido': 'allowed',
    'Ação recomendada pelo modelo:': 'Model recommendation:',
    'Controle atual': 'Current control',
    'Posições que compõem o Heat': 'Positions that make up Heat',
    'Nenhuma posição real aberta': 'No real position open',
    'O Heat será calculado quando houver risco até o stop.': 'Heat will be calculated when there is risk to the stop.',
    'Peel necessário': 'Required peel',
    'Redução proporcional calculada pela fórmula da política': 'Proportional reduction calculated by the policy formula',
    'Diversifique': 'Diversify',
    'Entre mercados para ajudar no Portfolio Risk': 'Across markets to support Portfolio Risk',
    'Trading não é ON/OFF.': 'Trading is not ON/OFF.',
    'É um jogo de posicionamento inteligente de risco. O contexto não elimina automaticamente um trade excepcional; ele ajuda a decidir quanto risco faz sentido assumir.': 'It is a game of intelligent risk positioning. Context does not automatically eliminate an exceptional trade; it helps decide how much risk makes sense.',
    'Mede a qualidade da oportunidade e as probabilidades alinhadas.': 'Measures opportunity quality and aligned probabilities.',
    'Transforma essa qualidade em exposição, respeitando risco, ATR e capital.': 'Turns that quality into exposure while respecting risk, ATR and capital.',
    'Controla o risco agregado se todas as posições abertas forem até os stops.': 'Controls aggregate risk if every open position reaches its stop.',
    'Mentalidade correta de risco · anti medo': 'The right risk mindset · anti-fear',
    'Aceite o risco antes.': 'Accept the risk first.',
    'Empilhe probabilidades → dimensione o risco → aceite o risco → deixe o sistema trabalhar.': 'Stack probabilities → size risk → accept risk → let the system work.',
    'Controle de risco do portfólio': 'Portfolio risk control',
    'Antes de assumir ou aumentar exposição: se todas as posições abertas forem aos stops, este é um risco que você consegue aceitar com tranquilidade?': 'Before taking or increasing exposure: if every open position reaches its stop, is this a risk you can accept calmly?',
    'aceite conscientemente o risco antes de deixar o sistema trabalhar.': 'consciously accept risk before letting the system work.'
  };

  const original = new WeakMap();
  const attributeOriginal = new WeakMap();
  const translate = (value) => {
    let result = String(value || '');
    if (copy[result]) return copy[result];
    if (typeof window.translateString === 'function') result = window.translateString(result, 'en-US');
    Object.entries(copy).sort((a, b) => b[0].length - a[0].length).forEach(([pt, en]) => {
      result = result.replaceAll(pt, en);
    });
    result = result.replace(/(\d+) operação\(ões\) encerrada\(s\) no período/g, '$1 closed trades in this period');
    result = result.replace(/(\d+) posição\(ões\)/g, '$1 position(s)');
    return result;
  };

  function completeLocalization() {
    const english = window.appLanguage === 'en-US';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement && !['SCRIPT', 'STYLE'].includes(node.parentElement.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!original.has(node)) original.set(node, node.nodeValue);
      const source = original.get(node);
      const next = english ? translate(source) : source;
      if (node.nodeValue !== next) node.nodeValue = next;
    });
    document.querySelectorAll('[placeholder],[aria-label],[title]').forEach((element) => {
      ['placeholder', 'aria-label', 'title'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        if (!attributeOriginal.has(element)) attributeOriginal.set(element, {});
        const values = attributeOriginal.get(element);
        if (!(attribute in values)) values[attribute] = element.getAttribute(attribute);
        const next = english ? translate(values[attribute]) : values[attribute];
        if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
      });
    });
  }

  let pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      completeLocalization();
    });
  }

  window.completeLocalization = schedule;
  const initialApply = window.applyLanguage;
  if (typeof initialApply === 'function') {
    window.applyLanguage = function (...args) {
      const result = initialApply.apply(this, args);
      schedule();
      return result;
    };
  }
  const initialGo = window.go;
  if (typeof initialGo === 'function') {
    window.go = function (...args) {
      const result = initialGo.apply(this, args);
      schedule();
      return result;
    };
  }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  schedule();
}());
