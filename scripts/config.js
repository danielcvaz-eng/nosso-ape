export const APP_CONFIG = {
  whatsappNumber: "5561991982923",
  referenceName: "Moradores do apê",
  pix: {
    key: "daniel.vazbtg@gmail.com",
    type: "e-mail",
    receiver: "Daniel Correia Vaz"
  },
  finalGiftMessage: "Os moradores do Apê estão muito felizes com a sua colaboração para arrumar nosso lar! Gostaria de enviar uma mensagem nos confirmando o seu presente?",
  storage: {
    stateKey: "nossoApeAppState",
    version: 2,
    legacyStatusKey: "nossoApeStatusProdutos",
    legacyContributionsKey: "nossoApeContribuicoesProdutos"
  }
};

export const STATUS_VALUES = ["disponivel", "reservado", "recebido"];

export const LABELS = {
  prioridade: {
    alta: "Prioridade alta",
    media: "Prioridade média",
    baixa: "Prioridade baixa"
  },
  tipo: {
    inteiro: "Presente inteiro",
    colaborativo: "Item colaborativo"
  },
  status: {
    disponivel: "Disponível",
    reservado: "Reservado",
    recebido: "Recebido"
  },
  tipoEscolhido: {
    inteiro: "presentear esse item inteiro",
    colaborativo: "colaborar com esse item"
  }
};

export const MODAL_STEPS = {
  details: {
    label: "Quero presentear",
    title: "Confirmar intenção de presente",
    description: "Preencha seus dados, escolha a forma de ajuda e siga para a etapa de Pix.",
    button: "Continuar"
  },
  pix: {
    label: "Pagamento via Pix",
    title: "Faça o Pix pela chave exibida",
    description: "O pagamento é feito pela chave Pix abaixo. O botão desta etapa registra a intenção apenas neste navegador, mas a confirmação oficial continua manual pelos moradores.",
    button: "Registrar intenção local"
  },
  success: {
    label: "Intenção registrada",
    title: "Registro local concluído",
    description: "Seu registro local foi salvo. Para concluir a comunicação, envie a mensagem pronta no WhatsApp dos moradores.",
    button: "Enviar WhatsApp"
  }
};
