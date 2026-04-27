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
  },
  supabase: {
    enabled: true,
    projectUrl: "https://nhoexiahfcqqgzombptj.supabase.co",
    restUrl: "https://nhoexiahfcqqgzombptj.supabase.co/rest/v1",
    anonKey: "sb_publishable_LbQ48ZS1vMj5FlaKEoMEHw_FyOdTpNV",
    authStorageKey: "nossoApeSupabaseSession",
    admins: ["dvaz538@gmail.com", "nathamgil10@gmail.com"]
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
    description: "O pagamento é feito pela chave Pix abaixo. O registro fica pendente até a confirmação manual dos moradores.",
    button: "Registrar intenção"
  },
  success: {
    label: "Intenção registrada",
    title: "Registro enviado",
    description: "Seu registro foi salvo. Se o backend estiver ativo, ele ficará pendente até confirmação manual dos moradores.",
    button: "Enviar WhatsApp"
  }
};
