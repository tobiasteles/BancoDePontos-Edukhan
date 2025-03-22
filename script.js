let user = null;

// Função de login
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            user = userCredential.user;
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('content').style.display = 'block';
            monitorarAlunos(); // Só carrega os dados após o login
        })
        .catch((error) => {
            document.getElementById('loginError').textContent = "Erro: " + error.message;
        });
}

// Verifica se o usuário já está logado ao recarregar a página
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        monitorarAlunos();
    } else {
        document.getElementById('loginContainer').style.display = 'block';
        document.getElementById('content').style.display = 'none';
    }
});

firebase.auth().signInAnonymously()
    .then(() => console.log("Usuário autenticado"))
    .catch(error => console.error("Erro na autenticação: ", error));

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
    <input type="number" id="novoValorPontos" placeholder="Adicionar pontos" required>
    <button type="submit">Adicionar Pontos</button>
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

// Evento para ADICIONAR pontos (em vez de substituir)
formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = alunoEditarSelect.value;
    const aluno = alunos.find(a => a.id === alunoId);
    const pontosAdicionar = parseInt(novoValorPontosInput.value);

    try {
        await alunosCollection.doc(aluno.id).update({
            pontos: firebase.firestore.FieldValue.increment(pontosAdicionar)
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
            <option value="${aluno.id}">${aluno.nome}</option>
        `).join('');
    };

    updateSelect(alunoSelect);
    updateSelect(alunoEditarSelect);
}

// Carrega os dados ao iniciar, mas apenas após login
window.addEventListener('load', () => {
    if (user) {
        monitorarAlunos();
    }
});
