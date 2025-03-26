let user = null;
let unidadeSelecionada = null; // Variável para armazenar a unidade filtrada

// Função para filtrar alunos por unidade
function filtrarPorUnidade() {
    unidadeSelecionada = document.getElementById('unidadeSelect').value;
    monitorarAlunos();
}

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            user = userCredential.user;
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('content').style.display = 'block';
            monitorarAlunos(); // Carrega os dados após login
        })
        .catch((error) => {
            document.getElementById('loginError').textContent = "Erro: " + error.message;
        });
}

function logout() {
    firebase.auth().signOut().then(() => {
        user = null;
        alunos = [];
        tabelaAlunosBody.innerHTML = '';
        alert('Logout realizado com sucesso!');
    }).catch((error) => {
        alert('Erro ao fazer logout: ' + error.message);
    });
}

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
const formSyncKhan = document.getElementById('syncKhanPoints');
const alunoSyncKhanSelect = document.getElementById('alunoSyncKhan');
const khanPointsInput = document.getElementById('khanPoints');

formSyncKhan.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = alunoSyncKhanSelect.value;
    const newKhanPoints = parseInt(khanPointsInput.value);

    if (isNaN(newKhanPoints)) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    try {
        const alunoRef = alunosCollection.doc(alunoId);
        const alunoDoc = await alunoRef.get();
        const dados = alunoDoc.data();
        const currentSystemPoints = dados.pontos;
        const delta = newKhanPoints - currentSystemPoints;

        if (delta === 0) {
            alert("Os pontos já estão atualizados.");
            return;
        }

        await alunoRef.update({
            pontosAnteriores: currentSystemPoints,
            pontos: firebase.firestore.FieldValue.increment(delta)
        });

        alert(`Pontos atualizados!\nSaldo anterior: ${currentSystemPoints}\nDiferença: ${delta}\nNovo saldo: ${newKhanPoints}`);
        formSyncKhan.reset();
    } catch (error) {
        alert('Erro ao atualizar pontos: ' + error.message);
    }
});

// Formulário de edição (para o professor adicionar pontos)
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

// Monitoramento dos alunos com filtro de unidade (se definido)
function monitorarAlunos() {
    let query = alunosCollection;
    if (unidadeSelecionada) {
        query = query.where('unidade', '==', unidadeSelecionada);
    }
    query.onSnapshot((snapshot) => {
        alunos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        atualizarLista();
    });
}

// Cadastro de alunos (agora com o campo "unidade")
formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const unidade = document.getElementById('unidadeAluno').value;
    const pontos = parseInt(document.getElementById('pontos').value);

    if (alunos.some(aluno => aluno.nome.toLowerCase() === nome.toLowerCase())) {
        alert('Aluno já cadastrado!');
        return;
    }

    try {
        await alunosCollection.add({
            nome,
            unidade,
            pontos,
            pontosAnteriores: pontos,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        formCadastro.reset();
    } catch (error) {
        alert('Erro ao cadastrar: ' + error.message);
    }
});

// Compra de prêmios (subtrai pontos)
formCompra.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = alunoSelect.value;
    const valor = parseInt(document.getElementById('valorPremio').value);

    try {
        const alunoRef = alunosCollection.doc(alunoId);
        const alunoDoc = await alunoRef.get();
        const dados = alunoDoc.data();

        if (dados.pontos >= valor) {
            await alunoRef.update({
                pontosAnteriores: dados.pontos,
                pontos: firebase.firestore.FieldValue.increment(-valor)
            });
            
            alert(`Compra registrada!\nSaldo anterior: ${dados.pontos}\nValor descontado: ${valor}\nNovo saldo: ${dados.pontos - valor}`);
            formCompra.reset();
        } else {
            alert('Pontos insuficientes!');
        }
    } catch (error) {
        alert('Erro ao atualizar pontos: ' + error.message);
    }
});

// Adicionar pontos (para o professor)
formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = alunoEditarSelect.value;
    let pontosAdicionar = parseInt(novoValorPontosInput.value);

    if (pontosAdicionar <= 0) {
        alert("Informe um número positivo para adicionar pontos.");
        return;
    }

    try {
        const alunoRef = alunosCollection.doc(alunoId);
        const alunoDoc = await alunoRef.get();
        const dados = alunoDoc.data();
        
        await alunoRef.update({
            pontosAnteriores: dados.pontos,
            pontos: firebase.firestore.FieldValue.increment(pontosAdicionar)
        });
        
        alert(`Pontos adicionados!\nSaldo anterior: ${dados.pontos}\nValor adicionado: ${pontosAdicionar}\nNovo saldo: ${dados.pontos + pontosAdicionar}`);
        formEditar.reset();
    } catch (error) {
        alert('Erro ao atualizar pontos: ' + error.message);
    }
});

// Remover aluno
function removerAluno(alunoId) {
    if (confirm("Deseja realmente remover este aluno?")) {
        alunosCollection.doc(alunoId).delete()
            .then(() => alert("Aluno removido com sucesso!"))
            .catch(error => alert("Erro ao remover aluno: " + error.message));
    }
}

// Atualiza a tabela e os selects (incluindo a coluna de unidade)
function atualizarLista() {
    tabelaAlunosBody.innerHTML = alunos.map(aluno => `
        <tr>
            <td>${aluno.nome}</td>
            <td>${aluno.unidade || '-'}</td>
            <td>${aluno.pontosAnteriores || 0}</td>
            <td>${aluno.pontos}</td>
            <td style="text-align: center;"><button onclick="removerAluno('${aluno.id}')">Remover</button></td>
        </tr>
    `).join('');

    const updateSelect = (selectElement) => {
        let alunosFiltrados = alunos;
        if (unidadeSelecionada) {
            alunosFiltrados = alunos.filter(aluno => aluno.unidade === unidadeSelecionada);
        }
        selectElement.innerHTML = alunosFiltrados.map(aluno => `
            <option value="${aluno.id}">${aluno.nome}</option>
        `).join('');
    };

    updateSelect(alunoSelect);
    updateSelect(alunoEditarSelect);
    updateSelect(alunoSyncKhanSelect);
}

window.addEventListener('load', () => {
    if (user) {
        monitorarAlunos();
    }
});

window.addEventListener('beforeunload', (event) => {
    if (user) {
        firebase.auth().signOut();
    }
});

firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(() => {
        console.log("Persistência de autenticação desativada");
    })
    .catch((error) => {
        console.error("Erro ao configurar persistência:", error);
    });
