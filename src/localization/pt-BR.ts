
export const translations = {
  // Global terms
  app: {
    title: "Mau Mau",
    loading: "Carregando...",
    error: "Erro",
  },

  // Authentication
  auth: {
    welcome: "Bem-vindo ao Mau Mau",
    nickname: "Escolha um Apelido",
    nicknameRequirements: "Apelido deve ter entre 3-20 caracteres",
    continue: "Continuar",
  },

  // Lobby
  lobby: {
    title: "Sala de Espera",
    browseTabs: "Navegar Jogos",
    joinByCodeTab: "Entrar com Código",
    availableRooms: "Salas Disponíveis",
    refresh: "Atualizar",
    noRoomsAvailable: "Nenhuma sala disponível",
    createNewRoom: "Criar nova sala para começar",
    createRoom: "Criar Nova Sala",
    joinPrivateRoom: "Entrar em Sala Privada",
    roomCode: "Código da Sala",
    enterRoomCode: "Digite o código da sala (ex: ABC123)",
    join: "Entrar",
    dontHaveCode: "Não tem um código?",
    browsePublicRooms: "Navegar salas públicas",
    players: "jogadores",
    privateRoom: "Sala Privada",
  },

  // Waiting Room
  waitingRoom: {
    title: "Sala de Espera",
    players: "Jogadores",
    host: "Anfitrião",
    leaveRoom: "Sair da Sala",
    startGame: "Iniciar Jogo",
    needMorePlayers: "Precisa de mais jogadores",
    waitingForHost: "Aguardando o anfitrião iniciar o jogo...",
    roomChat: "Chat da Sala",
  },

  // Chat
  chat: {
    placeholder: "Digite sua mensagem...",
    send: "Enviar",
  },

  // Game
  game: {
    yourTurn: "Sua vez",
    waitingForTurn: "Aguardando sua vez...",
    playCard: "Jogar Carta",
    drawCard: "Comprar Carta",
    sayMauMau: "Dizer Mau-Mau",
    winner: "Vencedor",
    gameOver: "Fim de Jogo",
    newRound: "Nova Rodada",
    newGame: "Novo Jogo",
    finalRanking: "Classificação Final",
  },

  // Messages & Toasts
  messages: {
    roomCreated: "Sala criada",
    roomCodeCopied: "Código da sala copiado!",
    shareCodeWithFriends: "Compartilhe este código com amigos",
    errorRoomNotFound: (code: string) => `Sala com o código ${code} não foi encontrada.`,
    playerJoined: (name: string) => `${name} entrou na sala`,
    playerLeft: (name: string) => `${name} saiu da sala`,
    playerKicked: (name: string) => `${name} foi removido da sala`,
    youWereKicked: "Você foi removido da sala",
    permissionDenied: "Permissão negada",
    onlyHostCanKick: "Apenas o anfitrião pode remover jogadores",
    onlyHostCanStart: "Apenas o anfitrião pode iniciar o jogo",
    gameStarted: "Jogo iniciado!",
    gameStartedByHost: "O jogo foi iniciado pelo anfitrião da sala.",
    disconnected: "Desconectado",
    connectionLost: "Conexão com o servidor de jogo perdida",
  },
};

// Export as default for easier importing
export default translations;
