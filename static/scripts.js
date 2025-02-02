const canvas = document.getElementById('grafico');
const ctx = canvas.getContext('2d');

let roteadores = [];

function desenharGrafico() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    roteadores.forEach(roteador => {
        ctx.beginPath();
        ctx.arc(roteador.x, roteador.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#007bff';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(roteador.nome, roteador.x + 10, roteador.y + 5);
    });
}

function atualizarSelectsRoteadores(data) {
    const origemSelect = document.getElementById('origem');
    const destinoSelect = document.getElementById('destino');
    origemSelect.innerHTML = destinoSelect.innerHTML = '<option value="">Selecione o roteador</option>';

    data.forEach(({ nome }) => {
        const option = new Option(nome, nome);
        origemSelect.appendChild(option.cloneNode(true));
        destinoSelect.appendChild(option);
    });
}

async function carregarInterfaces(nomeRoteador, tipo) {
    try {
        const response = await fetch(`/listar-interfaces/${nomeRoteador}`);
        const data = await response.json();

        const selectInterface = document.getElementById(`${tipo}-interface`);
        selectInterface.innerHTML = '';

        data.forEach(({ nome, ip }) => {
            const option = new Option(`${nome} - ${ip}`, nome);
            selectInterface.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar interfaces:', error);
    }
}

function gerarTabelaRoteamento(tabela) {
    if (!tabela || !Object.keys(tabela).length) return '<p>A tabela de roteamento está vazia.</p>';

    return `
        <table class="tabela-roteamento">
            <thead>
                <tr><th>Destino</th><th>Máscara</th><th>Interface</th><th>Custo</th><th>Próximo Salto</th></tr>
            </thead>
            <tbody>
                ${Object.entries(tabela).map(([destino, { mascara, interface: iface, custo, proximo_salto }]) => `
                    <tr>
                        <td>${destino}</td>
                        <td>${mascara}</td>
                        <td>${iface}</td>
                        <td>${custo}</td>
                        <td>${proximo_salto || 'Direto'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function exibirRoteadores(roteadores) {
    const listaRoteadores = document.getElementById('roteadores-lista');
    listaRoteadores.innerHTML = '';

    roteadores.forEach(({ nome, tabela_roteamento }) => {
        const divRoteador = document.createElement('div');
        divRoteador.innerHTML = `
            <h3>${nome}</h3>
            <h4>Tabela de Roteamento:</h4>
            ${gerarTabelaRoteamento(tabela_roteamento)}
        `;
        listaRoteadores.appendChild(divRoteador);
    });
}


async function carregarRoteadores() {
    try {
        const response = await fetch('/listar-roteadores');
        const data = await response.json();
        exibirRoteadores(data);
        atualizarSelectsRoteadores(data);
    } catch (error) {
        console.error('Erro ao carregar roteadores:', error);
    }
}



document.getElementById('origem').addEventListener('change', (e) => carregarInterfaces(e.target.value, 'origem'));
document.getElementById('destino').addEventListener('change', (e) => carregarInterfaces(e.target.value, 'destino'));

document.getElementById('form-troca-pacotes').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const origem = document.getElementById('origem').value;
    const destinoInterface = document.getElementById('destino-interface').value;
    const destinoNome = document.getElementById('destino').value;
    const roteadorDestino = roteadores.find(r => r.nome === destinoNome);
    const interfaceDestino = roteadorDestino?.interfaces.find(i => i.nome === destinoInterface);
    
    if (!interfaceDestino) return alert('Interface de destino não encontrada');

    try {
        const response = await fetch('/trocar-pacotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origem, ip_destino: interfaceDestino.ip })
        });

        const data = await response.json();
        let mensagem = data.message;
        if (data.caminho) mensagem += `\nCaminho: ${data.caminho.join(' -> ')}\nCusto total: ${data.custo_total}`;
        alert(mensagem);
        carregarRoteadores();
    } catch (error) {
        console.error('Erro ao trocar pacotes:', error);
    }
});

document.getElementById('form-adicionar-roteador').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const nomeList = [...document.querySelectorAll('.nome')].map(input => input.value);
    const ipList = [...document.querySelectorAll('.ip')].map(input => input.value);
    const mascaraList = [...document.querySelectorAll('.mascara')].map(input => input.value);

    try {
        const response = await fetch('/adicionar-roteador', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, nome_interface: nomeList, ip: ipList, mascara: mascaraList })
        });

        const data = await response.json();
        alert(data.message);

        roteadores.push({ nome: data.roteador.nome, x: data.roteador.x, y: data.roteador.y, interfaces: data.roteador.interfaces });
        desenharGrafico();
        carregarRoteadores();
    } catch (error) {
        console.error('Erro ao adicionar roteador:', error);
        alert('Erro ao adicionar roteador: ' + error.message);
    }
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

