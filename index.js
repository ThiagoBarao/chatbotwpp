const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const respostas = require('./messages.json');

const client = new Client({ authStrategy: new LocalAuth() });
const estadosUsuarios = {}; // Armazena o estado de cada usuário

client.on('ready', () => console.log('Client is ready!'));
client.on('qr', qr => qrcode.generate(qr, { small: true }));

const isNumber = message => /^\d+$/.test(message);

// Função para verificar inatividade
const verificarInatividade = (chatId) => {
    const { inicioConversa } = estadosUsuarios[chatId];
    const tempoPassado = Date.now() - inicioConversa;

    if (tempoPassado > 1 * 60 * 1000) { // 1 minuto
        client.sendMessage(chatId, "Conversa finalizada devido à inatividade.");
        delete estadosUsuarios[chatId]; // Remove o estado do usuário
    }
};

client.on('message', async message => {
    const chatId = message.from;
    const ultimaMensagem = message.body;

    // Inicializa o estado do usuário se for a primeira mensagem
    if (!estadosUsuarios[chatId]) {
        estadosUsuarios[chatId] = { setorEscolhido: null, inicioConversa: Date.now() };
        client.sendMessage(chatId, respostas.mensagemPadrao);
        return;
    }

    // Atualiza o tempo de início da conversa
    estadosUsuarios[chatId].inicioConversa = Date.now();

    // Verifica se a conversa já foi finalizada
    if (!estadosUsuarios[chatId]) return;

    // Verificando inatividade
    verificarInatividade(chatId);

    const { setorEscolhido } = estadosUsuarios[chatId];

    // Definindo setores
    const setores = {
        '1': 'Atendimento_1',
        '2': 'Comercial_2',
        '3': 'Secretaria_3',
        '4': 'Coordenacoes_4_5',
        '5': 'Coordenacoes_4_5',
        '6': 'Financeiro_6',
        '7': 'TI_7',
        '8': 'Outras_8'
    };

    // Lógica para escolher setor ou subopções
    if (!setorEscolhido) {
        // Escolhendo um setor
        if (isNumber(ultimaMensagem)) {
            const opcoesKey = setores[ultimaMensagem];
            if (opcoesKey) {
                estadosUsuarios[chatId].setorEscolhido = ultimaMensagem;
                const opcoes = respostas[`opcoes${opcoesKey}`];
                let resposta = `Opções para ${respostas.opcoesSetores[ultimaMensagem]}:\n`;
                for (const [key, value] of Object.entries(opcoes)) {
                    resposta += `${key} - ${value}\n`;
                }
                return client.sendMessage(chatId, resposta);
            } else {
                // Se o número estiver fora do intervalo de setores disponíveis
                return client.sendMessage(chatId, "Setor inexistente. Por favor, escolha um número válido.");
            }
        }
        return client.sendMessage(chatId, respostas.mensagemErro);
    }

    // Verificando subopções
    if (ultimaMensagem === '#') {
        estadosUsuarios[chatId].setorEscolhido = null;
        return client.sendMessage(chatId, respostas.mensagemPadrao);
    }

    const opcoesKey = setores[setorEscolhido];
    const opcoes = respostas[`opcoes${opcoesKey}`];
    if (isNumber(ultimaMensagem)) {
        const subopcao = opcoes[ultimaMensagem];
        if (subopcao) {
            return client.sendMessage(chatId, `Você selecionou: ${subopcao}`);
        } else {
            // Se a subopção não for válida dentro do setor
            client.sendMessage(chatId, "Opção inexistente dentro deste setor. Por favor, escolha uma opção válida.");
            let resposta = `Opções para ${respostas.opcoesSetores[setorEscolhido]}:\n`;
            for (const [key, value] of Object.entries(opcoes)) {
                resposta += `${key} - ${value}\n`;
            }
            return client.sendMessage(chatId, resposta);
        }
    }

    // Mensagem de erro e reenvio das opções
});

// Verificação de inatividade em intervalos regulares
setInterval(() => {
    for (const chatId in estadosUsuarios) {
        verificarInatividade(chatId);
    }
}, 5000); // Verifica a cada 5 segundos

// Inicializa o cliente
client.initialize();
