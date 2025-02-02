# Simulador de Protocolo de roteamento

# Descrição do Projeto

Este projeto implementa um simulador de roteamento para redes IPv4 utilizando o protocolo RIP (Routing Information Protocol). Através de uma interface web desenvolvida com Flask, é possível adicionar roteadores, interfaces de rede, e realizar trocas de pacotes entre roteadores, levando em consideração a tabela de roteamento de cada roteador. O simulador é capaz de calcular a melhor rota para um destino e suporta a adição e remoção de rotas automaticamente após um período de 3 minutos.

# Pré-requisitos
Para executar o projeto, você precisará dos seguintes pacotes:

- Python 3.x
- Flask: para o desenvolvimento da aplicação web.
- ipaddress: para manipulação de endereços IPv4 e cálculo de redes.
- datetime: para lidar com a expiração das rotas e a atualização da tabela de roteamento.
Você pode instalar os pacotes necessários com o comando: pip install flask

# Instruções de Instalação
Clone o repositório ou baixe os arquivos do código.
Instale os pacotes necessários (como mencionado acima).
Execute o código com o comando: python app.py

O servidor Flask estará rodando na porta 5016.

Acesse a aplicação no seu navegador via http://127.0.0.1:5016.

# Endpoints da API

GET /listar-roteadores: Lista todos os roteadores cadastrados.

GET /listar-interfaces/<nome_roteador>: Lista todas as interfaces de um roteador específico.

POST /adicionar-roteador: Adiciona um novo roteador com interfaces configuradas.

POST /trocar-pacotes: Realiza a troca de pacotes entre dois roteadores utilizando o protocolo RIP.

# Autoria e Contribuições
Autor: João Victor Amaral de Magalhães Leite




