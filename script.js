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
            monitorarAlunos(); // Carrega os dados após login
        })
        .catch((error) => {
            document.getElementById('loginError').textContent = "Erro: " + error.message;
        });
}

// Função de logout
function logout() {
    firebase.auth().signOut().then(() => {
        user = null;
        alunos = []; // Limpa a lista de alunos
        tabelaAlunosBody.innerHTML = ''; // Limpa a tabela
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

// Sincronização com Khan Academy
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

// Cadastro de alunos
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
            pontosAnteriores: pontos, // Armazena os pontos iniciais
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
// Verifica se o valor informado é positivo para garantir adição
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

// Função para remover aluno
function removerAluno(alunoId) {
    if (confirm("Deseja realmente remover este aluno?")) {
        alunosCollection.doc(alunoId).delete()
            .then(() => alert("Aluno removido com sucesso!"))
            .catch(error => alert("Erro ao remover aluno: " + error.message));
    }
}

// Atualizar a tabela e os selects
function atualizarLista() {
    tabelaAlunosBody.innerHTML = alunos.map(aluno => `
        <tr>
            <td>${aluno.nome}</td>
            <td>${aluno.pontosAnteriores || 0}</td>
            <td>${aluno.pontos}</td>
            <td style="text-align: center;"><button onclick="removerAluno('${aluno.id}')">Remover</button></td>
        </tr>
    `).join('');

    const updateSelect = (selectElement) => {
        selectElement.innerHTML = alunos.map(aluno => `
            <option value="${aluno.id}">${aluno.nome}</option>
        `).join('');
    };

    updateSelect(alunoSelect);
    updateSelect(alunoEditarSelect);
    updateSelect(alunoSyncKhanSelect); // Atualiza o select do sync Khan
}

// Carrega os dados ao iniciar, mas apenas após login
window.addEventListener('load', () => {
    if (user) {
        monitorarAlunos();
    }
});

// Forçar logout ao sair/recarregar a página
window.addEventListener('beforeunload', (event) => {
    if (user) {
        firebase.auth().signOut();
    }
});

// Configurar persistência de sessão como 'none'
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(() => {
        console.log("Persistência de autenticação desativada");
    })
    .catch((error) => {
        console.error("Erro ao configurar persistência:", error);
    });
