from flask import Flask, jsonify, request, render_template
from random import randint
import ipaddress
from datetime import datetime, timedelta

app = Flask(__name__)
roteadores = {}
roteadores.clear()

class InterfaceRede:
    def __init__(self, nome, ip, mascara):
        self.nome = nome
        self.ip = ip
        self.mascara = mascara
        self.status = 'UP'
        self.rede = self._calcular_rede()
    
    def _calcular_rede(self):
        try:
            rede = ipaddress.IPv4Network(f"{self.ip}/{self.mascara}", strict=False)
            return str(rede.network_address)
        except ValueError:
            raise ValueError(f"IP {self.ip} ou máscara {self.mascara} inválidos")

class TabelaDeRoteamento:
    def __init__(self):
        self.rotas = {}
        self.tempo_atualizacao = {}

    def adicionar_rota(self, destino, mascara, interface, custo, proximo_salto=None):
        if custo >= 16:
            return False
            
        self.rotas[destino] = {
            'mascara': mascara,
            'interface': interface,
            'custo': custo,
            'proximo_salto': proximo_salto
        }
        self.tempo_atualizacao[destino] = datetime.now()
        return True

    def remover_rotas_expiradas(self):
        agora = datetime.now()
        rotas_para_remover = []
        
        for destino, timestamp in self.tempo_atualizacao.items():
            if (agora - timestamp) > timedelta(seconds=180):
                rotas_para_remover.append(destino)
        
        for destino in rotas_para_remover:
            del self.rotas[destino]
            del self.tempo_atualizacao[destino]

class Roteador:
    def __init__(self, nome):
        self.nome = nome
        self.interfaces = {}
        self.tabela_roteamento = TabelaDeRoteamento()

    def adicionar_interface(self, nome, ip, mascara):
        try:
            ipaddress.IPv4Address(ip)
            if not (0 <= int(mascara) <= 32):
                raise ValueError("Máscara deve estar entre 0 e 32")
                
            interface = InterfaceRede(nome, ip, mascara)
            self.interfaces[nome] = interface
            return True
        except ValueError as e:
            raise ValueError(f"IP ou máscara inválidos: {str(e)}")

    def verificar_conexao_direta(self, ip_destino):
        try:
            ip_dest = ipaddress.IPv4Address(ip_destino)
            for interface in self.interfaces.values():
                rede = ipaddress.IPv4Network(f"{interface.ip}/{interface.mascara}", strict=False)
                if ip_dest in rede:
                    return True, interface.nome
            return False, None
        except ValueError:
            return False, None
        
    def to_dict(self):
        return {
            'nome': self.nome,
            'interfaces': [
                {'nome': interface.nome, 'ip': interface.ip, 'mascara': interface.mascara}
                for interface in self.interfaces.values()
            ],
            'tabela_roteamento': {
                destino: {
                    'mascara': rota['mascara'],
                    'interface': rota['interface'],
                    'custo': rota['custo'],
                    'proximo_salto': rota['proximo_salto']
                }
                for destino, rota in self.tabela_roteamento.rotas.items()
            }
        }

class ProtocoloRoteamento:
    def atualizar_tabela(self, roteador, roteador_vizinho):
        raise NotImplementedError("Método 'atualizar_tabela' precisa ser implementado pelo protocolo específico.")

class RIP(ProtocoloRoteamento):
    def atualizar_tabela(self, roteador, roteador_vizinho):
        for interface in roteador.interfaces.values():
            rede = ipaddress.IPv4Network(f"{interface.ip}/{interface.mascara}", strict=False)
            roteador.tabela_roteamento.adicionar_rota(
                destino=str(rede.network_address),
                mascara=interface.mascara,
                interface=interface.nome,
                custo=1 
            )
            
        for destino, rota in roteador_vizinho.tabela_roteamento.rotas.items():
            if rota['interface'] == roteador.nome:
                continue
            
            custo_atual = roteador.tabela_roteamento.rotas.get(destino, {}).get('custo', 16)
            novo_custo = rota['custo'] + 1

            if novo_custo < custo_atual and novo_custo < 16:
                interface_conectada = None
                for interface in roteador.interfaces.values():
                    if self._esta_na_mesma_rede(interface, roteador_vizinho):
                        interface_conectada = interface.nome
                        break

                if interface_conectada:
                    roteador.tabela_roteamento.adicionar_rota(
                        destino=destino,
                        mascara=rota['mascara'],
                        interface=interface_conectada,
                        custo=novo_custo,
                        proximo_salto=roteador_vizinho.nome
                    )
    
    def _esta_na_mesma_rede(self, interface1, roteador2):
        try:
            rede1 = ipaddress.IPv4Network(f"{interface1.ip}/{interface1.mascara}", strict=False)
            for interface2 in roteador2.interfaces.values():
                rede2 = ipaddress.IPv4Network(f"{interface2.ip}/{interface2.mascara}", strict=False)
                if rede1.network_address == rede2.network_address:
                    return True
            return False
        except ValueError:
            return False
        
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/adicionar-roteador', methods=['POST'])
def adicionar_roteador():
    try:
        data = request.json
        nome = data.get('nome')
        nomes_interfaces = data.get('nome_interface', [])
        ips = data.get('ip', [])
        mascaras = data.get('mascara', [])
        
        #if nome in roteadores:
        #    return jsonify({'message': 'Roteador com esse nome já existe!'}), 400

        if not nome or not ips or not mascaras:
            return jsonify({'message': 'Nome, IP e Máscara são necessários!'}), 400

        # Validar se IPs já estão em uso
        for ip in ips:
            for r in roteadores.values():
                for i in r.interfaces.values():
                    if i.ip == ip:
                        return jsonify({'message': f'IP {ip} já está em uso!'}), 400

        roteador = Roteador(nome)
        roteador.x = randint(50, 400)
        roteador.y = randint(50, 500)

        for ip, mascara, nome_interface in zip(ips, mascaras, nomes_interfaces):
            try:
                roteador.adicionar_interface(nome=nome_interface, ip=ip, mascara=mascara)
                # Adiciona rota direta
                rede = ipaddress.IPv4Network(f"{ip}/{mascara}", strict=False)
                roteador.tabela_roteamento.adicionar_rota(
                    destino=str(rede.network_address),
                    mascara=mascara,
                    interface=nome_interface,
                    custo=1
                )
            except ValueError as e:
                return jsonify({'message': str(e)}), 400

        roteadores[nome] = roteador
        return jsonify({
            'message': 'Roteador e Interfaces adicionados com sucesso!',
            'roteador': {
                'nome': roteador.nome,
                'x': roteador.x,
                'y': roteador.y,
                'interfaces': [{
                    'nome': nome_interface,
                    'ip': ip,
                    'mascara': mascara
                } for nome_interface, ip, mascara in zip(nomes_interfaces, ips, mascaras)]
            }
        })

    except Exception as e:
        return jsonify({'message': f'Erro interno no servidor: {str(e)}'}), 500

def encontrar_melhor_rota(roteador, ip_destino):
    try:
        melhor_rota = None
        menor_custo = 16
        
        for destino, rota in roteador.tabela_roteamento.rotas.items():
            rede = ipaddress.IPv4Network(f"{destino}/{rota['mascara']}", strict=False)
            if ip_dest in rede:
                if rota['custo'] < menor_custo:
                    menor_custo = rota['custo']
                    melhor_rota = rota

        return melhor_rota
    except ValueError:
        return None

@app.route('/trocar-pacotes', methods=['POST'])
def trocar_pacotes():
    try:
        data = request.json
        origem = data['origem']
        ip_destino = data['ip_destino']
        protocolo_tipo = data.get('protocolo', 'RIP')

        roteador_origem = roteadores.get(origem)
        if not roteador_origem:
            return jsonify({'message': 'Roteador de origem não encontrado!'}), 404

        conexao_direta, interface = roteador_origem.verificar_conexao_direta(ip_destino)
        if conexao_direta:
            return jsonify({
                'message': f'Destino alcançável diretamente pela interface {interface}',
                'rota': 'direta'
            })

        if protocolo_tipo == 'RIP':
            for roteador_vizinho in roteadores.values():
                if roteador_vizinho != roteador_origem:
                    protocolo_rip = RIP()
                    protocolo_rip.atualizar_tabela(roteador_origem, roteador_vizinho)

            melhor_rota = encontrar_melhor_rota(roteador_origem, ip_destino)
            if melhor_rota:
                caminho = [melhor_rota['interface']]
                return jsonify({
                    'message': 'Rota encontrada!',
                    'caminho': caminho,
                    'custo_total': melhor_rota['custo'],
                })
            else:
                return jsonify({'message': 'Destino não alcançável'}), 404

    except Exception as e:
        return jsonify({'message': f'Erro interno no servidor: {str(e)}'}), 500

@app.route('/listar-roteadores', methods=['GET'])
def listar_roteadores():
    roteadores_list = [roteador.to_dict() for roteador in roteadores.values()]
    return jsonify(roteadores_list)

@app.route('/listar-interfaces/<nome_roteador>', methods=['GET'])
def listar_interfaces(nome_roteador):
    roteador = roteadores.get(nome_roteador)
    if not roteador:
        return jsonify({'message': 'Roteador não encontrado!'}), 404
    
    interfaces_json = [
        {'nome': interface.nome, 'ip': interface.ip, 'mascara': interface.mascara}
        for interface in roteador.interfaces.values()
    ]
    
    return jsonify(interfaces_json)

if __name__ == '__main__':
    app.run(port=5016)
