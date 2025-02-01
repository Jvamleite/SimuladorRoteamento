const canvas = document.getElementById('grafico');
const ctx = canvas.getContext('2d');

let roteadores = [];
const conexoes = [];

function desenharGrafico() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    conexoes.forEach(conexao => {
        ctx.beginPath();
        ctx.moveTo(conexao.origem.x, conexao.origem.y);
        ctx.lineTo(conexao.destino.x, conexao.destino.y);
        ctx.strokeStyle = '#000';
        ctx.stroke();
    });

    roteadores.forEach(roteador => {
        ctx.beginPath();
        ctx.arc(roteador.x, roteador.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#007bff';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(roteador.nome, roteador.x + 10, roteador.y + 5);
    });
}

document.getElementById('form-troca-pacotes').addEventListener('submit', function (e) {
    e.preventDefault();
    
    const origem = document.getElementById('origem').value;
    const destinoInterface = document.getElementById('destino-interface').value;
    
    const roteadorDestino = roteadores.find(r => r.nome === document.getElementById('destino').value);
    const interfaceDestino = roteadorDestino?.interfaces.find(i => i.nome === destinoInterface);
    
    if (!interfaceDestino) {
        alert('Interface de destino não encontrada');
        return;
    }

    const dados = {
        origem,
        ip_destino: interfaceDestino.ip 
    };

    fetch('/trocar-pacotes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    })
    .then(response => response.json())
    .then(data => {
        let mensagem = data.message;
        if (data.caminho) {
            mensagem += `\nCaminho: ${data.caminho.join(' -> ')}\nCusto total: ${data.custo_total}`;
        }
        alert(mensagem);
        carregarRoteadores()
    })
    .catch(error => {
        console.error('Erro ao trocar pacotes:', error);
    });
});

function carregarRoteadores() {
    fetch('/listar-roteadores')
        .then(response => response.json())
        .then(data => {
            exibirRoteadores(data);
            const origemSelect = document.getElementById('origem');
            const destinoSelect = document.getElementById('destino');
            origemSelect.innerHTML = '<option value="">Selecione o roteador</option>';
            destinoSelect.innerHTML = '<option value="">Selecione o roteador</option>';
            data.forEach(roteador => {
                const optionOrigem = document.createElement('option');
                optionOrigem.value = roteador.nome;
                optionOrigem.textContent = roteador.nome;
                origemSelect.appendChild(optionOrigem);

                const optionDestino = document.createElement('option');
                optionDestino.value = roteador.nome;
                optionDestino.textContent = roteador.nome;
                destinoSelect.appendChild(optionDestino);
            });
            
        })
        .catch(error => console.error('Erro ao carregar roteadores:', error));
}

document.getElementById('origem').addEventListener('change', (e) => {
    carregarInterfaces(e.target.value, 'origem');
});
document.getElementById('destino').addEventListener('change', (e) => {
    carregarInterfaces(e.target.value, 'destino');
});

function carregarInterfaces(nomeRoteador, tipo) {
    fetch(`/listar-interfaces/${nomeRoteador}`)
        .then(response => response.json())
        .then(data => {
            const selectInterface = document.getElementById(`${tipo}-interface`);
            
            selectInterface.innerHTML = '';
            
            data.forEach(interfaceRede => {
                let optionOrigem = document.createElement('option');
                optionOrigem.value = interfaceRede.nome;
                optionOrigem.textContent = `${interfaceRede.nome} - ${interfaceRede.ip}`;
                selectInterface.appendChild(optionOrigem);
            });
        })
        .catch(error => console.error('Erro ao carregar interfaces:', error));
}

function exibirRoteadores(r) {
    const listaRoteadores = document.getElementById('roteadores-lista');
    listaRoteadores.innerHTML = '';

    r.forEach(roteador => {
        const divRoteador = document.createElement('div');
        divRoteador.innerHTML = `
        <h3>${roteador.nome}</h3>
        <h4>Tabela de Roteamento:</h4>
        ${roteador.tabela_roteamento && Object.keys(roteador.tabela_roteamento).length > 0 ? `
            <table class="tabela-roteamento">
                <thead>
                    <tr>
                        <th>Destino</th>
                        <th>Máscara</th>
                        <th>Interface</th>
                        <th>Custo</th>
                        <th>Próximo Salto</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(roteador.tabela_roteamento).map(([destino, rota]) => `
                        <tr>
                            <td>${destino}</td>
                            <td>${rota.mascara}</td>
                            <td>${rota.interface}</td>
                            <td>${rota.custo}</td>
                            <td>${rota.proximo_salto || 'Direto'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>A tabela de roteamento está vazia.</p>'}
    `;
        listaRoteadores.appendChild(divRoteador);
    });
}

document.getElementById('form-adicionar-roteador').addEventListener('submit', function (e) {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const ipList = [];
    const mascaraList = [];
    const nomeList = [];

    document.querySelectorAll('.nome').forEach(input => nomeList.push(input.value));
    document.querySelectorAll('.ip').forEach(input => ipList.push(input.value));
    document.querySelectorAll('.mascara').forEach(input => mascaraList.push(input.value));

    const dados = {
        nome: nome,
        nome_interface: nomeList,
        ip: ipList,
        mascara: mascaraList
    };

    fetch('/adicionar-roteador', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);

        const novoRoteador = {
            nome: data.roteador.nome,
            x: data.roteador.x,
            y: data.roteador.y,
            interfaces: data.roteador.interfaces
        };

        roteadores.push(novoRoteador);
        desenharGrafico();
        carregarRoteadores();
    })
    .catch(error => {
        console.error('Erro ao adicionar roteador:', error);
        alert('Erro ao adicionar roteador: ' + error.message);
    });
});

document.getElementById('adicionar-interface').addEventListener('click', function () {
    const interfaceItem = document.createElement('div');
    interfaceItem.classList.add('interface-item');
    interfaceItem.innerHTML = `
        <label for="nome">Nome da Interface:</label>
        <input type="text" class="nome" name="nome" required><br><br>
        
        <label for="ip">Endereço IP da Interface:</label>
        <input type="text" class="ip" name="ip[]" required><br><br>

        <label for="mascara">Máscara da Interface:</label>
        <input type="text" class="mascara" name="mascara[]" required><br><br>
    `;
    document.getElementById('interfaces-list').appendChild(interfaceItem);
});

function atualizarTabelas() {
    carregarRoteadores();
    setTimeout(atualizarTabelas, 30000);
}

//atualizarTabelas();
