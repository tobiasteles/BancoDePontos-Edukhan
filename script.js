const alunos = JSON.parse(localStorage.getItem('alunos')) || [];

// Elementos do DOM
const formCadastro = document.getElementById('cadastroAluno');
const formCompra = document.getElementById('compraPremio');
const tabelaAlunosBody = document.querySelector('#tabelaAlunos tbody');
const alunoSelect = document.getElementById('alunoSelect');

// Insere o formulário de edição após a tabela de alunos
const formEdicao = `
  <h2>Gerenciar Pontos</h2>
  <form id="editarPontos">
    <select id="alunoEditar" required></select>
    <input type="number" id="novoValorPontos" placeholder="Novo valor dos pontos" required>
    <button type="submit">Atualizar Pontos</button>
  </form>
`;
document.querySelector('#tabelaAlunos').insertAdjacentHTML('afterend', formEdicao);

const formEditar = document.getElementById('editarPontos');
const alunoEditarSelect = document.getElementById('alunoEditar');
const novoValorPontosInput = document.getElementById('novoValorPontos');

// Função para salvar os dados no localStorage
function salvarLocalStorage() {
  localStorage.setItem('alunos', JSON.stringify(alunos));
}

// Evento de cadastro de alunos
formCadastro.addEventListener('submit', (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const pontos = parseInt(document.getElementById('pontos').value);
  if (alunos.some(aluno => aluno.nome.toLowerCase() === nome.toLowerCase())) {
    alert('Aluno já cadastrado!');
    return;
  }
  alunos.push({ nome, pontos });
  atualizarLista();
  salvarLocalStorage();
  formCadastro.reset();
});

// Evento de compra de prêmios
formCompra.addEventListener('submit', (e) => {
  e.preventDefault();
  const indice = alunoSelect.selectedIndex;
  const valor = parseInt(document.getElementById('valorPremio').value);
  if (alunos[indice].pontos >= valor) {
    alunos[indice].pontos -= valor;
    atualizarLista();
    salvarLocalStorage();
    formCompra.reset();
  } else {
    alert('Pontos insuficientes!');
  }
});

// Evento para atualizar os pontos (substituir valor)
formEditar.addEventListener('submit', (e) => {
  e.preventDefault();
  const indice = alunoEditarSelect.selectedIndex;
  const novoValor = parseInt(novoValorPontosInput.value);
  if (isNaN(novoValor)) {
    alert('Valor inválido!');
    return;
  }
  alunos[indice].pontos = novoValor;
  atualizarLista();
  salvarLocalStorage();
  formEditar.reset();
});

// Função para atualizar a tabela e os selects
function atualizarLista() {
  tabelaAlunosBody.innerHTML = alunos.map(aluno => `
    <tr>
      <td>${aluno.nome}</td>
      <td>${aluno.pontos}</td>
    </tr>
  `).join('');

  const updateSelect = (selectElement) => {
    selectElement.innerHTML = alunos.map((aluno, index) => `
      <option value="${index}">${aluno.nome}</option>
    `).join('');
  };

  updateSelect(alunoSelect);
  updateSelect(alunoEditarSelect);
}

// Carrega os dados ao iniciar
window.addEventListener('load', atualizarLista);
