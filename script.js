let alunos = [];
const alunosCollection = db.collection('alunos');

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

// Função para carregar e monitorar dados em tempo real
function monitorarAlunos() {
  alunosCollection.onSnapshot((snapshot) => {
    alunos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    atualizarLista();
  });
}

// Evento de cadastro de alunos
formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const pontos = parseInt(document.getElementById('pontos').value);

  if (alunos.some(aluno => aluno.nome.toLowerCase() === nome.toLowerCase())) {
    alert('Aluno já cadastrado!');
    return;
  }

  try {
    await alunosCollection.add({
      nome,
      pontos,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    formCadastro.reset();
  } catch (error) {
    alert('Erro ao cadastrar: ' + error.message);
  }
});

// Evento de compra de prêmios
formCompra.addEventListener('submit', async (e) => {
  e.preventDefault();
  const aluno = alunos[alunoSelect.selectedIndex];
  const valor = parseInt(document.getElementById('valorPremio').value);

  if (aluno.pontos >= valor) {
    try {
      await alunosCollection.doc(aluno.id).update({
        pontos: aluno.pontos - valor
      });
      formCompra.reset();
    } catch (error) {
      alert('Erro ao atualizar pontos: ' + error.message);
    }
  } else {
    alert('Pontos insuficientes!');
  }
});

// Evento para atualizar os pontos
formEditar.addEventListener('submit', async (e) => {
  e.preventDefault();
  const aluno = alunos[alunoEditarSelect.selectedIndex];
  const novoValor = parseInt(novoValorPontosInput.value);

  try {
    await alunosCollection.doc(aluno.id).update({
      pontos: novoValor
    });
    formEditar.reset();
  } catch (error) {
    alert('Erro ao atualizar pontos: ' + error.message);
  }
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
window.addEventListener('load', () => {
  monitorarAlunos();
});
