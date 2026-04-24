const produtos = [
  {
    id: 1,
    nome: "Lava e seca Electrolux Inverter 12kg LFC12",
    categoria: "Lavanderia",
    preco: 3019.00,
    prioridade: "alta",
    tipo: "colaborativo",
    descricao: "Item essencial para a rotina da casa.",
    link: "https://www.magazineluiza.com.br/lavadora-de-roupas-electrolux-inverter-12kg-cesto-inox-8-programas-de-lavagem-agua-quente-cinza-onix-lfc12/p/241186800/ed/ela1/?seller_id=magazineluiza",
    status: "disponivel"
  },
  {
    id: 2,
    nome: "Micro-ondas Philco 25L Limpa Fácil PMO28E",
    categoria: "Cozinha",
    preco: 593.10,
    prioridade: "alta",
    tipo: "colaborativo",
    descricao: "Micro-ondas para uso diário da casa.",
    link: "https://www.amazon.com.br/Micro-ondas-Philco-Limpa-F%C3%A1cil-PMO28E/dp/B0CVQ7K8TG/",
    status: "disponivel"
  },
  {
    id: 3,
    nome: "Almofadas para sofá - conjunto com 4 capas decorativas",
    categoria: "Sala / Decoração",
    preco: 79.99,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Conjunto decorativo para complementar o sofá.",
    link: "https://www.temu.com/br/pacote--fronhas-decorativas--capa-de-almofada-com--de-chenille-fronha--e-confort%C3%A1vel-estilo--com-z%C3%ADper-para-presente-decora%C3%A7%C3%A3o--para-sof%C3%A1-quarto-e--g-601101941874365.html",
    status: "disponivel"
  },
  {
    id: 4,
    nome: "Forno elétrico Mondial Family II 42L",
    categoria: "Cozinha",
    preco: 369.00,
    prioridade: "media",
    tipo: "colaborativo",
    descricao: "Forno elétrico para preparo do dia a dia.",
    link: "https://www.amazon.com.br/Forno-El%C3%A9trico-Family-Mondial-Branco/dp/B0DX2G8NY7/",
    status: "disponivel"
  },
  {
    id: 5,
    nome: "Panela de pressão elétrica Midea 6L",
    categoria: "Cozinha",
    preco: 476.03,
    prioridade: "alta",
    tipo: "colaborativo",
    descricao: "Panela elétrica prática para receitas do dia a dia.",
    link: "https://www.amazon.com.br/Panela-Press%C3%A3o-El%C3%A9trica-MasterSteam-Midea/dp/B0B4Q24P9Q/",
    status: "disponivel"
  },
  {
    id: 6,
    nome: "Máquina de gelo EOS 12kg Ice Compact",
    categoria: "Cozinha",
    preco: 489.00,
    precoEstimado: true,
    prioridade: "baixa",
    tipo: "colaborativo",
    descricao: "Item útil para receber visitas e ocasiões especiais.",
    link: "https://www.amazon.com.br/M%C3%A1quina-EOS-Compact-Black-EMG06P/dp/B0DX79WRJF/",
    status: "disponivel"
  },
  {
    id: 7,
    nome: "Kit com 3 frigideiras com tampa de vidro",
    categoria: "Cozinha",
    preco: 84.90,
    precoEstimado: true,
    prioridade: "alta",
    tipo: "inteiro",
    descricao: "Kit essencial para montar a cozinha.",
    link: "https://www.amazon.com.br/Kit-Com-Frigideiras-Tampa-Vidro/dp/B0GN97NR5Q/",
    status: "disponivel"
  },
  {
    id: 8,
    nome: "Assadeira / forma retangular antiaderente",
    categoria: "Cozinha",
    preco: 24.69,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Item útil para assados e preparos no forno.",
    link: "https://www.amazon.com.br/Assadeira-Retangular-Antiaderente-Revestimento-Interno/dp/B0DLWWYCPT/",
    status: "disponivel"
  },
  {
    id: 9,
    nome: "Marinex - jogo de assadeiras opaline kit 3 unidades",
    categoria: "Cozinha",
    preco: 69.50,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Jogo de refratários para forno e mesa.",
    link: "https://www.amazon.com.br/Jogo-Assadeiras-Opaline-Marinex-Nadir/dp/B08G8WD9MF/",
    status: "disponivel"
  },
  {
    id: 10,
    nome: "Potes herméticos",
    categoria: "Cozinha",
    preco: 149.00,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Potes para armazenar mantimentos com organização.",
    link: "https://www.amazon.com.br/Mantimentos-Herm%C3%A9ticos-Silicone-Premium-Madeira/dp/B0DWPSMN9R/",
    status: "disponivel"
  },
  {
    id: 11,
    nome: "Porta-temperos giratório",
    categoria: "Cozinha",
    preco: 35.90,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Organizador para temperos da cozinha.",
    link: "https://www.amazon.com.br/Condimentos-Girat%C3%B3rio-Armazenamento-Especiarias-Resistente/dp/B0GSBF4XV2/",
    status: "disponivel"
  },
  {
    id: 12,
    nome: "2 lixeiras pequenas para o lavabo",
    categoria: "Banheiro / Lavabo",
    preco: 60.00,
    precoEstimado: true,
    prioridade: "media",
    tipo: "inteiro",
    descricao: "Duas lixeiras compactas para os lavabos.",
    link: "https://www.amazon.com.br/Viel-Polipropileno-Compacta-Banheiro-Escrit%C3%B3rio/dp/B08YDGR7JK/",
    status: "disponivel"
  },
  {
    id: 13,
    nome: "Porta-chaves de parede",
    categoria: "Sala / Organização",
    preco: 43.00,
    prioridade: "baixa",
    tipo: "inteiro",
    descricao: "Organizador de chaves para a entrada da casa.",
    link: "https://www.amazon.com.br/Porta-Chaves-Prateleiras-Ganchos-Branco/dp/B0DWZ7GZVX/",
    status: "disponivel"
  },
  {
    id: 14,
    nome: "Tapete Casa Dona 200x300 cm caramelo",
    categoria: "Sala / Decoração",
    preco: 245.99,
    prioridade: "media",
    tipo: "colaborativo",
    descricao: "Tapete grande para compor a sala.",
    link: "https://www.amazon.com.br/Felpudo-Casa-Dona-200x300-Caramelo/dp/B0865V926N/",
    status: "disponivel"
  },
  {
    id: 15,
    nome: "Mop com cesto de inox",
    categoria: "Lavanderia / Limpeza",
    preco: 59.90,
    precoEstimado: true,
    prioridade: "alta",
    tipo: "inteiro",
    descricao: "Item importante para a limpeza da casa.",
    link: "https://www.amazon.com.br/Girat%C3%B3rio-Esfreg%C3%A3o-Limpeza-Microfibra-Centrifuga/dp/B0GVGS8FT1/",
    status: "disponivel"
  }
];

export default produtos;
