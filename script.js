let user = null;
let unidadeSelecionada = null;

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
            monitorarAlunos();
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

const formCadastro = document.getElementById('cadastroAluno');
const formCompra = document.getElementById('compraPremio');
const tabelaAlunosBody = document.querySelector('#tabelaAlunos tbody');
const alunoSelect = document.getElementById('alunoSelect');
const formSyncKhan = document.getElementById('syncKhanPoints');
const alunoSyncKhanSelect = document.getElementById('alunoSyncKhan');
const khanPointsInput = document.getElementById('khanPoints');

// Sincronização com Khan Academy
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
        const currentKhanPoints = dados.pontosUltimaAtualizacao || 0;

        await alunoRef.update({
            pontosUltimaAtualizacao: newKhanPoints
        });

        const saldoAtual = newKhanPoints - (dados.totalCompras || 0);
        alert(`Pontos atualizados!\nÚltima atualização: ${newKhanPoints}\nSaldo atual: ${saldoAtual}`);
        formSyncKhan.reset();
    } catch (error) {
        alert('Erro ao atualizar pontos: ' + error.message);
    }
});

// Formulário de atualização manual de pontos
const formEdicao = `
  <h2>Atualizar Pontos Manualmente</h2>
  <form id="editarPontos">
    <select id="alunoEditar" required></select>
    <input type="number" id="novoValorPontos" placeholder="Nova pontuação" required>
    <button type="submit">Atualizar Pontos</button>
  </form>
`;
document.querySelector('#tabelaAlunos').insertAdjacentHTML('afterend', formEdicao);

const formEditar = document.getElementById('editarPontos');
const alunoEditarSelect = document.getElementById('alunoEditar');
const novoValorPontosInput = document.getElementById('novoValorPontos');

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
            pontosUltimaAtualizacao: pontos,
            totalCompras: 0,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        formCadastro.reset();
    } catch (error) {
        alert('Erro ao cadastrar: ' + error.message);
    }
});

formCompra.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = alunoSelect.value;
    const valor = parseInt(document.getElementById('valorPremio').value);

    try {
        const alunoRef = alunosCollection.doc(alunoId);
        const alunoDoc = await alunoRef.get();
        const dados = alunoDoc.data();
        const saldoAtual = (dados.pontosUltimaAtualizacao || 0) - (dados.totalCompras || 0);

        if (saldoAtual >= valor) {
            await alunoRef.update({
                totalCompras: firebase.firestore.FieldValue.increment(valor)
            });
            
            const novoSaldo = (dados.pontosUltimaAtualizacao || 0) - (dados.totalCompras + valor);
            alert(`Compra registrada!\nSaldo anterior: ${saldoAtual}\nValor descontado: ${valor}\nNovo saldo: ${novoSaldo}`);
            formCompra.reset();
        } else {
            alert('Saldo insuficiente!');
        }
    } catch (error) {
        alert('Erro ao atualizar pontos: ' + error.message);
    }
});

formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alunoId = alunoEditarSelect.value;
    const novaPontuacao = parseInt(novoValorPontosInput.value);

    if (isNaN(novaPontuacao)) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    try {
        const alunoRef = alunosCollection.doc(alunoId);
        await alunoRef.update({
            pontosUltimaAtualizacao: novaPontuacao
        });
        
        alert(`Pontuação atualizada para ${novaPontuacao}!`);
        formEditar.reset();
    } catch (error) {
        alert('Erro ao atualizar pontos: ' + error.message);
    }
});

function removerAluno(alunoId) {
    if (confirm("Deseja realmente remover este aluno?")) {
        alunosCollection.doc(alunoId).delete()
            .then(() => alert("Aluno removido com sucesso!"))
            .catch(error => alert("Erro ao remover aluno: " + error.message));
    }
}

function atualizarLista() {
    tabelaAlunosBody.innerHTML = alunos.map(aluno => `
        <tr>
            <td>${aluno.nome}</td>
            <td>${aluno.unidade || '-'}</td>
            <td>${aluno.pontosUltimaAtualizacao || 0}</td>
            <td>${aluno.totalCompras || 0}</td>
            <td>${(aluno.pontosUltimaAtualizacao || 0) - (aluno.totalCompras || 0)}</td>
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
    if (user) monitorarAlunos();
});

window.addEventListener('beforeunload', () => {
    if (user) firebase.auth().signOut();
});

firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(() => console.log("Persistência de autenticação desativada"))
    .catch((error) => console.error("Erro ao configurar persistência:", error));
